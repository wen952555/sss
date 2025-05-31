// frontend/js/game.js

// 全局变量 (game.js 作用域内)
let currentGameId = null;
let currentPlayer = null; // 当前登录的玩家对象 {id, nickname, ...}
let currentRoomData = null; // 当前房间的完整数据，包含玩家列表
let myInitialHand = [];     // 我最初的13张牌 (Card对象数组)
let myArrangedDuns = { head: [], middle: [], tail: [] }; // 我摆好的三墩牌 (Card对象数组)
let handEvaluatorFrontend = null; // (可选) 前端牌型评估器实例，用于即时显示牌型
let gamePollingInterval = null;

// 用于拖拽
let draggedCardElement = null;
let draggedCardData = null;    // 卡牌对象 {string, rank, suit, ...}
let sourceAreaName = null;

// 暴露给 room.js 的初始化函数
window.initializeGame = async function(gameId, userData, roomData) {
    console.log(`Initializing game ${gameId} for user ${userData.id}`);
    currentGameId = gameId;
    currentPlayer = userData;
    currentRoomData = roomData;

    // (可选) 初始化前端牌型评估器
    if (typeof CardUtils !== 'undefined' && typeof CardUtils.evaluateHandArray === 'function') {
        // handEvaluatorFrontend = CardUtils; // 假设CardUtils有类似后端的evaluateHand方法
    }

    // 清理之前的游戏状态 (如果适用)
    resetGameUI();

    // 获取游戏初始状态 (主要是我的手牌)
    await fetchAndDisplayInitialGameState();

    // 设置拖拽事件监听
    setupDragAndDrop();

    // 开始轮询游戏状态 (比牌、结算等)
    if (gamePollingInterval) clearInterval(gamePollingInterval);
    gamePollingInterval = setInterval(pollCurrentGameState, 2500); // 轮询频率可以调整
};


function resetGameUI() {
    document.getElementById('myHandDisplay').innerHTML = '';
    document.getElementById('headDun').innerHTML = '';
    document.getElementById('middleDun').innerHTML = '';
    document.getElementById('tailDun').innerHTML = '';
    document.getElementById('headDunType').textContent = '(-)';
    document.getElementById('middleDunType').textContent = '(-)';
    document.getElementById('tailDunType').textContent = '(-)';
    displayError('arrangementError', '');
    showMessage('gameMessageArea', '');
    document.getElementById('otherPlayersGameStatus').innerHTML = '<h4>其他玩家状态:</h4>';
    document.getElementById('settlementDetails').innerHTML = '';
    document.getElementById('gameResultArea').style.display = 'none';
    document.getElementById('submitArrangementButton').disabled = false;
    document.getElementById('submitArrangementButton').textContent = '提交摆牌';
}

async function fetchAndDisplayInitialGameState() {
    if (!currentGameId) return;
    try {
        showLoading('gameMessageArea');
        const gameState = await gameAPI.getGameState(currentGameId);
        showMessage('gameMessageArea', '获取手牌...', 'info');

        if (gameState && gameState.my_hand_data && gameState.my_hand_data.initial_cards) {
            myInitialHand = gameState.my_hand_data.initial_cards.map(cardStr => {
                // 后端返回的 initial_cards 是对象数组 {rank, suit, imageName...}
                // 或者如果只是字符串数组，则用 Card.fromString()
                return cardStr; // 直接使用后端返回的已处理好的对象
            });

            // 如果玩家已经提交过牌了 (例如刷新页面后重新进入)
            if (gameState.my_hand_data.arranged_head) {
                myArrangedDuns.head = gameState.my_hand_data.arranged_head.map(c => c);
                myArrangedDuns.middle = gameState.my_hand_data.arranged_middle.map(c => c);
                myArrangedDuns.tail = gameState.my_hand_data.arranged_tail.map(c => c);
                renderAllDuns(); // 渲染已摆好的牌
                document.getElementById('submitArrangementButton').disabled = true;
                document.getElementById('submitArrangementButton').textContent = '已提交';
                showMessage('gameMessageArea', '您已提交过摆牌。等待其他玩家...', 'info');
            } else {
                // 显示初始手牌到 myHandDisplay 区域
                const handDisplay = document.getElementById('myHandDisplay');
                clearElement(handDisplay);
                myInitialHand.forEach(cardData => {
                    const cardEl = createCardElement(cardData, true); // 可拖拽
                    handDisplay.appendChild(cardEl);
                });
                showMessage('gameMessageArea', '请将手牌拖拽到头、中、尾墩。', 'info');
            }
            updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);

        } else {
            showMessage('gameMessageArea', '无法获取您的手牌信息。', 'error');
        }
    } catch (error) {
        showMessage('gameMessageArea', `获取游戏初始状态失败: ${error.message}`, 'error');
    } finally {
        showLoading('gameMessageArea', false);
    }
}

function setupDragAndDrop() {
    const droppableAreas = document.querySelectorAll('.droppable-area');
    const allCardContainers = [ // 用于查找卡牌数据源
        document.getElementById('myHandDisplay'),
        document.getElementById('headDun'),
        document.getElementById('middleDun'),
        document.getElementById('tailDun')
    ];


    // 卡牌拖拽开始
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('card')) {
            draggedCardElement = e.target;
            const cardId = draggedCardElement.dataset.cardId; // e.g., "AS"

            // 从 myInitialHand 或 myArrangedDuns 中找到对应的卡牌数据
            draggedCardData = findCardDataById(cardId);
            sourceAreaName = draggedCardElement.parentElement.dataset.areaName;

            if (draggedCardData) {
                e.dataTransfer.setData('text/plain', cardId);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => { // 让拖拽的元素视觉上“消失”或改变样式
                    draggedCardElement.classList.add('dragging');
                }, 0);
            } else {
                console.warn("Could not find card data for ID:", cardId);
                e.preventDefault();
            }
        }
    });

    // 卡牌拖拽结束
    document.addEventListener('dragend', (e) => {
        if (draggedCardElement) {
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
        draggedCardData = null;
        sourceAreaName = null;
        droppableAreas.forEach(area => area.classList.remove('drag-over'));
    });

    droppableAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault(); // 必须, 允许drop
            const targetAreaName = area.dataset.areaName;
            const maxCards = parseInt(area.dataset.maxCards) || 13; // 手牌区默认13
            const currentCardsInTarget = myArrangedDuns[targetAreaName]?.length || (targetAreaName === 'hand' ? myInitialHand.filter(c => !isCardPlaced(c)).length : 0) ;

            if (draggedCardData && currentCardsInTarget < maxCards) {
                e.dataTransfer.dropEffect = 'move';
                area.classList.add('drag-over');
            } else {
                e.dataTransfer.dropEffect = 'none';
                area.classList.remove('drag-over'); // 如果之前有，移除
            }
        });
        area.addEventListener('dragenter', (e) => {
            e.preventDefault();
             // classList.add('drag-over') 在 dragover 中处理
        });
        area.addEventListener('dragleave', (e) => {
            area.classList.remove('drag-over');
        });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            const targetAreaName = area.dataset.areaName;
            const cardId = e.dataTransfer.getData('text/plain');

            if (!draggedCardData || draggedCardData.string !== cardId || !sourceAreaName) {
                console.error("Drop error: Mismatch or missing dragged card data.");
                return;
            }

            moveCardData(draggedCardData, sourceAreaName, targetAreaName);
            renderAllDunsAndHand(); // 重新渲染所有牌区
        });
    });
}

function findCardDataById(cardId) {
    let card = myArrangedDuns.head.find(c => c.string === cardId);
    if (card) return card;
    card = myArrangedDuns.middle.find(c => c.string === cardId);
    if (card) return card;
    card = myArrangedDuns.tail.find(c => c.string === cardId);
    if (card) return card;
    // 从初始手牌中找 (如果它还在手牌区)
    return myInitialHand.find(c => c.string === cardId && !isCardPlaced(c));
}

function isCardPlaced(cardData) { // 检查某张牌是否已在某个墩位
    return myArrangedDuns.head.some(c=>c.string === cardData.string) ||
           myArrangedDuns.middle.some(c=>c.string === cardData.string) ||
           myArrangedDuns.tail.some(c=>c.string === cardData.string);
}


function moveCardData(cardData, fromAreaName, toAreaName) {
    if (fromAreaName === toAreaName) return; // 在同一区域内移动不改变数据模型 (除非实现排序)

    // 1. 从源区域数据模型中移除
    if (fromAreaName === 'hand') {
        // 对于手牌区，我们不需要显式移除，因为它是基于 myInitialHand 减去已摆放的牌来渲染的
    } else if (myArrangedDuns[fromAreaName]) {
        myArrangedDuns[fromAreaName] = myArrangedDuns[fromAreaName].filter(c => c.string !== cardData.string);
    }

    // 2. 添加到目标区域数据模型
    const targetDunArray = myArrangedDuns[toAreaName];
    const maxCardsInTarget = parseInt(document.getElementById(toAreaName + 'Dun')?.dataset.maxCards || (toAreaName === 'hand' ? 13 : 0));

    if (toAreaName === 'hand') {
        // 如果移回手牌区，确保它不在任何墩里即可，myInitialHand是固定的
        // 这里实际是“取消摆放”
    } else if (targetDunArray && targetDunArray.length < maxCardsInTarget) {
        targetDunArray.push(cardData);
    } else if (targetDunArray) {
        // 目标墩已满，则将牌放回“手牌区”(即从所有墩中移除)
        // 更好的做法是阻止这次drop，这应在dragover中处理
        console.warn(`Target dun ${toAreaName} is full. Card ${cardData.string} not placed.`);
        // 确保它从源墩移除 (如果它之前在某个墩)
        if(myArrangedDuns[fromAreaName]) {
            myArrangedDuns[fromAreaName] = myArrangedDuns[fromAreaName].filter(c => c.string !== cardData.string);
        }
        return; // 不添加到目标墩
    }
    updateAllDunTypeDisplays();
}

function renderAllDunsAndHand() {
    // 渲染手牌区 (myInitialHand 中未被摆放到任何墩的牌)
    const handDisplay = document.getElementById('myHandDisplay');
    clearElement(handDisplay);
    const unplacedCards = myInitialHand.filter(card => !isCardPlaced(card));
    unplacedCards.forEach(cardData => {
        handDisplay.appendChild(createCardElement(cardData, true));
    });

    // 渲染三墩
    renderDun('headDun', myArrangedDuns.head);
    renderDun('middleDun', myArrangedDuns.middle);
    renderDun('tailDun', myArrangedDuns.tail);
}

function renderDun(dunElementId, cardArray) {
    const dunElement = document.getElementById(dunElementId);
    clearElement(dunElement);
    cardArray.forEach(cardData => {
        dunElement.appendChild(createCardElement(cardData, true)); // 墩内牌也可拖拽
    });
}

function updateAllDunTypeDisplays() {
    // 使用 CardUtils.js (如果存在且功能完善) 来前端评估牌型并显示
    // 这里的评估只是为了给用户参考，最终以服务器为准
    if (typeof CardUtils !== 'undefined' && typeof CardUtils.evaluateHandArray === 'function') {
        updateDunTypeDisplay('headDunType', CardUtils.evaluateHandArray(myArrangedDuns.head.map(c => c))); // CardUtils需要能处理后端返回的Card对象结构
        updateDunTypeDisplay('middleDunType', CardUtils.evaluateHandArray(myArrangedDuns.middle.map(c => c)));
        updateDunTypeDisplay('tailDunType', CardUtils.evaluateHandArray(myArrangedDuns.tail.map(c => c)));
    } else { // 简单显示牌数
        document.getElementById('headDunType').textContent = `(${myArrangedDuns.head.length}/3)`;
        document.getElementById('middleDunType').textContent = `(${myArrangedDuns.middle.length}/5)`;
        document.getElementById('tailDunType').textContent = `(${myArrangedDuns.tail.length}/5)`;
    }
}
function updateDunTypeDisplay(elementId, evaluationResult) {
    const el = document.getElementById(elementId);
    if (el && evaluationResult) {
        el.textContent = `(${evaluationResult.name || '未知'})`;
    } else if (el) {
         // 如果牌数不足，显示牌数
        const dunKey = elementId.replace('DunType','');
        const currentLength = myArrangedDuns[dunKey]?.length || 0;
        const maxLength = dunKey === 'head' ? 3 : 5;
        el.textContent = `(${currentLength}/${maxLength})`;
    }
}


// 提交摆牌
document.getElementById('submitArrangementButton')?.addEventListener('click', async () => {
    displayError('arrangementError', '');
    if (myArrangedDuns.head.length !== 3 || myArrangedDuns.middle.length !== 5 || myArrangedDuns.tail.length !== 5) {
        displayError('arrangementError', '请确保头、中、尾墩的牌数正确 (3-5-5)。');
        return;
    }
    // 确保所有初始手牌都已摆放
    const totalPlaced = myArrangedDuns.head.length + myArrangedDuns.middle.length + myArrangedDuns.tail.length;
    if (totalPlaced !== 13) {
        displayError('arrangementError', '您还有手牌未摆放。');
        return;
    }

    const payload = {
        game_id: currentGameId,
        head: myArrangedDuns.head.map(c => c.string), // 发送牌的字符串表示
        middle: myArrangedDuns.middle.map(c => c.string),
        tail: myArrangedDuns.tail.map(c => c.string),
    };

    try {
        document.getElementById('submitArrangementButton').disabled = true;
        document.getElementById('submitArrangementButton').textContent = '提交中...';
        showMessage('gameMessageArea', '正在提交您的摆牌...', 'info');

        const response = await gameAPI.submitArrangement(payload);
        showMessage('gameMessageArea', `摆牌提交成功! ${response.is_daoshui ? '<strong style="color:red;">倒水!</strong>' : '未倒水。'} ${response.special_type ? `特殊牌型: ${response.special_type}` : ''}`, 'success');
        document.getElementById('submitArrangementButton').textContent = '已提交';
        // 提交成功后，等待其他玩家或结算 (通过轮询 pollCurrentGameState 实现)
    } catch (error) {
        displayError('arrangementError', error.message || '提交摆牌失败。');
        document.getElementById('submitArrangementButton').disabled = false;
        document.getElementById('submitArrangementButton').textContent = '提交摆牌';
    }
});

// AI辅助摆牌
document.getElementById('aiArrangeButton')?.addEventListener('click', async () => {
    displayError('arrangementError', '');
    showMessage('gameMessageArea', '请求AI辅助摆牌...', 'info');
    try {
        const response = await gameAPI.aiArrangeMyCards({ game_id: currentGameId });
        if (response && response.arrangement) {
            // 将AI的摆牌填充到 myArrangedDuns (需要将string转回Card对象)
            myArrangedDuns.head = response.arrangement.head.map(s => myInitialHand.find(c=>c.string===s) || Card.fromString(s)); // 优先从手牌找对象
            myArrangedDuns.middle = response.arrangement.middle.map(s => myInitialHand.find(c=>c.string===s) || Card.fromString(s));
            myArrangedDuns.tail = response.arrangement.tail.map(s => myInitialHand.find(c=>c.string===s) || Card.fromString(s));
            renderAllDunsAndHand(); // 重新渲染
            updateAllDunTypeDisplays(); // 更新牌型显示
            showMessage('gameMessageArea', `AI摆牌建议已应用。${response.is_daoshui ? ' (AI可能也倒水了!)' : ''} ${response.special_type ? `特殊牌型: ${response.special_type}` : ''}`, 'success');
        } else {
            showMessage('gameMessageArea', 'AI未能提供摆牌建议。', 'warn');
        }
    } catch (error) {
        showMessage('gameMessageArea', `AI辅助摆牌失败: ${error.message}`, 'error');
    }
});

// 轮询当前游戏状态 (由 room.js 启动，或在此处管理)
window.pollCurrentGameState = async function() {
    if (!currentGameId || document.getElementById('gameArea').style.display === 'none') {
        // 如果游戏界面未显示，或没有当前游戏ID，则不轮询
        // clearInterval(gamePollingInterval); gamePollingInterval = null; // 可以考虑停止
        return;
    }

    try {
        const gameState = await gameAPI.getGameState(currentGameId);

        updateOtherPlayersStatus(gameState.other_players_status, gameState.total_players_in_game);

        if (gameState.game_status === 'finished' || gameState.game_status === 'comparing') {
            clearInterval(gamePollingInterval);
            gamePollingInterval = null;
            console.log("Game finished or comparing, stopping game poll. Results:", gameState.settlement_results);
            displayGameResults(gameState);
        } else if (gameState.all_players_submitted) {
            showMessage('gameMessageArea', '所有玩家已提交，等待服务器结算...', 'info');
            // 服务器应该会自动进入结算，并在下次轮询返回 finished 状态
        } else {
            // 游戏仍在进行中，玩家可能还在摆牌
            // 如果当前玩家已提交，可以显示等待信息
            const myData = gameState.my_hand_data;
            if (myData && myData.submitted_at && document.getElementById('submitArrangementButton').textContent !== '已提交') {
                 document.getElementById('submitArrangementButton').disabled = true;
                 document.getElementById('submitArrangementButton').textContent = '已提交';
                 showMessage('gameMessageArea', '您已提交，等待其他玩家...', 'info');
            }
        }
    } catch (error) {
        console.error("Error polling game state:", error);
        showMessage('gameMessageArea', `轮询游戏状态出错: ${error.message}`, 'error');
        // 根据错误类型决定是否停止轮询
        if (error.status === 401 || error.status === 403 || error.status === 404) {
            clearInterval(gamePollingInterval);
            gamePollingInterval = null;
        }
    }
};

function updateOtherPlayersStatus(otherPlayers, totalPlayersInGame) {
    const statusDiv = document.getElementById('otherPlayersGameStatus');
    let html = `<h4>其他玩家状态 (${otherPlayers.length}/${totalPlayersInGame-1} 位已显示):</h4><ul>`;
    if (currentRoomData && currentRoomData.players) {
        currentRoomData.players.forEach(roomPlayer => {
            if (roomPlayer.user_id === currentPlayer.id) return; // 跳过自己

            const gameStatus = otherPlayers.find(op => op.user_id === roomPlayer.user_id);
            html += `<li>${roomPlayer.nickname}: ${gameStatus ? (gameStatus.has_submitted ? '已提交' : '摆牌中...') : '等待中...'}</li>`;
        });
    }
    html += '</ul>';
    statusDiv.innerHTML = html;
}

function displayGameResults(gameState) {
    document.getElementById('gameArea').style.display = 'none'; // 隐藏游戏操作区
    const resultArea = document.getElementById('gameResultArea');
    const settlementDetailsDiv = document.getElementById('settlementDetails');
    clearElement(settlementDetailsDiv);

    let resultHTML = '<h3>本局结算详情</h3>';

    if (gameState.all_player_final_hands && gameState.settlement_results) {
        gameState.all_player_final_hands.forEach(playerHand => {
            const playerResult = gameState.settlement_results[playerHand.user_id] || {}; // 从结算结果中找对应玩家
            resultHTML += `<div class="player-result-summary">`;
            resultHTML += `<h4>${playerHand.nickname} (座位 ${playerHand.seat_number})</h4>`;
            if (playerHand.is_daoshui) {
                resultHTML += `<p style="color:red;"><strong>倒水!</strong></p>`;
            }
            if (playerHand.special_card_type_name) {
                resultHTML += `<p>特殊牌型: <strong>${playerHand.special_card_type_name}</strong></p>`;
            }
            // 显示三墩牌和牌型
            resultHTML += formatDunForDisplay('头墩', playerHand.arranged_head, playerHand.head_eval_result);
            resultHTML += formatDunForDisplay('中墩', playerHand.arranged_middle, playerHand.middle_eval_result);
            resultHTML += formatDunForDisplay('尾墩', playerHand.arranged_tail, playerHand.tail_eval_result);

            resultHTML += `<p>本局得分: <strong style="color:${playerResult.score_change_points >= 0 ? 'green' : 'red'};">${playerResult.score_change_points > 0 ? '+' : ''}${playerResult.score_change_points || 0}</strong> (道数: ${playerResult.score_change_units || 0})</p>`;

            // 显示详细比牌 (如果后端提供了)
            if (playerResult.comparisons) {
                resultHTML += '<h5>比牌详情:</h5><ul>';
                for (const vsUserId in playerResult.comparisons) {
                    const opponentNickname = gameState.all_player_final_hands.find(p=>p.user_id == vsUserId.replace('vs_',''))?.nickname || '对手';
                    const comp = playerResult.comparisons[vsUserId];
                    resultHTML += `<li>对 ${opponentNickname}: 头(${comp.head}) 中(${comp.middle}) 尾(${comp.tail}) = 总 ${comp.total_raw_score} ${comp.is_daqiang ? '<strong>打枪!</strong>':''}</li>`;
                }
                resultHTML += '</ul>';
            }
            resultHTML += `</div><hr>`;
        });
    } else {
        resultHTML += "<p>未能获取详细结算信息。</p>";
    }

    settlementDetailsDiv.innerHTML = resultHTML;
    resultArea.style.display = 'block';

    // 控制“再来一局”按钮的显示 (只有房主可见)
    const nextRoundButton = document.getElementById('nextRoundButton');
    if (gameState.can_restart_game && currentPlayer.id === currentRoomData.owner_id) {
        nextRoundButton.style.display = 'inline-block';
        nextRoundButton.onclick = async () => { // 重新开始游戏
            try {
                showMessage('gameMessageArea', '房主正在重新开始游戏...', 'info');
                const response = await roomsAPI.startGame({ room_id: currentRoomId }); // 调用开始游戏API
                // 成功后，页面应该会由 room.js 的逻辑或重新加载来处理
                // 这里简单地让 room.js 接管
                resultArea.style.display = 'none';
                window.switchToRoomView(); // 切换回房间等待界面 (room.js)
                // room.js 中的轮询会检测到新游戏并调用 initializeGame
            } catch (error) {
                showMessage('gameMessageArea', `重新开始游戏失败: ${error.message}`, 'error');
            }
        };
    } else {
        nextRoundButton.style.display = 'none';
    }

    document.getElementById('backToLobbyButton').onclick = () => {
        window.location.href = 'lobby.html';
    };
}

function formatDunForDisplay(dunName, cardsArray, evalResult) {
    let html = `<p><strong>${dunName}:</strong> `;
    if (cardsArray && cardsArray.length > 0) {
        html += cardsArray.map(c => `${c.rank}${c.suit}`).join(' '); // 简单显示牌面
        if (evalResult && evalResult.type_name) {
            html += ` - <em>${evalResult.type_name}</em>`;
        }
    } else {
        html += "<em>未摆</em>";
    }
    html += `</p>`;
    return html;
}

// 在 room.js 中已经定义了 switchToGameView, 这里是 game.js 内部逻辑，当游戏结束后，
// 可以调用 room.js 中的方法切换回房间视图
document.getElementById('backToLobbyButtonFromGame')?.addEventListener('click', () => { // 如果有这个按钮
     if (gamePollingInterval) clearInterval(gamePollingInterval);
     window.location.href = 'lobby.html';
});
