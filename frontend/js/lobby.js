// frontend/js/lobby.js
document.addEventListener('DOMContentLoaded', async () => {
    // 身份验证检查
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html'; // 未登录则返回登录页
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html'; return;
    }

    // 更新用户信息显示
    document.getElementById('userNickname').textContent = currentUser.nickname;
    document.getElementById('userPoints').textContent = currentUser.points; // 后续可以实时更新

    const createRoomButton = document.getElementById('createRoomButton');
    const createRoomModal = document.getElementById('createRoomModal');
    const closeCreateRoomModal = document.getElementById('closeCreateRoomModal');
    const confirmCreateRoomButton = document.getElementById('confirmCreateRoomButton');
    const refreshRoomListButton = document.getElementById('refreshRoomListButton');
    const roomListTableBody = document.getElementById('roomListTable').querySelector('tbody');
    const noRoomsMessage = document.getElementById('noRoomsMessage');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const logoutButton = document.getElementById('logoutButton');

    // 显示/隐藏创建房间弹窗
    createRoomButton.addEventListener('click', () => { createRoomModal.style.display = 'block'; });
    closeCreateRoomModal.addEventListener('click', () => { createRoomModal.style.display = 'none'; displayError('createRoomError', ''); });
    window.addEventListener('click', (event) => { // 点击弹窗外部关闭
        if (event.target == createRoomModal) {
            createRoomModal.style.display = 'none'; displayError('createRoomError', '');
        }
    });

    // 确认创建房间
    confirmCreateRoomButton.addEventListener('click', async () => {
        const name = document.getElementById('createRoomName').value.trim();
        const max_players = parseInt(document.getElementById('createRoomMaxPlayers').value);
        const password = document.getElementById('createRoomPassword').value;
        displayError('createRoomError', '');

        try {
            const roomData = { max_players };
            if (name) roomData.name = name;
            if (password) roomData.password = password;

            const response = await roomsAPI.createRoom(roomData);
            showMessage('lobbyMessage', `房间 "${response.room.room_code}" 创建成功!`, 'success');
            createRoomModal.style.display = 'none';
            // 跳转到房间页面，传递房间ID
            setTempState('roomIdToJoin', response.room.id); // 使用临时状态传递
            window.location.href = `room.html?roomId=${response.room.id}`; // 或者用查询参数
        } catch (error) {
            displayError('createRoomError', error.message || '创建房间失败。');
        }
    });

    // 加载房间列表
    async function loadRoomList() {
        clearElement(roomListTableBody);
        noRoomsMessage.style.display = 'none';
        showLoading('lobbyMessage');
        try {
            const response = await roomsAPI.listRooms();
            if (response.rooms && response.rooms.length > 0) {
                response.rooms.forEach(room => {
                    const row = roomListTableBody.insertRow();
                    row.innerHTML = `
                        <td>${room.room_code}</td>
                        <td>${room.name}</td>
                        <td>${room.owner_nickname}</td>
                        <td>${room.current_players_count}/${room.max_players}</td>
                        <td>等待中</td>
                        <td>${room.is_password_protected ? '是' : '否'}</td>
                        <td><button class="join-from-list-btn" data-room-id="${room.id}" data-room-code="${room.room_code}" data-protected="${room.is_password_protected}">加入</button></td>
                    `;
                });
                // 为新生成的按钮添加事件监听
                document.querySelectorAll('.join-from-list-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const roomId = this.dataset.roomId;
                        const roomCode = this.dataset.roomCode;
                        const isProtected = this.dataset.protected === 'true';
                        promptAndJoinRoom(roomCode, isProtected, roomId);
                    });
                });

            } else {
                noRoomsMessage.style.display = 'block';
            }
        } catch (error) {
            showMessage('lobbyMessage', `获取房间列表失败: ${error.message}`, 'error');
        } finally {
            showLoading('lobbyMessage', false);
        }
    }

    refreshRoomListButton.addEventListener('click', loadRoomList);

    // 加入房间 (通过输入框)
    joinRoomButton.addEventListener('click', () => {
        const roomCode = document.getElementById('joinRoomCodeInput').value.trim().toUpperCase();
        const password = document.getElementById('joinRoomPasswordInput').value;
        if (!roomCode) {
            showMessage('lobbyMessage', '请输入房间号。', 'error');
            return;
        }
        // 注意：这里不知道房间是否需要密码，所以如果密码框有值就带上
        // 更好的做法是，先尝试不带密码加入，如果后端返回需要密码，再提示用户输入
        promptAndJoinRoom(roomCode, true, null, password); // 假设可能需要密码
    });

    async function promptAndJoinRoom(roomCode, isProtected, roomIdToJoin, initialPassword = null) {
        let passwordToTry = initialPassword;
        if (isProtected && !passwordToTry) {
            passwordToTry = prompt(`房间 "${roomCode}" 受密码保护，请输入密码:`);
            if (passwordToTry === null) return; // 用户取消
        }

        try {
            showMessage('lobbyMessage', `正在加入房间 ${roomCode}...`, 'info');
            const joinData = { room_code: roomCode };
            if (passwordToTry) joinData.password = passwordToTry;

            const response = await roomsAPI.joinRoom(joinData);
            // 跳转到房间页面
            setTempState('roomIdToJoin', response.room_id);
            window.location.href = `room.html?roomId=${response.room_id}`;
        } catch (error) {
            showMessage('lobbyMessage', `加入房间失败: ${error.message}`, 'error');
            // 如果是密码错误，可以提示重新输入
            if (error.status === 400 && error.message.includes('密码错误') && isProtected) {
                 // 可以在这里重新调用 promptAndJoinRoom，给用户再次尝试的机会
            }
        }
    }

    // 登出
    logoutButton.addEventListener('click', async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.warn('登出时后端出错，但仍会清理本地状态:', error.message);
        } finally {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
            window.location.href = 'index.html';
        }
    });

    // 初始加载
    loadRoomList();

    // TODO: 实现积分赠送的UI交互和API调用
});
