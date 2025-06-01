// frontend/js/game.js (更健壮的版本)

// --- 全局变量 (game.js 作用域内) ---
let currentGameId = null;
let currentPlayer = { id: 0, nickname: "玩家" }; // 默认游客玩家，会被 initializeGame 更新
let currentRoomOrTrialData = null;
let isGameTrialMode = false;
let myInitialHand = [];     // Card对象数组 {rank, suit, imageName, string, ...}
let myArrangedDuns = { head: [], middle: [], tail: [] }; // Card对象数组
let gamePollingInterval = null;

// 用于拖拽
let draggedCardElement = null;
let draggedCardData = null;
let sourceAreaName = null;


// --- 由 game_manager.js 调用 ---
window.initializeGame = async function(gameId, userData, roomOrTrialData) {
    console.log("[Game.js] initializeGame START. GameID:", gameId, "User:", userData, "RoomData:", roomOrTrialData);
    currentGameId = gameId;
    currentPlayer = userData || { id: 0, nickname: "玩家", points: 0 }; // 确保currentPlayer不是null
    currentRoomOrTrialData = roomOrTrialData;
    isGameTrialMode = roomOrTrialData && roomOrTrialData.isTrial === true;

    window.resetGameUI(); // 清理现有UI

    // 显示/隐藏相关按钮
    const gameActionsDiv = document.querySelector('.game-actions');
    if (gameActionsDiv) gameActionsDiv.style.display = 'block';

    const aiArrangeBtn = document.getElementById('aiArrangeButton');
    if (aiArrangeBtn) aiArrangeBtn.style.display = 'inline-block';

    const submitBtn = document.getElementById('submitArrangementButton');
    if (submitBtn) {
        submitBtn.style.display = 'inline-block';
        submitBtn.disabled = false;
        submitBtn.textContent = '提交摆牌';
    }
    // newTrialGameButton 由 trialGameEnded 控制显示

    await fetchAndDisplayInitialGameState(); // 获取手牌等
    setupDragAndDrop();                  // 设置拖拽监听
    bindGameActionButtons();             // 绑定按钮事件

    if (!isGameTrialMode) {
        console.log("[Game.js] Real game mode: Starting polling.");
        if (gamePollingInterval) clearInterval(gamePollingInterval);
        gamePollingInterval = setInterval(pollCurrentGameState, 3000); // 调整轮询时间
        pollCurrentGameState(); // 立即获取一次
    } else {
        console.log("[Game.js] Trial game mode: AI display will be updated.");
        // 确保 currentRoomOrTrialData.players (包含AI信息) 已被 getGameState 更新
        // updateOtherPlayersDisplayForTrial(); // 这会在 fetchAndDisplayInitialGameState 后调用
    }
    console.log("[Game.js] initializeGame END.");
};

// --- UI重置 ---
window.resetGameUI = function() {
    console.log("[Game.js] resetGameUI CALLED.");
    myInitialHand = [];
    myArrangedDuns = { head: [], middle: [], tail: [] };

    const elementsToClear = ['myHandDisplay', 'headDun', 'middleDun', 'tailDun', 'arrangementError', 'gameMessageArea', 'otherPlayersGameStatus', 'trialSettlementDetails'];
    elementsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) clearElement(el); // clearElement 来自 ui.js
    });

    const dunTypesToReset = ['headDunType', 'middleDunType', 'tailDunType'];
    dunTypesToReset.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '(-)';
    });

    const submitBtn = document.getElementById('submitArrangementButton');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交摆牌';
    }
    document.getElementById('trialGameResultDisplay').style.display = 'none';
    document.getElementById('newTrialGameButton').style.display = 'none';
};

// --- 获取并显示初始游戏状态 (核心：手牌) ---
async function fetchAndDisplayInitialGameState() {
    if (!currentGameId) {
        console.error("[Game.js] fetchAndDisplayInitialGameState: No currentGameId!");
        showMessage(document.getElementById('gameMessageArea'), '错误：游戏ID丢失。', 'error');
        return;
    }
    const gameMsgEl = document.getElementById('gameMessageArea');
    try {
        if (gameMsgEl) showLoading(gameMsgEl, true, '获取牌局...');
        console.log(`[Game.js] Fetching game state for gameId: ${currentGameId}`);
        const gameState = await gameAPI.getGameState(currentGameId); // API call
        if (gameMsgEl) showLoading(gameMsgEl, false);
        console.log("[Game.js] Received gameState from API:", JSON.parse(JSON.stringify(gameState))); // 深拷贝打印，防止后续修改影响日志

        if (gameState && gameState.my_hand_data && Array.isArray(gameState.my_hand_data.initial_cards)) {
            myInitialHand = gameState.my_hand_data.initial_cards; // 已经是对象数组了
            console.log("[Game.js] My initial hand populated:", myInitialHand);
            renderMyHand(); // *** 渲染手牌 ***

            if (gameState.my_hand_data.submitted_at) {
                console.log("[Game.js] Player has already submitted. Restoring arranged duns.");
                myArrangedDuns.head = gameState.my_hand_data.arranged_head || [];
                myArrangedDuns.middle = gameState.my_hand_data.arranged_middle || [];
                myArrangedDuns.tail = gameState.my_hand_data.arranged_tail || [];
                renderAllDunsAndHand(); // 渲染所有区域
                updateAllDunTypeDisplays(); // 更新牌型显示
                const submitBtn = document.getElementById('submitArrangementButton');
                if(submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '已提交'; }
                if (gameMsgEl) showMessage(gameMsgEl, '您已提交摆牌。等待其他玩家或结算。', 'info');
            } else {
                if (gameMsgEl) showMessage(gameMsgEl, '请拖拽牌张到头、中、尾墩进行摆牌。', 'info');
            }

            // 更新其他玩家/AI显示 (确保 currentRoomOrTrialData 也从 gameState 更新，如果需要)
            if (gameState.all_player_final_hands) { // 这是更可靠的数据源
                currentRoomOrTrialData.players = gameState.all_player_final_hands;
            }
            if (isGameTrialMode) {
                updateOtherPlayersDisplayForTrial();
            } else {
                updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);
            }

            if (!isGameTrialMode && gameState.game_status === 'finished') {
                if (gamePollingInterval) clearInterval(gamePollingInterval);
                displayGameResultsAndSwitch(gameState);
            }

        } else {
            console.error("[Game.js] Invalid or missing initial_cards in gameState.my_hand_data:", gameState?.my_hand_data);
            if (gameMsgEl) showMessage(gameMsgEl, '无法获取您的手牌信息。', 'error');
        }
    } catch (error) {
        if (gameMsgEl) showLoading(gameMsgEl, false);
        console.error("[Game.js] Error in fetchAndDisplayInitialGameState:", error);
        if (gameMsgEl) showMessage(gameMsgEl, `获取游戏状态时发生错误: ${error.message || '未知错误'}`, 'error');
    }
}

// --- 渲染我的手牌 ---
function renderMyHand() {
    const handDisplay = document.getElementById('myHandDisplay');
    if (!handDisplay) {
        console.error("[Game.js] renderMyHand: myHandDisplay element not found!");
        return;
    }
    clearElement(handDisplay); // ui.js
    console.log("[Game.js] renderMyHand: Current myInitialHand:", myInitialHand);

    const unplacedCards = myInitialHand.filter(card => card && !isCardPlaced(card)); // 增加 card 存在性检查
    console.log("[Game.js] renderMyHand: Unplaced cards to render:", unplacedCards.length);

    unplacedCards.forEach(cardData => {
        if (!cardData || typeof cardData.rank === 'undefined' || typeof cardData.suit === 'undefined') {
            console.error("[Game.js] renderMyHand: Invalid cardData, skipping:", cardData);
            return;
        }
        try {
            // 确保 ui.js 中的 createCardElement 已加载且可用
            if (typeof createCardElement !== 'function') {
                console.error("[Game.js] renderMyHand: createCardElement function is not defined!");
                return;
            }
            const cardEl = createCardElement(cardData, true);
            handDisplay.appendChild(cardEl);
        } catch (e) {
            console.error("[Game.js] renderMyHand: Error creating card element for card:", cardData, e);
        }
    });
    if (unplacedCards.length > 0) {
         console.log("[Game.js] renderMyHand: Finished rendering " + unplacedCards.length + " cards.");
    } else if (myInitialHand.length > 0) {
        console.log("[Game.js] renderMyHand: No unplaced cards to render (all arranged or hand empty).");
    } else {
        console.log("[Game.js] renderMyHand: myInitialHand is empty.");
    }
}


// --- 绑定游戏操作按钮事件 ---
function bindGameActionButtons() {
    console.log("[Game.js] bindGameActionButtons CALLED.");
    const aiArrangeBtn = document.getElementById('aiArrangeButton');
    const submitBtn = document.getElementById('submitArrangementButton');
    // newTrialGameButton 的事件由 game_manager.js 的 trialGameEnded 回调中设置

    if (aiArrangeBtn) {
        aiArrangeBtn.onclick = async () => {
            console.log("[Game.js] AI Arrange button clicked.");
            const arrangementErrorEl = document.getElementById('arrangementError');
            const gameMsgEl = document.getElementById('gameMessageArea');
            if (arrangementErrorEl) displayError(arrangementErrorEl, '');
            if (gameMsgEl) showMessage(gameMsgEl, '请求AI辅助摆牌...', 'info');
            try {
                const response = await gameAPI.aiArrangeMyCards({ game_id: currentGameId });
                console.log("[Game.js] AI Arrange response:", response);
                if (response && response.arrangement) {
                    // 使用 findCardDataById 从 myInitialHand 获取完整的卡牌对象
                    myArrangedDuns.head = response.arrangement.head.map(s_id => myInitialHand.find(c => c.string === s_id) || {string:s_id, rank:'?', suit:'?'});
                    myArrangedDuns.middle = response.arrangement.middle.map(s_id => myInitialHand.find(c => c.string === s_id) || {string:s_id, rank:'?', suit:'?'});
                    myArrangedDuns.tail = response.arrangement.tail.map(s_id => myInitialHand.find(c => c.string === s_id) || {string:s_id, rank:'?', suit:'?'});
                    renderAllDunsAndHand();
                    updateAllDunTypeDisplays();
                    if (gameMsgEl) showMessage(gameMsgEl, `AI摆牌建议已应用。`, 'success');
                } else {
                    if (gameMsgEl) showMessage(gameMsgEl, 'AI未能提供摆牌建议。', 'warn');
                }
            } catch (error) {
                console.error("[Game.js] AI Arrange error:", error);
                if (gameMsgEl) showMessage(gameMsgEl, `AI辅助摆牌失败: ${error.message}`, 'error');
            }
        };
    } else { console.warn("[Game.js] aiArrangeButton not found."); }

    if (submitBtn) {
        submitBtn.onclick = async () => {
            console.log("[Game.js] Submit Arrangement button clicked.");
            const arrangementErrorEl = document.getElementById('arrangementError');
            const gameMsgEl = document.getElementById('gameMessageArea');
            if(arrangementErrorEl) displayError(arrangementErrorEl, '');

            if (myArrangedDuns.head.length !== 3 || myArrangedDuns.middle.length !== 5 || myArrangedDuns.tail.length !== 5 ||
                (myArrangedDuns.head.length + myArrangedDuns.middle.length + myArrangedDuns.tail.length !== 13)) {
                if(arrangementErrorEl) displayError(arrangementErrorEl, '请正确摆放13张牌 (3-5-5)。'); return;
            }

            const payload = {
                game_id: currentGameId,
                head: myArrangedDuns.head.map(c => c.string || `${c.rank}${c.suit}`), // 确保发送string
                middle: myArrangedDuns.middle.map(c => c.string || `${c.rank}${c.suit}`),
                tail: myArrangedDuns.tail.map(c => c.string || `${c.rank}${c.suit}`),
            };
            console.log("[Game.js] Submitting arrangement payload:", payload);

            try {
                submitBtn.disabled = true; submitBtn.textContent = '处理中...';
                if (gameMsgEl) showMessage(gameMsgEl, '正在提交您的摆牌...', 'info');

                if (isGameTrialMode) {
                    await gameAPI.submitArrangement(payload); // 提交玩家的牌
                    if (gameMsgEl) showMessage(gameMsgEl, '摆牌已提交！正在获取试玩结算...', 'success');
                    // 立即获取包含所有AI牌和玩家牌的最新状态以进行结算
                    const finalTrialState = await gameAPI.getGameState(currentGameId);
                    console.log("[Game.js] Trial mode: Fetched final state for settlement:", finalTrialState);
                    displayGameResultsAndSwitch(finalTrialState);
                } else { // 真实游戏
                    const response = await gameAPI.submitArrangement(payload);
                    console.log("[Game.js] Real game submit response:", response);
                    if (gameMsgEl) showMessage(gameMsgEl, `摆牌提交成功! ${response.is_daoshui ? '<strong style="color:red;">倒水!</strong>' : '未倒水.'} 等待其他玩家...`, 'success');
                    submitBtn.textContent = '已提交'; // 保持禁用，等待轮询更新
                    // 真实游戏会通过 pollCurrentGameState 来获取结算
                }
            } catch (error) {
                console.error("[Game.js] Submit arrangement error:", error);
                if (gameMsgEl) showMessage(gameMsgEl, `提交失败: ${error.message}`, 'error');
                if(arrangementErrorEl) displayError(arrangementErrorEl, error.message || '提交摆牌时发生错误。');
                submitBtn.disabled = false; submitBtn.textContent = '提交摆牌';
            }
        };
    } else { console.warn("[Game.js] submitArrangementButton not found."); }
}


// --- 拖拽逻辑 (setupDragAndDrop, findCardDataById, isCardPlaced, moveCardData) ---
// --- 渲染墩牌 (renderAllDunsAndHand, renderDun, updateAllDunTypeDisplays) ---
// --- 轮询 (pollCurrentGameState) ---
// --- 其他玩家状态更新 (updateOtherPlayersStatus, updateOtherPlayersDisplayForTrial) ---
// --- 显示结算 (displayGameResultsAndSwitch, formatDunForDisplay) ---
// *** 这些函数的代码与我上一个回复中提供的 game.js 版本基本一致，请确保它们存在且逻辑正确 ***
// *** 我在这里省略它们以避免重复，但你需要将它们完整地包含在你的 game.js 文件中。***
// *** 务必确保 `createCardElement` (在 ui.js) 能被这些函数正确调用。***

// 示例：确保拖拽函数在这里定义
function setupDragAndDrop() { console.log("[Game.js] setupDragAndDrop CALLED"); /* ... 完整逻辑 ... */ }
function findCardDataById(cardId) { /* ... */ }
function isCardPlaced(cardData) { /* ... */ }
function moveCardData(cardData, fromAreaName, toAreaName) { /* ... */ updateAllDunTypeDisplays(); /* 确保更新牌型 */ }
function renderAllDunsAndHand() { /* ... */ }
function renderDun(dunElementId, cardArray) { /* ... */ }
function updateAllDunTypeDisplays() { /* ... */ }
window.pollCurrentGameState = async function() { /* ... */ };
function updateOtherPlayersStatus(otherPlayers, totalPlayers) { /* ... */ }
function updateOtherPlayersDisplayForTrial(allPlayerHandsData = []) { /* ... */ }
function displayGameResultsAndSwitch(gameState) { /* ... */ }
function formatDunForDisplay(dunName, cardsArray, evalResult, hideCardsForAI = false) { /* ... */ }
