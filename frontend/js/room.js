// frontend/js/room.js
let currentRoomId = null;
let currentUserData = null; // 从localStorage获取
let roomDetailsCache = null; // 缓存房间详情
let gameStatePollingInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 身份验证
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html'; return;
    }
    currentUserData = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUserData) {
        window.location.href = 'index.html'; return;
    }
    document.getElementById('currentUserNickname').textContent = currentUserData.nickname;

    // 从URL或临时状态获取房间ID
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomId = parseInt(urlParams.get('roomId')) || getTempState('roomIdToJoin');

    if (!currentRoomId) {
        showMessage('roomMessageArea', '未指定房间ID，正在返回大厅...', 'error');
        setTimeout(() => { window.location.href = 'lobby.html'; }, 2000);
        return;
    }
    clearTempState('roomIdToJoin'); // 用后即焚

    const leaveRoomButton = document.getElementById('leaveRoomButton');
    const playerReadyButton = document.getElementById('playerReadyButton');
    const startGameButton = document.getElementById('startGameButton');

    leaveRoomButton.addEventListener('click', handleLeaveRoom);
    playerReadyButton.addEventListener('click', handlePlayerReadyToggle);
    startGameButton.addEventListener('click', handleStartGame);


    await fetchAndRenderRoomDetails(); // 初始加载

    // 开始轮询房间/游戏状态
    gameStatePollingInterval = setInterval(fetchAndRenderRoomDetails, 3000); // 每3秒轮询一次
});

window.addEventListener('beforeunload', () => { // 页面关闭时停止轮询
    if (gameStatePollingInterval) clearInterval(gameStatePollingInterval);
});


async function fetchAndRenderRoomDetails() {
    if (!currentRoomId) return;
    try {
        // 根据当前游戏是否已开始，决定调用哪个API
        let data;
        let isGameInProgress = roomDetailsCache && roomDetailsCache.status === 'playing' && roomDetailsCache.current_game_id;

        if (isGameInProgress) {
            // 如果游戏已开始，则调用 gameAPI.getGameState
            // 注意：game.js 中也会有类似的逻辑，需要协调
            // 为了简化，这里先假设 roomAPI 也能返回游戏进行中的部分状态
            // 或者 room.js 主要负责房间等待，game.js 负责游戏进行时
            data = await roomsAPI.getRoomDetails(currentRoomId); // 重新获取房间详情，看是否已开始新游戏
            if (data.room_details && data.room_details.status === 'playing' && data.room_details.current_game_id) {
                // 如果房间仍在游戏中，则让 game.js 中的轮询接管或在这里调用 getGameState
                 if (typeof window.pollGameState === 'function') { // 假设 game.js 暴露了这个函数
                    // window.pollGameState(data.room_details.current_game_id);
                    // 为了避免room.js和game.js同时轮询，这里可能需要更复杂的逻辑
                    // 简单处理：如果游戏开始，room.js的轮询应该关注游戏是否结束，以便回到房间等待状态
                 } else {
                    // game.js 未加载或未初始化，继续用roomDetails
                 }
            }
        } else {
             data = await roomsAPI.getRoomDetails(currentRoomId);
        }


        if (!data || !data.room_details) {
            showMessage('roomMessageArea', '无法获取房间信息，可能已解散。', 'error');
            clearInterval(gameStatePollingInterval);
            // setTimeout(() => { window.location.href = 'lobby.html'; }, 3000);
            return;
        }
        roomDetailsCache = data.room_details;
        renderRoomView(roomDetailsCache);

        // 如果游戏已经开始 (status === 'playing' 且有 current_game_id)
        if (roomDetailsCache.status === 'playing' && roomDetailsCache.current_game_id) {
            switchToGameView(roomDetailsCache.current_game_id, roomDetailsCache); // 通知 game.js 游戏开始了
            // 此时 room.js 的主要轮询任务完成，game.js 会接管游戏状态的轮询
            // clearInterval(gameStatePollingInterval); // 可以考虑停止房间轮询
            // gameStatePollingInterval = null;
        } else if (roomDetailsCache.status === 'finished' && roomDetailsCache.current_game_id === null) {
            // 游戏结束，房间回到等待状态
            switchToRoomView();
            // 如果之前停止了轮询，这里可以重新启动
            if (!gameStatePollingInterval) {
                 // gameStatePollingInterval = setInterval(fetchAndRenderRoomDetails, 3000);
            }
        }


    } catch (error) {
        console.error("Error fetching room/game details:", error);
        // 如果是401或403错误，可能需要跳转回登录页
        if (error.status === 401 || error.status === 403) {
            showMessage('roomMessageArea', `错误: ${error.message}。正在返回大厅...`, 'error');
            clearInterval(gameStatePollingInterval);
            localStorage.removeItem('currentUser'); localStorage.setItem('isLoggedIn', 'false');
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            // 其他错误，可以暂时不中断轮询，或给出提示
            showMessage('roomMessageArea', `获取房间状态时出错: ${error.message}`, 'error');
        }
    }
}

function renderRoomView(room) {
    document.getElementById('roomTitle').textContent = `房间: ${room.name} (${room.room_code})`;
    document.getElementById('roomOwner').textContent = room.owner_nickname;
    document.getElementById('roomCodeDisplay').textContent = room.room_code;
    document.getElementById('currentPlayerCount').textContent = room.current_players_count;
    document.getElementById('maxPlayerCount').textContent = room.max_players;

    const playerSeatsArea = document.getElementById('playerSeatsArea');
    clearElement(playerSeatsArea);

    // 创建占位座位
    for (let i = 1; i <= room.max_players; i++) {
        const seatDiv = document.createElement('div');
        seatDiv.classList.add('player-seat');
        seatDiv.dataset.seatNumber = i;
        seatDiv.innerHTML = `
            <div class="player-avatar"></div>
            <div class="player-name"><em>-- 空位 --</em></div>
            <div class="player-status"></div>
            <div class="player-points" style="font-size:0.8em;"></div>`;
        playerSeatsArea.appendChild(seatDiv);
    }

    // 填充真实玩家信息
    let currentUserInRoom = false;
    room.players.forEach(player => {
        const seatDiv = playerSeatsArea.querySelector(`.player-seat[data-seat-number="${player.seat_number}"]`);
        if (seatDiv) {
            seatDiv.querySelector('.player-name').textContent = player.nickname;
            // TODO: seatDiv.querySelector('.player-avatar').style.backgroundImage = `url(${player.avatar_url || 'default_avatar.png'})`;
            // TODO: 获取玩家积分并显示 (room_details API需要返回)
            // seatDiv.querySelector('.player-points').textContent = `积分: ${player.points || 'N/A'}`;

            if (player.user_id === currentUserData.id) {
                currentUserInRoom = true;
                seatDiv.classList.add('current-player');
                document.getElementById('playerReadyButton').textContent = player.is_ready ? '取消准备' : '准备';
                document.getElementById('playerReadyButton').dataset.currentState = player.is_ready ? 'ready' : 'not_ready';
            }
            seatDiv.querySelector('.player-status').textContent = player.is_ready ? '已准备' : '未准备';
            if (player.user_id === room.owner_id) {
                seatDiv.classList.add('is-owner');
                seatDiv.querySelector('.player-name').textContent += ' (房主)';
            }
        }
    });

    if (!currentUserInRoom && room.status !== 'closed') { // 用户不在房间里了 (可能被踢或离开后刷新)
        showMessage('roomMessageArea', '您已不在该房间。正在返回大厅...', 'error');
        clearInterval(gameStatePollingInterval);
        setTimeout(() => { window.location.href = 'lobby.html'; }, 3000);
        return;
    }


    // 控制按钮的显示
    document.getElementById('playerReadyButton').style.display = (room.status === 'waiting') ? 'inline-block' : 'none';
    document.getElementById('startGameButton').style.display = (room.status === 'waiting' && room.owner_id === currentUserData.id) ? 'inline-block' : 'none';

    // 根据游戏状态显示不同面板
    if (room.status === 'playing' || room.status === 'comparing') {
        document.getElementById('roomControlsPanel').style.display = 'none';
        // 游戏界面由 game.js 管理显示
    } else if (room.status === 'finished' && room.current_game_id === null) { // 一局结束，回到房间等待
        document.getElementById('roomControlsPanel').style.display = 'inline-block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = 'none';
        // 房主可以看到“再来一局”（即重新开始游戏的按钮）
        if (room.owner_id === currentUserData.id) {
            document.getElementById('startGameButton').textContent = '再来一局'; // 或单独一个按钮
            document.getElementById('startGameButton').style.display = 'inline-block';
        }

    } else { // waiting
        document.getElementById('roomControlsPanel').style.display = 'inline-block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = 'none';
        document.getElementById('startGameButton').textContent = '开始游戏';
    }
}

async function handleLeaveRoom() {
    if (!currentRoomId) return;
    if (confirm('您确定要离开房间吗？')) {
        try {
            await roomsAPI.leaveRoom({ room_id: currentRoomId });
            clearInterval(gameStatePollingInterval); // 停止轮询
            showMessage('roomMessageArea', '已成功离开房间。', 'success');
            window.location.href = 'lobby.html';
        } catch (error) {
            showMessage('roomMessageArea', `离开房间失败: ${error.message}`, 'error');
        }
    }
}

async function handlePlayerReadyToggle() {
    if (!currentRoomId) return;
    const currentState = document.getElementById('playerReadyButton').dataset.currentState === 'ready';
    try {
        await roomsAPI.playerReady({ room_id: currentRoomId, is_ready: !currentState });
        // 状态会在下一次轮询时自动更新，或者可以立即手动更新UI
        document.getElementById('playerReadyButton').textContent = currentState ? '准备' : '取消准备';
        document.getElementById('playerReadyButton').dataset.currentState = currentState ? 'not_ready' : 'ready';
        // 可以在这里直接调用 fetchAndRenderRoomDetails() 来立即刷新状态，但要注意避免与轮询冲突
        // await fetchAndRenderRoomDetails(); // 立即刷新
    } catch (error) {
        showMessage('roomMessageArea', `更新准备状态失败: ${error.message}`, 'error');
    }
}

async function handleStartGame() {
    if (!currentRoomId) return;
    try {
        showMessage('roomMessageArea', '正在尝试开始游戏...', 'info');
        const response = await roomsAPI.startGame({ room_id: currentRoomId });
        // 游戏开始成功，后端会创建game记录并发牌
        // fetchAndRenderRoomDetails 会在下一次轮询检测到 status='playing' 并切换视图
        // 或者这里直接调用 switchToGameView
        switchToGameView(response.game_id, roomDetailsCache);
    } catch (error) {
        showMessage('roomMessageArea', `开始游戏失败: ${error.message}`, 'error');
    }
}

// 切换到游戏视图 (会被 game.js 调用或在此处触发 game.js 初始化)
function switchToGameView(gameId, roomData) {
    console.log(`Switching to game view for game ID: ${gameId}`);
    document.getElementById('roomInfoPanel').style.display = 'none'; // 或保留部分房间信息
    document.getElementById('playerSeatsArea').style.display = 'none'; // 游戏中有自己的玩家状态显示
    document.getElementById('roomControlsPanel').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('gameResultArea').style.display = 'none';

    // 调用 game.js 中的初始化函数，传递 gameId 和 roomData (包含玩家列表等)
    if (typeof window.initializeGame === 'function') {
        window.initializeGame(gameId, currentUserData, roomData);
    } else {
        console.error("game.js or initializeGame function not found!");
        showMessage('roomMessageArea', '无法加载游戏界面组件。', 'error');
    }
}
// 切换回房间等待视图 (游戏结束后)
function switchToRoomView() {
    console.log("Switching back to room view.");
    document.getElementById('roomInfoPanel').style.display = 'block';
    document.getElementById('playerSeatsArea').style.display = 'flex';
    document.getElementById('roomControlsPanel').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('gameResultArea').style.display = 'none'; // 结算结果可以显示在roomMessageArea

    // 重新获取房间详情以更新玩家状态等
    fetchAndRenderRoomDetails();
}
