// frontend/js/room.js

let currentRoomId = null;
let currentGameIdForRoom = null; // 当前房间关联的游戏ID (可能是真实游戏或试玩游戏)
let currentUserData = null;
let roomDetailsCache = null;
let isTrialMode = false; // 标记是否为试玩模式
let isBackgroundMatchmakingActive = false; // 标记在试玩时是否在后台匹配

let roomStatePollingInterval = null; // 用于轮询真实房间状态
let trialBgMatchPollInterval = null; // 用于在试玩时轮询后台匹配状态
let trialBgMatchStartTime = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 身份验证
    if (localStorage.getItem('isLoggedIn') !== 'true') { window.location.href = 'index.html'; return; }
    const cuJSON = localStorage.getItem('currentUser');
    if (!cuJSON) { window.location.href = 'index.html'; return; }
    currentUserData = JSON.parse(cuJSON);
    if (!currentUserData || typeof currentUserData.id === 'undefined') { /* ... redirect ... */ return; }
    document.getElementById('currentUserNickname').textContent = currentUserData.nickname;

    // 从URL或临时状态获取房间ID和游戏ID
    const urlParams = new URLSearchParams(window.location.search);
    currentRoomId = parseInt(urlParams.get('roomId')) || getTempState('roomIdToJoin');
    currentGameIdForRoom = parseInt(urlParams.get('gameId')) || getTempState('gameIdToLoad'); // Lobby现在会传递gameId
    isTrialMode = (urlParams.get('trial') === 'true') || getTempState('isTrialGame') === true;
    isBackgroundMatchmakingActive = getTempState('backgroundMatchmakingActive') === true && isTrialMode; // 只有试玩才可能有后台匹配

    clearTempState('roomIdToJoin');
    clearTempState('gameIdToLoad');
    // isTrialGame 和 backgroundMatchmakingActive 暂时不清，下面逻辑会用

    if (!currentRoomId) {
        showMessage('roomMessageArea', '未指定房间ID，返回大厅...', 'error');
        setTimeout(() => { window.location.href = 'lobby.html'; }, 2000);
        return;
    }

    const leaveRoomButton = document.getElementById('leaveRoomButton');
    const playerReadyButton = document.getElementById('playerReadyButton');
    const startGameButton = document.getElementById('startGameButton');
    const trialToggleMatchmakingButton = document.getElementById('trialToggleMatchmakingButton');

    leaveRoomButton?.addEventListener('click', handleLeaveOrBackToLobby);
    playerReadyButton?.addEventListener('click', handlePlayerReadyToggle);
    startGameButton?.addEventListener('click', handleStartGame); // 或 handleNextRoundInTrial
    trialToggleMatchmakingButton?.addEventListener('click', handleTrialToggleMatchmaking);

    if (isTrialMode) {
        initializeTrialRoomView();
        if (isBackgroundMatchmakingActive) {
            // 如果是从大厅带过来的后台匹配状态，则立即开始轮询
            trialBgMatchStartTime = getTempState('matchmakingState')?.startTime || Date.now();
            updateTrialMatchmakingUI(true);
            startTrialBackgroundMatchPolling();
        } else {
            updateTrialMatchmakingUI(false);
        }
    } else {
        initializeRealRoomView();
        startRealRoomPolling();
    }
});

window.addEventListener('beforeunload', () => {
    if (roomStatePollingInterval) clearInterval(roomStatePollingInterval);
    if (trialBgMatchPollInterval) clearInterval(trialBgMatchPollInterval);
    // (可选) 如果正在后台匹配，可以尝试发送一个取消匹配的请求
    // if (isBackgroundMatchmakingActive) { navigator.sendBeacon(...) }
});

// --- 初始化函数 ---
function initializeTrialRoomView() {
    document.getElementById('roomTitle').textContent = "AI试玩房";
    document.getElementById('trialRoomInfoPanel').style.display = 'block';
    document.getElementById('roomInfoPanel').style.display = 'none'; // 隐藏真实房间信息
    document.getElementById('roomControlsPanel').style.display = 'none'; // 隐藏准备/开始按钮
    document.getElementById('leaveRoomButton').textContent = "返回大厅";

    // 试玩房直接进入游戏界面，并加载游戏 (currentGameIdForRoom 应该由后端 start_trial_game 返回)
    if (currentGameIdForRoom) {
        switchToGameView(currentGameIdForRoom, { isTrial: true, players: getTrialAIPlayers() }); // 传递试玩标记和AI玩家信息
    } else {
        showMessage('roomMessageArea', '无法加载试玩游戏数据。', 'error');
    }
}

function initializeRealRoomView() {
    document.getElementById('trialRoomInfoPanel').style.display = 'none';
    document.getElementById('roomInfoPanel').style.display = 'block';
    document.getElementById('roomControlsPanel').style.display = 'block'; // 真实房间显示准备/开始
    document.getElementById('leaveRoomButton').textContent = "离开房间";
    // 初始加载房间详情
    fetchAndRenderRealRoomDetails();
}

// --- 真实房间逻辑 ---
function startRealRoomPolling() {
    if (roomStatePollingInterval) clearInterval(roomStatePollingInterval);
    roomStatePollingInterval = setInterval(fetchAndRenderRealRoomDetails, 3000);
}

async function fetchAndRenderRealRoomDetails() {
    if (isTrialMode || !currentRoomId) { // 如果是试玩模式或没房间ID，则不执行
        if (roomStatePollingInterval) clearInterval(roomStatePollingInterval);
        return;
    }
    try {
        const data = await roomsAPI.getRoomDetails(currentRoomId);
        if (!data || !data.room_details) { /* ...错误处理, 可能返回大厅... */ return; }
        roomDetailsCache = data.room_details;
        renderRealRoomView(roomDetailsCache); // 新的渲染函数

        if (roomDetailsCache.status === 'playing' && roomDetailsCache.current_game_id) {
            switchToGameView(roomDetailsCache.current_game_id, roomDetailsCache);
            if (roomStatePollingInterval) clearInterval(roomStatePollingInterval); // 游戏开始后，房间状态轮询暂停
        } else if (roomDetailsCache.status === 'finished' && roomDetailsCache.current_game_id === null) {
            switchToRoomViewFromGameEnd(); // 游戏结束，回到房间等待
        }
    } catch (error) { /* ...错误处理 (同之前lobby.js的轮询错误处理)... */
        if (error.status === 401 || error.status === 403) { /* ...登出并跳转... */ }
    }
}

function renderRealRoomView(room) { // 之前 room.js 中的 renderRoomView
    document.getElementById('roomTitle').textContent = `房间: ${room.name} (${room.room_code})`;
    document.getElementById('roomOwner').textContent = room.owner_nickname;
    // ... (其他房间信息填充，与之前 renderRoomView 类似) ...
    const playerSeatsArea = document.getElementById('playerSeatsArea');
    clearElement(playerSeatsArea);
    // ... (渲染占位座位和真实玩家信息，与之前 renderRoomView 类似) ...
    let currentUserInRoom = false;
    room.players.forEach(player => { /* ... */ if(player.user_id === currentUserData.id) currentUserInRoom = true; /* ... */ });
    if (!currentUserInRoom && room.status !== 'closed') { /* ...跳转大厅... */ return;}

    document.getElementById('playerReadyButton').style.display = (room.status === 'waiting') ? 'inline-block' : 'none';
    document.getElementById('startGameButton').style.display = (room.status === 'waiting' && room.owner_id === currentUserData.id) ? 'inline-block' : 'none';
    document.getElementById('startGameButton').textContent = (room.status === 'finished' ? '再来一局' : '开始游戏');
}

async function handlePlayerReadyToggle() { /* ... (与之前 room.js 逻辑类似) ... */
    if (isTrialMode || !currentRoomId) return;
    // ... (API调用和UI更新)
    try {
        const btn = document.getElementById('playerReadyButton');
        const currentState = btn.dataset.currentState === 'ready';
        await roomsAPI.playerReady({ room_id: currentRoomId, is_ready: !currentState });
        fetchAndRenderRealRoomDetails(); // 立即刷新
    } catch (e) { showMessage('roomMessageArea', `准备失败: ${e.message}`, 'error'); }
}

async function handleStartGame() { // 真实房间的开始游戏
    if (isTrialMode || !currentRoomId) return;
    try {
        showMessage('roomMessageArea', '正在开始游戏...', 'info');
        const response = await roomsAPI.startGame({ room_id: currentRoomId });
        // 后端开始游戏后，下一次轮询 fetchAndRenderRealRoomDetails 会检测到并调用 switchToGameView
        // 或者这里可以直接调用，但要注意 roomDetailsCache 可能不是最新的
        // fetchAndRenderRealRoomDetails(); // 立即刷新以触发 switchToGameView
    } catch (error) { showMessage('roomMessageArea', `开始游戏失败: ${error.message}`, 'error'); }
}


// --- 试玩房间逻辑 ---
function getTrialAIPlayers() { // 模拟AI玩家数据给 game.js
    return [
        // 真实玩家通常是座位1
        { user_id: -1, nickname: 'AI Bot Alpha', seat_number: 2, is_ai_player: true },
        { user_id: -2, nickname: 'AI Bot Beta', seat_number: 3, is_ai_player: true },
        { user_id: -3, nickname: 'AI Bot Gamma', seat_number: 4, is_ai_player: true },
    ];
}

async function handleTrialToggleMatchmaking() {
    const trialMatchmakingStatusEl = document.getElementById('trialMatchmakingStatus');
    const trialToggleBtn = document.getElementById('trialToggleMatchmakingButton');

    if (isBackgroundMatchmakingActive) { // 当前在匹配，用户想取消
        try {
            showMessage(trialMatchmakingStatusEl, '正在取消后台匹配...', 'info');
            await roomsAPI.cancelMatchmaking();
            stopTrialBackgroundMatchPolling();
            showMessage(trialMatchmakingStatusEl, '已取消后台匹配。', 'success');
        } catch (error) {
            showMessage(trialMatchmakingStatusEl, `取消后台匹配失败: ${error.message}`, 'error');
        }
    } else { // 当前未匹配，用户想开始
        try {
            showMessage(trialMatchmakingStatusEl, '正在加入后台匹配队列...', 'info');
            await roomsAPI.requestMatchmaking();
            isBackgroundMatchmakingActive = true;
            trialBgMatchStartTime = Date.now();
            updateTrialMatchmakingUI(true);
            setTempState('backgroundMatchmakingActive', true);
            setTempState('matchmakingState', { isMatching: true, startTime: trialBgMatchStartTime });
            startTrialBackgroundMatchPolling();
            showMessage(trialMatchmakingStatusEl, '已在后台开始匹配，您可以继续试玩。', 'success');
        } catch (error) {
            showMessage(trialMatchmakingStatusEl, `后台匹配启动失败: ${error.message}`, 'error');
        }
    }
}

function updateTrialMatchmakingUI(isMatching) {
    const trialMatchmakingStatusEl = document.getElementById('trialMatchmakingStatus');
    const trialToggleBtn = document.getElementById('trialToggleMatchmakingButton');
    if (isMatching) {
        trialToggleBtn.textContent = '取消后台匹配';
        trialToggleBtn.classList.add('danger'); // 假设有这个CSS类
        trialMatchmakingStatusEl.style.display = 'inline';
        trialMatchmakingStatusEl.textContent = '后台匹配中...';
    } else {
        trialToggleBtn.textContent = '试玩并等待匹配';
        trialToggleBtn.classList.remove('danger');
        trialMatchmakingStatusEl.style.display = 'none';
    }
}

function startTrialBackgroundMatchPolling() {
    if (trialBgMatchPollInterval) clearInterval(trialBgMatchPollInterval);
    trialBgMatchPollInterval = setInterval(pollTrialBgMatchStatus, 3500); // 轮询频率稍慢于大厅
    pollTrialBgMatchStatus(); // 立即执行一次
}

function stopTrialBackgroundMatchPolling() {
    isBackgroundMatchmakingActive = false;
    if (trialBgMatchPollInterval) clearInterval(trialBgMatchPollInterval);
    trialBgMatchPollInterval = null;
    trialBgMatchStartTime = null;
    updateTrialMatchmakingUI(false);
    clearTempState('backgroundMatchmakingActive');
    clearTempState('matchmakingState');
}

async function pollTrialBgMatchStatus() {
    if (!isBackgroundMatchmakingActive || !isTrialMode) {
        if (trialBgMatchPollInterval) clearInterval(trialBgMatchPollInterval);
        return;
    }
    // 更新计时器 (如果需要显示)
    if (trialBgMatchStartTime) {
        // const elapsed = Math.floor((Date.now() - trialBgMatchStartTime) / 1000);
        // document.getElementById('trialMatchmakingStatus').textContent = `后台匹配中... (${elapsed}s)`;
    }

    try {
        const response = await roomsAPI.checkMatchmakingStatus();
        console.log("Trial BG Poll - Matchmaking status:", response);

        if (response && response.status === 'matched') {
            if (response.room_id && response.game_id) {
                stopTrialBackgroundMatchPolling();
                // 显示匹配成功弹窗
                const modal = document.getElementById('matchSuccessModal');
                const matchedRoomCodeEl = document.getElementById('matchedRoomCode');
                const timerEl = document.getElementById('matchRedirectTimer');
                const joinNowBtn = document.getElementById('joinMatchedGameNowButton');
                const cancelRedirectBtn = document.getElementById('cancelMatchRedirectButton');

                if (matchedRoomCodeEl) matchedRoomCodeEl.textContent = response.room_code || response.room_id;
                if(modal) modal.style.display = 'block';

                let countdown = 5;
                if(timerEl) timerEl.textContent = countdown;
                const redirectInterval = setInterval(() => {
                    countdown--;
                    if(timerEl) timerEl.textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(redirectInterval);
                        joinMatchedGame(response.room_id, response.game_id);
                    }
                }, 1000);

                joinNowBtn.onclick = () => {
                    clearInterval(redirectInterval);
                    joinMatchedGame(response.room_id, response.game_id);
                };
                cancelRedirectBtn.onclick = () => {
                    clearInterval(redirectInterval);
                    if(modal) modal.style.display = 'none';
                    // 用户取消跳转，可以选择返回大厅或继续试玩但停止后台匹配
                    // 这里我们让他返回大厅
                    showMessage('roomMessageArea', '已取消进入匹配房间，您可以返回大厅。', 'info');
                    // stopTrialBackgroundMatchPolling(); // 已在上面调用
                };

            } else { console.error("Matched status but missing room/game ID in trial poll."); }
        } else if (response && (response.status === 'cancelled' || response.status === 'error')) {
            stopTrialBackgroundMatchPolling();
            showMessage(document.getElementById('trialMatchmakingStatus'), response.message || `后台匹配已${response.status==='cancelled'?'取消':'出错'}。`, 'warn');
        }
        // 如果是 'queued'，则什么也不做，继续轮询
    } catch (error) {
        console.error("Error polling trial BG matchmaking status:", error);
        if (error.status === 401 || error.status === 403) { stopTrialBackgroundMatchPolling(); handleLogout(); }
        // 其他网络错误，可以暂时忽略，等待下一次轮询
    }
}

function joinMatchedGame(roomId, gameId) {
    clearTempState('isTrialGame');
    clearTempState('backgroundMatchmakingActive');
    clearTempState('matchmakingState');
    setTempState('roomIdToJoin', roomId);
    setTempState('gameIdToLoad', gameId);
    window.location.href = `room.html?roomId=${roomId}&gameId=${gameId}`; // 跳转到新的真实房间
}


// --- 通用函数 ---
function handleLeaveOrBackToLobby() { // 根据是否试玩决定行为
    if (isBackgroundMatchmakingActive) { // 如果正在后台匹配，先取消
        if (!confirm("您正在后台匹配中，离开会取消匹配，确定吗？")) return;
        handleCancelMatchmaking().then(() => { // 先尝试取消，再跳转
             window.location.href = 'lobby.html';
        }).catch(e => { //即使取消失败也尝试跳转
            console.warn("Failed to cancel matchmaking on leave, but proceeding to lobby.", e);
            window.location.href = 'lobby.html';
        });
    } else {
        if (isTrialMode) {
            window.location.href = 'lobby.html';
        } else { // 真实房间的离开逻辑
            if (!currentRoomId) { window.location.href = 'lobby.html'; return; }
            if (confirm('您确定要离开当前房间吗？')) {
                roomsAPI.leaveRoom({ room_id: currentRoomId })
                    .then(() => { window.location.href = 'lobby.html'; })
                    .catch(error => showMessage('roomMessageArea', `离开房间失败: ${error.message}`, 'error'));
            }
        }
    }
}

// 切换到游戏视图 (会被 game.js 调用或在此处触发 game.js 初始化)
window.switchToGameView = function(gameId, roomOrTrialData) {
    console.log(`Room.js: Switching to game view for game ID: ${gameId}, isTrial: ${roomOrTrialData.isTrial}`);
    document.getElementById('trialRoomInfoPanel').style.display = isTrialMode ? 'block' : 'none'; // 试玩时保持显示
    document.getElementById('roomInfoPanel').style.display = isTrialMode ? 'none' : 'block';
    document.getElementById('playerSeatsArea').style.display = 'none';
    document.getElementById('roomControlsPanel').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('gameResultArea').style.display = 'none';

    if (typeof window.initializeGame === 'function') {
        window.initializeGame(gameId, currentUserData, roomOrTrialData); // game.js的初始化
    } else { console.error("game.js or initializeGame function not found!"); }
};

// 从游戏结束切换回房间等待视图 (真实房间)
window.switchToRoomViewFromGameEnd = function() {
    console.log("Room.js: Switching back to room view from game end.");
    if (isTrialMode) { // 试玩结束后，可以重置游戏或直接提示返回大厅
        showMessage('gameMessageArea', '试玩本局结束！您可以选择“再来一局(试玩)”或“返回大厅”。', 'info');
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = 'block'; // 假设game.js已填充结算
        const nextRoundBtn = document.getElementById('nextRoundButton');
        nextRoundBtn.textContent = '再来一局 (试玩)';
        nextRoundBtn.style.display = 'inline-block';
        nextRoundBtn.onclick = async () => { // 试玩的再来一局
            try {
                showLoading('gameMessageArea', true, '准备新一局试玩...');
                const response = await roomsAPI.startTrialGame(); // 请求新的试玩游戏
                showLoading('gameMessageArea', false);
                if (response && response.room_id && response.game_id) {
                    currentRoomId = response.room_id; // 更新临时的试玩房ID
                    currentGameIdForRoom = response.game_id;
                    initializeTrialRoomView(); // 重新初始化试玩视图和游戏
                } else { showMessage('gameMessageArea', '开始新试玩局失败。', 'error');}
            } catch (e) { showLoading('gameMessageArea', false); showMessage('gameMessageArea', `开始新试玩局出错: ${e.message}`, 'error');}
        };

    } else { // 真实房间结束
        document.getElementById('trialRoomInfoPanel').style.display = 'none';
        document.getElementById('roomInfoPanel').style.display = 'block';
        document.getElementById('playerSeatsArea').style.display = 'flex';
        document.getElementById('roomControlsPanel').style.display = 'block';
        document.getElementById('gameArea').style.display = 'none';
        document.getElementById('gameResultArea').style.display = 'none';
        fetchAndRenderRealRoomDetails(); // 重新获取真实房间信息
        if(!roomStatePollingInterval && !isTrialMode) startRealRoomPolling(); // 如果之前停止了，重新开始轮询
    }
};
