// frontend/js/lobby.js (修正和加固版)

document.addEventListener('DOMContentLoaded', async () => {
    // 身份验证检查
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        console.log("Lobby: Not logged in, redirecting to index.html");
        window.location.href = 'index.html';
        return;
    }
    const currentUserJSON = localStorage.getItem('currentUser');
    if (!currentUserJSON) {
        console.log("Lobby: No current user data, redirecting to index.html");
        window.location.href = 'index.html';
        return;
    }
    const currentUser = JSON.parse(currentUserJSON);
    if (!currentUser || typeof currentUser.id === 'undefined') {
        console.log("Lobby: Invalid current user data, redirecting to index.html");
        localStorage.removeItem('currentUser'); localStorage.setItem('isLoggedIn', 'false');
        window.location.href = 'index.html';
        return;
    }

    // 更新用户信息显示
    const userNicknameEl = document.getElementById('userNickname');
    const userPointsEl = document.getElementById('userPoints');
    if (userNicknameEl) userNicknameEl.textContent = currentUser.nickname || '玩家';
    if (userPointsEl) userPointsEl.textContent = currentUser.points || '0';

    // DOM元素获取
    const createRoomButton = document.getElementById('createRoomButton');
    const createRoomModal = document.getElementById('createRoomModal');
    const closeCreateRoomModal = document.getElementById('closeCreateRoomModal');
    const confirmCreateRoomButton = document.getElementById('confirmCreateRoomButton');
    const refreshRoomListButton = document.getElementById('refreshRoomListButton');
    const roomListTable = document.getElementById('roomListTable');
    const roomListTableBody = roomListTable ? roomListTable.querySelector('tbody') : null;
    const noRoomsMessage = document.getElementById('noRoomsMessage');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const logoutButton = document.getElementById('logoutButton');
    const lobbyMessageDiv = document.getElementById('lobbyMessage');

    // 确保核心DOM元素存在
    if (!createRoomButton || !createRoomModal || !closeCreateRoomModal || !confirmCreateRoomButton ||
        !refreshRoomListButton || !roomListTableBody || !noRoomsMessage || !joinRoomButton || !logoutButton || !lobbyMessageDiv) {
        console.error("Lobby page critical DOM elements are missing. Aborting setup.");
        return;
    }

    // 显示/隐藏创建房间弹窗
    createRoomButton.addEventListener('click', () => { createRoomModal.style.display = 'block'; });
    closeCreateRoomModal.addEventListener('click', () => { createRoomModal.style.display = 'none'; displayError('createRoomError', ''); });
    window.addEventListener('click', (event) => {
        if (event.target == createRoomModal) {
            createRoomModal.style.display = 'none'; displayError('createRoomError', '');
        }
    });

    // 确认创建房间
    confirmCreateRoomButton.addEventListener('click', async () => {
        const nameInput = document.getElementById('createRoomName');
        const maxPlayersSelect = document.getElementById('createRoomMaxPlayers');
        const passwordInput = document.getElementById('createRoomPassword');
        const createRoomErrorEl = document.getElementById('createRoomError'); // 获取错误显示元素
        if (!nameInput || !maxPlayersSelect || !passwordInput || !createRoomErrorEl) {
            console.error("Create room modal form elements missing."); return;
        }
        displayError(createRoomErrorEl, ''); // 清除之前的错误

        const name = nameInput.value.trim();
        const max_players = parseInt(maxPlayersSelect.value);
        const password = passwordInput.value;
        const roomData = { max_players };
        if (name) roomData.name = name;
        if (password) roomData.password = password;

        try {
            showLoading(createRoomErrorEl, true, '正在创建房间...');
            const response = await roomsAPI.createRoom(roomData);
            showLoading(createRoomErrorEl, false);

            console.log("Create Room API Response:", response); // 调试日志

            if (response && response.room && typeof response.room.id === 'number' && typeof response.room.room_code === 'string') {
                showMessage(lobbyMessageDiv, `房间 "${response.room.room_code}" 创建成功!`, 'success');
                createRoomModal.style.display = 'none';
                setTempState('roomIdToJoin', response.room.id);
                window.location.href = `room.html?roomId=${response.room.id}`;
            } else {
                const errorMsg = response && response.error ? response.error.message : '创建房间失败，服务器响应无效。';
                console.error("Create room API response invalid structure:", response);
                displayError(createRoomErrorEl, errorMsg);
            }
        } catch (error) {
            showLoading(createRoomErrorEl, false);
            console.error("Create room caught error:", error);
            displayError(createRoomErrorEl, error.message || '创建房间时发生未知错误。');
        }
    });

    // 加载房间列表
    async function loadRoomList() {
        clearElement(roomListTableBody);
        noRoomsMessage.style.display = 'none';
        showMessage(lobbyMessageDiv, '', 'info'); // 清除旧消息
        showLoading(lobbyMessageDiv, true, '正在加载房间列表...');

        try {
            const response = await roomsAPI.listRooms();
            showLoading(lobbyMessageDiv, false);
            console.log("Load Room List API Response:", response); // 调试日志

            if (response && Array.isArray(response.rooms)) {
                if (response.rooms.length > 0) {
                    response.rooms.forEach((room, index) => {
                        if (room && typeof room.id === 'number' && typeof room.room_code === 'string') {
                            const row = roomListTableBody.insertRow();
                            row.innerHTML = `
                                <td>${room.room_code}</td>
                                <td>${room.name || '未命名房间'}</td>
                                <td>${room.owner_nickname || '未知房主'}</td>
                                <td>${room.current_players_count || 0}/${room.max_players || 0}</td>
                                <td>等待中</td> <!-- 假设 listRooms 只返回 waiting 状态 -->
                                <td>${room.is_password_protected ? '是' : '否'}</td>
                                <td><button class="join-from-list-btn" data-room-id="${room.id}" data-room-code="${room.room_code}" data-protected="${room.is_password_protected ? 'true' : 'false'}">加入</button></td>
                            `;
                        } else {
                            console.warn(`Invalid room object at index ${index} in listRooms response:`, room);
                            const row = roomListTableBody.insertRow();
                            row.innerHTML = `<td colspan="7" style="color:red;">错误：收到一个无效的房间数据条目</td>`;
                        }
                    });
                    // 为新生成的按钮添加事件监听
                    document.querySelectorAll('.join-from-list-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const roomId = this.dataset.roomId; // 这个ID主要用于直接跳转，如果后端支持
                            const roomCode = this.dataset.roomCode;
                            const isProtected = this.dataset.protected === 'true';
                            promptAndJoinRoom(roomCode, isProtected, roomId);
                        });
                    });
                } else {
                    noRoomsMessage.style.display = 'block';
                }
            } else {
                const errorMsg = response && response.error ? response.error.message : '获取房间列表失败，服务器响应无效或无房间数据。';
                console.error("listRooms API response invalid structure or no rooms array:", response);
                showMessage(lobbyMessageDiv, errorMsg, 'error');
                noRoomsMessage.style.display = 'block';
            }
        } catch (error) {
            showLoading(lobbyMessageDiv, false);
            console.error("Error in loadRoomList:", error);
            showMessage(lobbyMessageDiv, `获取房间列表时发生错误: ${error.message || '未知错误'}`, 'error');
        }
    }

    refreshRoomListButton.addEventListener('click', loadRoomList);

    // 加入房间 (通过输入框)
    joinRoomButton.addEventListener('click', () => {
        const roomCodeInput = document.getElementById('joinRoomCodeInput');
        const passwordInput = document.getElementById('joinRoomPasswordInput');
        if (!roomCodeInput) { console.error("joinRoomCodeInput not found"); return; }

        const roomCode = roomCodeInput.value.trim().toUpperCase();
        const password = passwordInput ? passwordInput.value : ""; // 如果密码框不存在，给空字符串

        if (!roomCode) {
            showMessage(lobbyMessageDiv, '请输入房间号。', 'error');
            return;
        }
        // 假设通过输入框加入时，我们不知道是否受保护，所以 isPotentiallyProtected 可以设为true
        // 或者让 promptAndJoinRoom 内部逻辑决定是否真的提示输入密码
        promptAndJoinRoom(roomCode, true, null, password);
    });

    async function promptAndJoinRoom(roomCode, isPotentiallyProtected, roomIdToJoinIfKnown, initialPassword = "") {
        let passwordToTry = initialPassword;

        if (isPotentiallyProtected && initialPassword === "") { // 只有当可能受保护且初始密码为空时才提示
            const userProvidedPassword = prompt(`房间 "${roomCode}" 可能需要密码。\n如果知道密码请输入，否则请留空或取消：`);
            if (userProvidedPassword === null) { // 用户点击了取消
                showMessage(lobbyMessageDiv, '已取消加入房间。', 'info');
                return;
            }
            passwordToTry = userProvidedPassword.trim(); // 获取用户输入的密码
        }

        try {
            showMessage(lobbyMessageDiv, `正在加入房间 ${roomCode}...`, 'info');
            const joinData = { room_code: roomCode };
            if (passwordToTry.length > 0) { // 只有当密码非空时才发送
                joinData.password = passwordToTry;
            }

            const response = await roomsAPI.joinRoom(joinData);
            console.log("Join Room API Response:", response); // 调试日志

            if (response && typeof response.room_id === 'number') {
                setTempState('roomIdToJoin', response.room_id);
                window.location.href = `room.html?roomId=${response.room_id}`;
            } else {
                const errorMsg = response && response.error ? response.error.message : '加入房间失败，服务器响应无效。';
                console.error("Join room API response invalid structure:", response);
                showMessage(lobbyMessageDiv, errorMsg, 'error');
            }
        } catch (error) {
            console.error("Error in promptAndJoinRoom:", error);
            let displayMsg = error.message || '加入房间时发生未知错误。';
            // 针对特定后端错误消息进行更友好的提示
            if (error.message && error.message.toLowerCase().includes('密码错误')) {
                 displayMsg = `房间 "${roomCode}" 密码错误，请确认后重试。`;
                 const passwordInputEl = document.getElementById('joinRoomPasswordInput');
                 if (passwordInputEl) passwordInputEl.value = ''; // 清空密码框
            } else if (error.message && error.message.toLowerCase().includes('已满')) {
                displayMsg = `房间 "${roomCode}" 已满员。`;
            } else if (error.message && error.message.toLowerCase().includes('不存在')) {
                displayMsg = `房间 "${roomCode}" 不存在或代码错误。`;
            }
            showMessage(lobbyMessageDiv, displayMsg, 'error');
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
});
