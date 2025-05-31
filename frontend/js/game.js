// frontend/js/game.js

// ... (全局变量声明不变: currentGameId, currentPlayer, myInitialHand, myArrangedDuns, handEvaluatorFrontend, gamePollingInterval,拖拽变量) ...
let currentRoomOrTrialData = null; // 存储房间或试玩数据 (包含玩家列表)
let isGameTrialMode = false; // 游戏是否为试玩模式

// 修改 initializeGame
window.initializeGame = async function(gameId, userData, roomOrTrialData) {
    console.log(`Game.js: Initializing game ${gameId} for user ${userData.id}. Is Trial: ${roomOrTrialData.isTrial}`);
    currentGameId = gameId;
    currentPlayer = userData;
    currentRoomOrTrialData = roomOrTrialData; // 保存传入的房间/试玩数据
    isGameTrialMode = roomOrTrialData.isTrial === true;

    resetGameUI(); // 清理UI

    // 根据是否试玩调整UI
    document.getElementById('leaveRoomButton').textContent = isGameTrialMode ? "返回大厅" : "离开房间";
    const nextRoundBtn = document.getElementById('nextRoundButton');
    if (isGameTrialMode) {
        nextRoundBtn.textContent = "再来一局 (试玩)";
        // 试玩模式下，“再来一局”的逻辑由 room.js 的 switchToRoomViewFromGameEnd 处理
    } else {
        nextRoundBtn.textContent = "再来一局 (房主)";
    }
    // AI辅助摆牌按钮在试玩和真实游戏都可用
    document.getElementById('aiArrangeButton').style.display = 'inline-block';


    await fetchAndDisplayInitialGameState(); // 获取并显示手牌
    setupDragAndDrop(); // 设置拖拽

    // 开始轮询游戏状态 (真实游戏才需要轮询比牌和结算，试玩通常是即时或前端模拟)
    if (!isGameTrialMode) {
        if (gamePollingInterval) clearInterval(gamePollingInterval);
        gamePollingInterval = setInterval(pollCurrentGameState, 2500);
        pollCurrentGameState(); // 立即获取一次状态
    } else {
        // 试玩模式下，AI已自动摆牌，玩家摆完牌后可以直接进行前端比牌或调用后端进行比牌（如果后端支持）
        // 简化：试玩模式下，玩家提交后，我们直接模拟一个结算流程或调用一个特殊的后端结算API
        // AI的牌在试玩时，可以从后端getGameState一次性获取，或者在玩家提交后，前端模拟AI出牌和比牌。
        // 当前后端start_trial_game已将AI的牌和摆牌结果存入数据库，getGameState可以取到。
        updateOtherPlayersStatusForTrial(); // 试玩时特殊处理其他玩家状态显示
    }
};

function resetGameUI() {
    // ... (与之前类似，确保清理所有游戏相关区域) ...
    document.getElementById('myHandDisplay').innerHTML = '';
    document.getElementById('headDun').innerHTML = ''; /* ... etc ... */
    document.getElementById('submitArrangementButton').disabled = false;
    document.getElementById('submitArrangementButton').textContent = '提交摆牌';
    document.getElementById('otherPlayersGameStatus').innerHTML = '<h4>其他玩家状态:</h4>';
    document.getElementById('gameResultArea').style.display = 'none';
    showMessage('gameMessageArea', '');
}

async function fetchAndDisplayInitialGameState() {
    // ... (与之前类似，调用 gameAPI.getGameState(currentGameId)) ...
    // 这个函数现在也会被试玩模式调用，以获取真人玩家的牌和AI已摆好的牌
    if (!currentGameId) return;
    try {
        showLoading('gameMessageArea');
        const gameState = await gameAPI.getGameState(currentGameId);
        showMessage('gameMessageArea', '', 'info'); // 清除加载信息

        if (gameState && gameState.my_hand_data && gameState.my_hand_data.initial_cards) {
            myInitialHand = gameState.my_hand_data.initial_cards.map(cardData => cardData); // 后端已是对象
            renderMyHand(); // 新的渲染函数

            if (gameState.my_hand_data.submitted_at) { // 如果已提交
                myArrangedDuns.head = gameState.my_hand_data.arranged_head.map(c => c);
                // ... (填充middle, tail) ...
                renderAllDunsAndHand();
                document.getElementById('submitArrangementButton').disabled = true;
                document.getElementById('submitArrangementButton').textContent = '已提交';
                showMessage('gameMessageArea', '您已提交摆牌。', 'info');
            } else {
                showMessage('gameMessageArea', '请摆牌。', 'info');
            }

            // 更新其他玩家状态 (真实游戏) 或显示AI信息 (试玩)
            if (isGameTrialMode) {
                updateOtherPlayersStatusForTrial(gameState.all_player_final_hands || []); // 传入AI的牌局数据
            } else {
                updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);
            }

            // 如果是真实游戏且所有人都已提交，但状态还不是finished，则触发结算显示
            if (!isGameTrialMode && gameState.all_players_submitted && gameState.game_status !== 'finished') {
                 if (gamePollingInterval) clearInterval(gamePollingInterval); // 结算前停止轮询
                 displayGameResults(gameState); // 直接显示结果
            } else if (gameState.game_status === 'finished') {
                displayGameResults(gameState);
            }

        } else { showMessage('gameMessageArea', '无法获取手牌。', 'error'); }
    } catch (error) { showMessage('gameMessageArea', `获取游戏状态失败: ${error.message}`, 'error'); }
    finally { showLoading('gameMessageArea', false); }
}

function renderMyHand() {
    const handDisplay = document.getElementById('myHandDisplay');
    clearElement(handDisplay);
    myInitialHand.filter(card => !isCardPlaced(card)).forEach(cardData => {
        handDisplay.appendChild(createCardElement(cardData, true));
    });
}

// setupDragAndDrop, findCardDataById, isCardPlaced, moveCardData, renderAllDunsAndHand, renderDun, updateAllDunTypeDisplays
// 这些拖拽和渲染相关的函数基本保持不变，但要确保它们能正确处理 myArrangedDuns 中的数据。

// 提交摆牌按钮事件 (修改以处理试玩模式)
document.getElementById('submitArrangementButton')?.addEventListener('click', async () => {
    // ... (之前的牌数验证不变) ...
    if (myArrangedDuns.head.length !== 3 || myArrangedDuns.middle.length !== 5 || myArrangedDuns.tail.length !== 5 ||
        (myArrangedDuns.head.length + myArrangedDuns.middle.length + myArrangedDuns.tail.length !== 13)) {
        displayError('arrangementError', '请正确摆放13张牌 (3-5-5)。'); return;
    }

    const payload = { /* ... (与之前一样) ... */ game_id: currentGameId, head: myArrangedDuns.head.map(c=>c.string), /*...*/ };
    try {
        document.getElementById('submitArrangementButton').disabled = true;
        document.getElementById('submitArrangementButton').textContent = '提交中...';
        showMessage('gameMessageArea', '正在提交...', 'info');

        const response = await gameAPI.submitArrangement(payload); // 真实游戏提交
        showMessage('gameMessageArea', `摆牌提交成功! ${response.is_daoshui ? '<strong style="color:red;">倒水!</strong>' : '未倒水。'} ...`, 'success');
        document.getElementById('submitArrangementButton').textContent = '已提交';

        if (isGameTrialMode) {
            // 试玩模式下，玩家提交后，我们需要获取包含AI结果的完整游戏状态来进行前端结算
            // 或者后端可以在 submitArrangement 时针对试玩游戏直接返回结算结果
            // 为简单起见，我们再次调用 getGameState 获取完整数据
            // 理想情况：后端 submitArrangement 如果是试玩，直接返回完整结算信息
            const finalTrialState = await gameAPI.getGameState(currentGameId);
            displayGameResults(finalTrialState); // 用获取到的完整状态显示结果
        }
        // 真实游戏会通过 pollCurrentGameState 来获取结算

    } catch (error) { /* ... (错误处理不变) ... */
        document.getElementById('submitArrangementButton').disabled = false;
        document.getElementById('submitArrangementButton').textContent = '提交摆牌';
    }
});

// AI辅助摆牌按钮事件 (基本不变)
document.getElementById('aiArrangeButton')?.addEventListener('click', async () => { /* ... */ });


// 轮询当前游戏状态 (只在真实游戏中有效)
window.pollCurrentGameState = async function() {
    if (isGameTrialMode || !currentGameId || document.getElementById('gameArea').style.display === 'none') {
        if (gamePollingInterval) clearInterval(gamePollingInterval);
        gamePollingInterval = null;
        return;
    }
    // ... (与之前 pollCurrentGameState 逻辑基本一致，处理 gameState.all_players_submitted 和 gameState.game_status === 'finished')
    // 当 gameState.game_status === 'finished' 时，调用 displayGameResults(gameState)
    try {
        const gameState = await gameAPI.getGameState(currentGameId);
        updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);
        if (gameState.game_status === 'finished' || (gameState.all_players_submitted && gameState.game_status !== 'comparing')) {
             if (gamePollingInterval) clearInterval(gamePollingInterval);
             gamePollingInterval = null;
             displayGameResults(gameState);
        } // ... (其他逻辑)
    } catch (e) { /* ... */ }
};

function updateOtherPlayersStatus(otherPlayers, totalPlayersInGame) { // 真实游戏
    // ... (与之前类似，显示其他真实玩家的提交状态) ...
    const statusDiv = document.getElementById('otherPlayersGameStatus');
    let html = `<h4>其他玩家 (${otherPlayers?.length || 0}/${(totalPlayersInGame || currentRoomOrTrialData.players.length)-1}):</h4><ul>`;
    if (currentRoomOrTrialData && currentRoomOrTrialData.players) {
        currentRoomOrTrialData.players.forEach(roomPlayer => {
            if (roomPlayer.user_id === currentPlayer.id || roomPlayer.is_ai_player) return; // 跳过自己和AI

            const gameStatus = otherPlayers?.find(op => op.user_id === roomPlayer.user_id);
            html += `<li>${roomPlayer.nickname}: ${gameStatus ? (gameStatus.has_submitted ? '已提交' : '摆牌中...') : '等待中...'}</li>`;
        });
    }
    html += '</ul>';
    statusDiv.innerHTML = html;
}

function updateOtherPlayersStatusForTrial(allPlayerFinalHands = []) { // 试玩模式
    const statusDiv = document.getElementById('otherPlayersGameStatus');
    let html = `<h4>AI对手状态:</h4><ul>`;
    const aiPlayersData = currentRoomOrTrialData.players.filter(p => p.is_ai_player); // 从roomOrTrialData获取AI信息

    aiPlayersData.forEach(ai => {
        // 查找AI在 allPlayerFinalHands 中的数据（如果后端已提供）
        const aiHandData = allPlayerFinalHands.find(h => h.user_id === ai.user_id);
        if (aiHandData && aiHandData.submitted_at) { // 假设AI总是已提交
            html += `<li>${ai.nickname}: 已摆牌 (AI)</li>`;
        } else {
            html += `<li>${ai.nickname}: 等待您提交... (AI)</li>`;
        }
    });
    html += '</ul>';
    statusDiv.innerHTML = html;
}


// 显示游戏结算 (修改以处理试玩和真实游戏的不同后续操作)
function displayGameResults(gameState) {
    // ... (填充 settlementDetailsDiv 的逻辑与之前类似，展示所有人的牌、牌型、得分)
    // 注意：gameState.all_player_final_hands 现在是主要数据源
    // gameState.settlement_results 包含每个玩家的得分和比牌详情
    document.getElementById('gameArea').style.display = 'none';
    const resultArea = document.getElementById('gameResultArea');
    const settlementDetailsDiv = document.getElementById('settlementDetails');
    clearElement(settlementDetailsDiv);
    let resultHTML = '<h3>本局结算详情</h3>';
    // ... (构建 resultHTML，与之前类似，遍历 gameState.all_player_final_hands)
    if (gameState.all_player_final_hands && gameState.settlement_results) {
        gameState.all_player_final_hands.forEach(pHand => { /* ... */ });
    } else { resultHTML += "<p>结算信息不完整。</p>"; }
    settlementDetailsDiv.innerHTML = resultHTML;
    resultArea.style.display = 'block';


    const nextRoundButton = document.getElementById('nextRoundButton');
    const backToLobbyButton = document.getElementById('backToLobbyButton');

    if (isGameTrialMode) {
        nextRoundButton.textContent = '再来一局 (试玩)';
        nextRoundButton.style.display = 'inline-block';
        // "再来一局 (试玩)" 的 onclick 事件现在由 room.js 的 switchToRoomViewFromGameEnd 处理
        backToLobbyButton.onclick = () => { window.location.href = 'lobby.html'; };
    } else { // 真实游戏
        // 房主才能看到“再来一局”
        if (gameState.room_owner_id === currentPlayer.id) {
            nextRoundButton.textContent = '再来一局';
            nextRoundButton.style.display = 'inline-block';
            // 真实游戏的 "再来一局" onclick 也应由 room.js 处理 (调用startGame)
        } else {
            nextRoundButton.style.display = 'none';
        }
        backToLobbyButton.onclick = () => { window.location.href = 'lobby.html'; };
    }

    // 游戏结束后，通知 room.js 更新视图
    if (typeof window.switchToRoomViewFromGameEnd === 'function') {
        window.switchToRoomViewFromGameEnd();
    }
}

// formatDunForDisplay 函数不变
// 其他拖拽辅助函数 (isCardPlaced, moveCardData, renderAllDunsAndHand, renderDun, updateAllDunTypeDisplays) 基本不变
// 确保 CardUtils.js 被正确加载和使用
