// frontend/js/game_manager.js

let currentTrialGameId = null;
let currentTrialRoomId = null; // 后端为试玩创建的临时房间ID
let loggedInUserData = null;   // 当前登录的用户信息

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Game Manager Initializing...");

    // 1. 检查用户登录状态 (调用 auth.js 中暴露的函数)
    loggedInUserData = await window.checkInitialAuthStatusAndUpdateUI();
    console.log("Initial loggedInUserData:", loggedInUserData);

    // 2. 为用户管理按钮添加事件监听
    const userManagementButton = document.getElementById('userManagementButton');
    userManagementButton?.addEventListener('click', () => {
        if (loggedInUserData && loggedInUserData.id) {
            // 如果已登录，打开用户管理视图并加载数据
            if (typeof window.loadUserManagementData === 'function') {
                window.loadUserManagementData(loggedInUserData);
            }
            openUserModal('management');
        } else {
            // 如果未登录，打开登录视图
            openUserModal('login');
        }
    });

    // 3. 自动开始一局AI试玩游戏
    await resetAndStartNewTrialGame();

    // 4. “再来一局(试玩)”按钮的事件 (如果之前game.js的按钮没覆盖掉)
    const newTrialGameBtn = document.getElementById('newTrialGameButton');
    newTrialGameBtn?.addEventListener('click', resetAndStartNewTrialGame);
});


// 全局函数，用于重置并开始新的AI试玩
window.resetAndStartNewTrialGame = async function() {
    console.log("Attempting to start a new trial game...");
    const gameMsgEl = document.getElementById('gameMessageArea');
    const trialResultEl = document.getElementById('trialGameResultDisplay');

    // 清理旧的游戏UI状态
    if (typeof window.resetGameUI === 'function') { // resetGameUI 在 game.js 中
        window.resetGameUI();
    }
    if (trialResultEl) trialResultEl.style.display = 'none'; // 隐藏旧的结算
    if (document.getElementById('newTrialGameButton')) document.getElementById('newTrialGameButton').style.display = 'none';


    // 确保用户数据已加载 (即使是未登录状态，后端试玩API也可能需要一个标识，但我们之前设计是需要登录的)
    // 为了让试玩更流畅，如果用户未登录，我们可能需要一个“游客”模式的试玩，
    // 或者强制后端start_trial_game在用户未登录时也能工作（例如使用一个固定的游客user_id）。
    // 当前我们的后端API设计是试玩也需要登录用户。
    if (!loggedInUserData && typeof window.checkInitialAuthStatusAndUpdateUI === 'function') {
        loggedInUserData = await window.checkInitialAuthStatusAndUpdateUI(); // 确保获取最新状态
    }
    if (!loggedInUserData) {
        // 如果严格要求登录才能试玩
        showMessage(gameMsgEl, '请先通过“我的账户”登录以开始试玩。', 'warn');
        // openUserModal('login'); // 可以选择直接弹出登录框
        // return;
        // 或者，如果允许未登录试玩，后端需要调整 start_trial_game API
        console.warn("User not logged in, but attempting trial. Backend might need guest mode for start_trial_game.");
        // 暂时假设后端能处理（或我们稍后调整后端）
    }


    try {
        if (gameMsgEl) showLoading(gameMsgEl, true, '正在准备新的AI对局...');
        const response = await roomsAPI.startTrialGame(); // 调用后端API获取试玩牌局
        if (gameMsgEl) showLoading(gameMsgEl, false);

        if (response && response.room_id && response.game_id && response.is_trial) {
            currentTrialRoomId = response.room_id;
            currentTrialGameId = response.game_id;

            if (gameMsgEl) showMessage(gameMsgEl, 'AI对局已开始！请摆牌。', 'success');

            // 构建传递给 initializeGame 的 roomOrTrialData
            const trialRoomData = {
                id: currentTrialRoomId, // 房间ID
                current_game_id: currentTrialGameId,
                isTrial: true,
                // 模拟玩家列表：真实玩家 + AI
                // 真实玩家信息 (如果已登录)
                // AI玩家信息需要后端在 start_trial_game 响应中提供，或者前端模拟
                // 我们假设后端 start_trial_game 已经为AI创建了 player_game_hands 记录
                // getGameState 将能获取到所有玩家（包括AI）的信息
                players: [
                    // 真实玩家 (如果已登录，其信息会通过 getGameState 获得)
                    // 如果未登录，game.js 中的 currentPlayer 会是 null，需要处理
                    ...(loggedInUserData ? [{ user_id: loggedInUserData.id, nickname: loggedInUserData.nickname, seat_number: 1 }] : [{user_id: 0, nickname: "玩家", seat_number: 1}]), // 游客/默认玩家
                    // AI 玩家 (这些信息最好由后端在 start_trial_game 的响应中提供，或通过 getGameState 获取)
                    // 为了简化，我们先用占位符，game.js 的 getGameState 会获取真实（模拟）数据
                    { user_id: -1, nickname: 'AI Alpha', seat_number: 2, is_ai_player: true },
                    { user_id: -2, nickname: 'AI Beta',  seat_number: 3, is_ai_player: true },
                    { user_id: -3, nickname: 'AI Gamma', seat_number: 4, is_ai_player: true },
                ]
            };

            // 调用 game.js 中的 initializeGame 函数
            if (typeof window.initializeGame === 'function') {
                // loggedInUserData 可能是 null (如果未登录)
                window.initializeGame(currentTrialGameId, loggedInUserData || {id:0, nickname:"玩家"}, trialRoomData);
            } else {
                console.error("game.js or initializeGame function not found!");
                if(gameMsgEl) showMessage(gameMsgEl, '无法加载游戏界面组件。', 'error');
            }

        } else {
            const errorMsg = response?.error?.message || response?.message || '开始新的AI对局失败。';
            if(gameMsgEl) showMessage(gameMsgEl, errorMsg, 'error');
        }
    } catch (error) {
        if(gameMsgEl) showLoading(gameMsgEl, false);
        console.error("Error starting new trial game:", error);
        if(gameMsgEl) showMessage(gameMsgEl, `开始AI对局时发生错误: ${error.message || '未知错误'}`, 'error');
    }
};

// 当游戏结束时，game.js 会调用这个 (如果存在)
window.trialGameEnded = function(settlementDetailsHTML) {
    const trialResultEl = document.getElementById('trialGameResultDisplay');
    const trialSettlementDetailsEl = document.getElementById('trialSettlementDetails');
    const newTrialGameBtn = document.getElementById('newTrialGameButton');

    if (trialSettlementDetailsEl) trialSettlementDetailsEl.innerHTML = settlementDetailsHTML;
    if (trialResultEl) trialResultEl.style.display = 'block';
    if (newTrialGameBtn) newTrialGameBtn.style.display = 'inline-block';
};
