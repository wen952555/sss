// frontend/js/game.js

// ... (全局变量声明不变，但 currentRoomOrTrialData 和 isGameTrialMode 会由 initializeGame 设置) ...
// let currentRoomOrTrialData = null; // 由 game_manager 传入
// let isGameTrialMode = false;

window.initializeGame = async function(gameId, userData, roomOrTrialData) {
    console.log(`Game.js: Initializing game ${gameId}. User:`, userData, "Room/Trial Data:", roomOrTrialData);
    currentGameId = gameId;
    currentPlayer = userData; // userData 可能是 null (未登录的试玩) 或 {id, nickname}
    currentRoomOrTrialData = roomOrTrialData;
    isGameTrialMode = roomOrTrialData.isTrial === true;

    window.resetGameUI(); // 调用全局的 resetGameUI

    // 根据是否试玩调整UI
    document.getElementById('newTrialGameButton').style.display = 'none'; // 初始隐藏“再来一局”
    const submitBtn = document.getElementById('submitArrangementButton');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交摆牌';
    }

    // AI辅助摆牌按钮在试玩和真实游戏都可用 (假设按钮存在)
    const aiArrangeBtn = document.getElementById('aiArrangeButton');
    if (aiArrangeBtn) aiArrangeBtn.style.display = 'inline-block';

    await fetchAndDisplayInitialGameState(); // 获取并显示手牌
    setupDragAndDrop(); // 设置拖拽

    if (!isGameTrialMode) { // 真实游戏才轮询
        if (gamePollingInterval) clearInterval(gamePollingInterval);
        gamePollingInterval = setInterval(pollCurrentGameState, 2500);
        pollCurrentGameState();
    } else {
        // 试玩模式下，AI的牌局数据应已在 fetchAndDisplayInitialGameState 中通过 getGameState 获取
        // AI已经自动出牌
        updateOtherPlayersDisplayForTrial();
    }
};

window.resetGameUI = function() { /* ... (与之前类似，清理UI) ... */
    document.getElementById('myHandDisplay').innerHTML = '';
    document.getElementById('headDun').innerHTML = '';
    document.getElementById('middleDun').innerHTML = '';
    document.getElementById('tailDun').innerHTML = '';
    document.getElementById('headDunType').textContent = '(-)';
    document.getElementById('middleDunType').textContent = '(-)';
    document.getElementById('tailDunType').textContent = '(-)';
    displayError('arrangementError', '');
    showMessage(document.getElementById('gameMessageArea'), '');
    document.getElementById('otherPlayersGameStatus').innerHTML = '<h4>其他玩家状态:</h4>';
    document.getElementById('trialGameResultDisplay').style.display = 'none'; // 隐藏试玩结算
    const submitBtn = document.getElementById('submitArrangementButton');
    if(submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交摆牌';
    }
    myInitialHand = [];
    myArrangedDuns = { head: [], middle: [], tail: [] };
};


async function fetchAndDisplayInitialGameState() {
    if (!currentGameId) return;
    const gameMsgEl = document.getElementById('gameMessageArea');
    try {
        if (gameMsgEl) showLoading(gameMsgEl, true, '获取牌局数据...');
        const gameState = await gameAPI.getGameState(currentGameId); // 后端 getGameState 需要能处理试玩游戏
        if (gameMsgEl) showLoading(gameMsgEl, false);
        console.log("fetchAndDisplayInitialGameState - gameState:", gameState);

        if (gameState && gameState.my_hand_data && gameState.my_hand_data.initial_cards) {
            myInitialHand = gameState.my_hand_data.initial_cards.map(cardData => cardData);
            renderMyHand();

            if (gameState.my_hand_data.submitted_at) {
                // ... (填充已摆放的牌，禁用提交按钮) ...
                myArrangedDuns.head = gameState.my_hand_data.arranged_head.map(c=>c);
                myArrangedDuns.middle = gameState.my_hand_data.arranged_middle.map(c=>c);
                myArrangedDuns.tail = gameState.my_hand_data.arranged_tail.map(c=>c);
                renderAllDunsAndHand();
                updateAllDunTypeDisplays();
                document.getElementById('submitArrangementButton').disabled = true;
                document.getElementById('submitArrangementButton').textContent = '已提交';
                if (gameMsgEl) showMessage(gameMsgEl, '您已提交摆牌，等待其他玩家或结算。', 'info');
            } else {
                if (gameMsgEl) showMessage(gameMsgEl, '请摆牌。', 'info');
            }

            // 更新其他玩家/AI显示
            if (isGameTrialMode) {
                // all_player_final_hands 应该包含AI已经摆好的牌
                currentRoomOrTrialData.players = gameState.all_player_final_hands || currentRoomOrTrialData.players; // 更新玩家数据源
                updateOtherPlayersDisplayForTrial(gameState.all_player_final_hands);
            } else {
                updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);
            }

            // 检查是否可以直接显示结果 (真实游戏)
            if (!isGameTrialMode && gameState.game_status === 'finished') {
                if (gamePollingInterval) clearInterval(gamePollingInterval);
                displayGameResultsAndSwitch(gameState);
            }
        } else {
            if (gameMsgEl) showMessage(gameMsgEl, '无法获取您的手牌信息。', 'error');
        }
    } catch (error) {
        if (gameMsgEl) showLoading(gameMsgEl, false);
        console.error("Error fetching initial game state:", error);
        if (gameMsgEl) showMessage(gameMsgEl, `获取游戏状态失败: ${error.message}`, 'error');
    }
}

// renderMyHand, setupDragAndDrop, findCardDataById, isCardPlaced, moveCardData,
// renderAllDunsAndHand, renderDun, updateAllDunTypeDisplays - 这些函数保持基本不变

// 提交摆牌按钮事件
document.getElementById('submitArrangementButton')?.addEventListener('click', async () => {
    // ... (牌数验证不变) ...
    const gameMsgEl = document.getElementById('gameMessageArea');
    const arrangementErrorEl = document.getElementById('arrangementError');
    displayError(arrangementErrorEl, '');
    // ... (牌数验证逻辑)

    const payload = { game_id: currentGameId, head: myArrangedDuns.head.map(c=>c.string), /* middle, tail */ };
    try {
        document.getElementById('submitArrangementButton').disabled = true;
        document.getElementById('submitArrangementButton').textContent = '处理中...';
        if (gameMsgEl) showMessage(gameMsgEl, '正在提交您的摆牌...', 'info');

        if (isGameTrialMode) {
            // 对于试玩，提交后我们期望后端直接进行比牌并返回完整结果
            // 或者，后端只记录玩家的牌，然后前端的 getGameState 会获取到更新，再进行前端比牌
            // 为了简单，我们假设后端 `submitArrangement` 对试玩游戏做了特殊处理，
            // 并且会返回一个包含所有玩家（包括AI）最终牌面和评估的完整 gameState，或者至少更新数据库让 getGameState 能取到。
            // 或者，一个更简单的方式是，试玩模式的 `submitArrangement` 只是在前端标记完成，
            // 然后前端直接用 `HandEvaluator` 和 AI 的已知牌进行比牌。
            // 当前我们的后端 `start_trial_game` 已经让AI摆好牌了。
            // 所以，玩家提交后，我们只需要获取最新的游戏状态（包含了玩家的牌）然后就可以结算了。

            await gameAPI.submitArrangement(payload); // 先提交玩家的牌
            if (gameMsgEl) showMessage(gameMsgEl, '摆牌已提交！正在结算试玩...', 'success');
            const finalTrialState = await gameAPI.getGameState(currentGameId); // 获取包含所有人牌的最新状态
            displayGameResultsAndSwitch(finalTrialState); // 显示结果并通知 manager

        } else { // 真实游戏
            const response = await gameAPI.submitArrangement(payload);
            if (gameMsgEl) showMessage(gameMsgEl, `摆牌提交成功! ${response.is_daoshui ? '倒水!' : '未倒水.'} 等待其他玩家...`, 'success');
            document.getElementById('submitArrangementButton').textContent = '已提交';
            // 真实游戏会通过 pollCurrentGameState 来获取结算
        }
    } catch (error) {
        if (gameMsgEl) showMessage(gameMsgEl, `提交失败: ${error.message}`, 'error');
        displayError(arrangementErrorEl, error.message || '提交摆牌时发生错误。');
        document.getElementById('submitArrangementButton').disabled = false;
        document.getElementById('submitArrangementButton').textContent = '提交摆牌';
    }
});

// AI辅助摆牌 (不变)
document.getElementById('aiArrangeButton')?.addEventListener('click', async () => { /* ... */ });

// 轮询 (只用于真实游戏)
window.pollCurrentGameState = async function() {
    if (isGameTrialMode || !currentGameId || document.getElementById('gameArea')?.style.display === 'none') {
        if (gamePollingInterval) clearInterval(gamePollingInterval); gamePollingInterval = null; return;
    }
    try {
        const gameState = await gameAPI.getGameState(currentGameId);
        console.log("Game Poll - State:", gameState);
        if (!isGameTrialMode) { // 双重检查，以防万一
            updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);
            if (gameState.game_status === 'finished' || (gameState.all_players_submitted && gameState.game_status !== 'comparing')) {
                 if (gamePollingInterval) clearInterval(gamePollingInterval); gamePollingInterval = null;
                 displayGameResultsAndSwitch(gameState);
            } else if (gameState.my_hand_data?.submitted_at && document.getElementById('submitArrangementButton').textContent !== '已提交') {
                 document.getElementById('submitArrangementButton').disabled = true;
                 document.getElementById('submitArrangementButton').textContent = '已提交';
                 showMessage(document.getElementById('gameMessageArea'), '您已提交，等待其他玩家...', 'info');
            }
        }
    } catch (e) { /* ... */ console.error("Error polling game state:", e); }
};

function updateOtherPlayersStatus(otherPlayers, totalPlayers) { /* ... (真实游戏，不变) ... */ }

function updateOtherPlayersDisplayForTrial(allPlayerHandsData = []) {
    const statusDiv = document.getElementById('otherPlayersGameStatus');
    const aiPlayerAreas = { // 将AI的HTML区域与后端（或模拟的）AI ID关联
        '-1': document.querySelector('.ai-player-area.top-ai .player-cards-played'), // 假设AI UserID是-1, -2, -3
        '-2': document.querySelector('.ai-player-area.left-ai .player-cards-played'),
        '-3': document.querySelector('.ai-player-area.right-ai .player-cards-played'),
    };
    const aiStatusAreas = {
        '-1': document.querySelector('.ai-player-area.top-ai .ai-status'),
        '-2': document.querySelector('.ai-player-area.left-ai .ai-status'),
        '-3': document.querySelector('.ai-player-area.right-ai .ai-status'),
    };


    // 先清空之前的AI牌面显示
    for (const key in aiPlayerAreas) {
        if (aiPlayerAreas[key]) clearElement(aiPlayerAreas[key]);
        if (aiStatusAreas[key]) aiStatusAreas[key].textContent = '(等待...)';
    }

    if (allPlayerHandsData && allPlayerHandsData.length > 0) {
        allPlayerHandsData.forEach(playerHand => {
            if (playerHand.user_id < 0) { // 假设AI的user_id是负数
                const aiArea = aiPlayerAreas[playerHand.user_id.toString()];
                const aiStatus = aiStatusAreas[playerHand.user_id.toString()];

                if (aiStatus) aiStatus.textContent = '(已出牌)';

                if (aiArea) {
                    // 在试玩中，AI的牌默认是隐藏的，直到结算
                    // 或者我们可以显示牌的背面
                    for (let i = 0; i < 13; i++) { // 显示13张牌背
                        const cardBackDiv = document.createElement('div');
                        cardBackDiv.classList.add('card', 'card-back'); // 需要CSS定义 .card-back
                        aiArea.appendChild(cardBackDiv);
                    }
                }
            }
        });
    } else if (currentRoomOrTrialData && currentRoomOrTrialData.players) { // 如果还没有牌局数据，显示AI占位
         currentRoomOrTrialData.players.forEach(player => {
            if (player.is_ai_player) {
                const aiStatus = aiStatusAreas[player.user_id.toString()];
                if (aiStatus) aiStatus.textContent = '(AI准备就绪)';
            }
         });
    }
}


// 显示游戏结算并通知 Game Manager
function displayGameResultsAndSwitch(gameState) {
    const settlementDetailsDiv = document.getElementById('trialSettlementDetails'); // 使用试玩结算的div
    const gameResultDisplayEl = document.getElementById('trialGameResultDisplay');
    clearElement(settlementDetailsDiv);
    let resultHTML = '';

    if (gameState && gameState.all_player_final_hands && gameState.settlement_results) {
        gameState.all_player_final_hands.forEach(pHand => {
            resultHTML += `<div class="player-result-summary">`;
            let displayName = pHand.nickname;
            if (pHand.user_id == currentPlayer?.id) displayName = `<strong>${displayName} (您)</strong>`;
            else if (pHand.user_id < 0) displayName = `${displayName} (AI)`; // 标记AI

            resultHTML += `<h4>${displayName}</h4>`;
            if (pHand.is_daoshui) resultHTML += `<p style="color:red;"><strong>倒水!</strong></p>`;
            if (pHand.special_card_type_name) resultHTML += `<p>特殊牌型: <strong>${pHand.special_card_type_name}</strong></p>`;

            resultHTML += formatDunForDisplay('头', pHand.arranged_head, pHand.head_eval_result, pHand.user_id < 0 && !isGameTrialMode); // 真实游戏不显示AI手牌，试玩可以显示
            resultHTML += formatDunForDisplay('中', pHand.arranged_middle, pHand.middle_eval_result, pHand.user_id < 0 && !isGameTrialMode);
            resultHTML += formatDunForDisplay('尾', pHand.arranged_tail, pHand.tail_eval_result, pHand.user_id < 0 && !isGameTrialMode);

            const playerResult = gameState.settlement_results[pHand.user_id] || {};
            if (!isGameTrialMode) { // 真实游戏才显示积分变化
                resultHTML += `<p>本局得分: <strong style="color:${playerResult.score_change_points >= 0 ? 'green' : 'red'};">${playerResult.score_change_points > 0 ? '+' : ''}${playerResult.score_change_points || 0}</strong></p>`;
            } else { // 试玩模式显示输赢或道数
                 resultHTML += `<p>本局结果: ${playerResult.score_change_units > 0 ? '胜' : (playerResult.score_change_units < 0 ? '负' : '平')} (${playerResult.score_change_units || 0} 道)</p>`;
            }
            // ... (比牌详情，如果需要显示) ...
            resultHTML += `</div><hr>`;
        });
    } else {
        resultHTML = "<p>未能获取完整的结算信息。</p>";
    }
    settlementDetailsDiv.innerHTML = resultHTML;
    if (gameResultDisplayEl) gameResultDisplayEl.style.display = 'block';

    // 禁用提交按钮
    const submitBtn = document.getElementById('submitArrangementButton');
    if(submitBtn) submitBtn.disabled = true;

    // 通知 Game Manager 游戏结束 (无论试玩还是真实)
    if (isGameTrialMode && typeof window.trialGameEnded === 'function') {
        window.trialGameEnded(resultHTML); // 将HTML直接传给manager，或者只传数据
    } else if (!isGameTrialMode && typeof window.switchToRoomViewFromGameEnd === 'function') {
        window.switchToRoomViewFromGameEnd(); // 真实游戏结束，通知room.js
    }
}

// 修改 formatDunForDisplay 以便在结算时显示AI的牌
function formatDunForDisplay(dunName, cardsArray, evalResult, hideCardsForAI = false) {
    let html = `<div class="dun-result-display"><strong>${dunName}:</strong> `;
    if (cardsArray && cardsArray.length > 0) {
        if (hideCardsForAI) {
            html += `<em>(AI手牌)</em>`;
        } else {
            html += cardsArray.map(c => {
                // 假设 card 对象有 rank 和 suit, 或者 string 属性
                const cardString = c.string || `${c.rank}${c.suit}`;
                // 这里可以考虑用 createCardElement 创建一个小的不可拖拽的牌元素，但会更复杂
                // 简单起见，只显示文本
                return `<span class="card-text-small">${cardString}</span>`;
            }).join(' ');
        }
        if (evalResult && evalResult.type_name) {
            html += ` - <em class="type-name-small">${evalResult.type_name}</em>`;
        }
    } else { html += "<em>未摆</em>"; }
    html += `</div>`;
    return html;
}
// 需要为 .card-text-small 和 .type-name-small 添加CSS样式
