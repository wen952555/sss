document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const numPlayersSelect = document.getElementById('numPlayersSelect');
    const newGameBtn = document.getElementById('newGameBtn');
    const getStateBtn = document.getElementById('getStateBtn'); // Can be removed if not manually used
    const gameBoard = document.getElementById('gameBoard');
    const myPlayerIdDisplay = document.getElementById('myPlayerId');
    const myHandArea = document.getElementById('myHandArea');
    const frontHandArea = document.getElementById('frontHandArea');
    const middleHandArea = document.getElementById('middleHandArea');
    const backHandArea = document.getElementById('backHandArea');
    const submitHandBtn = document.getElementById('submitHandBtn');
    const resetSelectionBtn = document.getElementById('resetSelectionBtn');
    const playerInfoArea = document.querySelector('.player-info-area');
    const otherPlayersView = document.querySelector('.other-players-view');
    const gameMessages = document.getElementById('gameMessages');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    // --- Game State Variables ---
    const API_BASE_URL = 'https://9526.ip-ddns.com/backend/api/game.php'; // 你的后端URL
    let currentGameState = null;
    let myPlayerId = null; // 会从后端获取或预设
    let selectedCardsForPlacement = { front: [], middle: [], back: [] };
    let handCardElements = {}; // Store DOM elements of hand cards for easy manipulation

    // --- Helper Functions ---
    function showLoading(show) { loadingIndicator.classList.toggle('hidden', !show); }
    function showPermanentError(message) {
        errorDisplay.textContent = message;
        errorDisplay.classList.remove('hidden');
        setTimeout(() => errorDisplay.classList.add('hidden'), 5000);
    }
    function updateGameMessage(message, isError = false) {
        gameMessages.textContent = message;
        gameMessages.className = 'game-messages'; // Reset classes
        if (isError) gameMessages.classList.add('error');
        else if (!message) gameMessages.classList.add('hidden');
    }

    function getCardImagePath(cardImageString) {
        if (!cardImageString || typeof cardImageString !== 'string') {
            return 'images/cards/red_joker.svg'; // Default card back or error image
        }
        // 假设牌背图片名为 card_back.svg (或你实际使用的)
        if (cardImageString === 'card_back') {
            return `images/cards/red_joker.svg`; // 确保你有这张牌背图片
        }
        return `images/cards/${cardImageString.toLowerCase()}.svg`;
    }

    function createCardElement(cardStr, isInteractive = true) {
        const cardImg = document.createElement('img');
        cardImg.classList.add('card-image');
        cardImg.src = getCardImagePath(cardStr);
        cardImg.alt = cardStr.replace('_', ' ');
        cardImg.title = cardStr.replace('_', ' ');
        cardImg.dataset.card = cardStr; // Store card string for identification

        if (isInteractive) {
            cardImg.addEventListener('click', handleCardClick);
        } else {
            cardImg.classList.add('disabled');
        }
        return cardImg;
    }

    // --- Card Selection Logic (Basic Click-to-Move) ---
    let selectedCardElement = null; // For click-based selection

    function handleCardClick(event) {
        const clickedCardEl = event.target;
        if (clickedCardEl.classList.contains('disabled')) return;

        const parentAreaType = clickedCardEl.parentElement.dataset.areaType;

        if (selectedCardElement === clickedCardEl) { // Clicked the same card again: deselect
            selectedCardElement.classList.remove('selected');
            selectedCardElement = null;
        } else if (selectedCardElement) { // A card is already selected, this is a target area click (indirectly)
            // This logic is now handled by clicking the target area directly
        } else { // No card selected, so select this one
            selectedCardElement = clickedCardEl;
            selectedCardElement.classList.add('selected');
        }
    }

    function handleDroppableAreaClick(event) {
        const targetArea = event.currentTarget; // The div.droppable-area
        const targetAreaType = targetArea.dataset.areaType; // 'hand', 'front', 'middle', 'back'

        if (!selectedCardElement) { // No card selected to move
            // If clicking on a card within a placement area, select it to move it back to hand
            if (event.target.classList.contains('card-image') && targetAreaType !== 'hand') {
                 selectedCardElement = event.target; // Select card in墩位
                 selectedCardElement.classList.add('selected');
                 // Now, the next click on myHandArea will move it back
            }
            return;
        }

        const cardStrToMove = selectedCardElement.dataset.card;
        const sourceAreaType = selectedCardElement.parentElement.dataset.areaType;

        // Moving card
        if (targetAreaType === 'hand') { // Moving back to hand
            if (sourceAreaType !== 'hand') {
                removeCardFromPlacement(cardStrToMove, sourceAreaType);
                addCardToMyHandDOM(cardStrToMove); // Add back to visual hand
            }
        } else { // Moving to a placement area (front, middle, back)
            const maxCards = parseInt(targetArea.dataset.maxCards) || Infinity;
            if (selectedCardsForPlacement[targetAreaType].length < maxCards) {
                if (sourceAreaType === 'hand') {
                    removeCardFromMyHandDOM(cardStrToMove);
                } else { // Moving from another placement area
                    removeCardFromPlacement(cardStrToMove, sourceAreaType);
                }
                addCardToPlacement(cardStrToMove, targetAreaType, selectedCardElement.cloneNode(true)); // Pass cloned element
            } else {
                showPermanentError(`${targetArea.previousElementSibling.textContent.split('(')[0].trim()} 已满!`);
            }
        }

        selectedCardElement.classList.remove('selected');
        selectedCardElement = null;
        updatePlacementCounts();
        checkIfReadyToSubmit();
    }

    document.querySelectorAll('.droppable-area').forEach(area => {
        area.addEventListener('click', handleDroppableAreaClick);
    });

    function addCardToMyHandDOM(cardStr) {
        if (!handCardElements[cardStr]) { // Ensure card element exists
            handCardElements[cardStr] = createCardElement(cardStr, true);
        }
        myHandArea.appendChild(handCardElements[cardStr]);
        handCardElements[cardStr].classList.remove('disabled'); // Make it interactive
    }
    function removeCardFromMyHandDOM(cardStr) {
        if (handCardElements[cardStr] && handCardElements[cardStr].parentElement === myHandArea) {
            // myHandArea.removeChild(handCardElements[cardStr]); // Don't remove, just disable or hide
            handCardElements[cardStr].classList.add('disabled'); // Visually indicate it's placed
        }
    }

    function addCardToPlacement(cardStr, areaType, cardElement) {
        selectedCardsForPlacement[areaType].push(cardStr);
        const targetDOMArea = document.getElementById(`${areaType}HandArea`);
        targetDOMArea.appendChild(cardElement); // Append the actual (cloned) element
        cardElement.classList.remove('disabled'); // Ensure it's interactive if moved again
    }

    function removeCardFromPlacement(cardStr, areaType) {
        const areaCards = selectedCardsForPlacement[areaType];
        const index = areaCards.indexOf(cardStr);
        if (index > -1) {
            areaCards.splice(index, 1);
        }
        // Remove from DOM
        const targetDOMArea = document.getElementById(`${areaType}HandArea`);
        const cardToRemove = targetDOMArea.querySelector(`.card-image[data-card="${cardStr}"]`);
        if (cardToRemove) {
            targetDOMArea.removeChild(cardToRemove);
        }
    }

    function updatePlacementCounts() {
        ['front', 'middle', 'back'].forEach(areaType => {
            const area = document.getElementById(`${areaType}HandArea`);
            const countSpan = area.parentElement.querySelector('.card-count');
            const maxCards = parseInt(area.dataset.maxCards);
            countSpan.textContent = `(${selectedCardsForPlacement[areaType].length}/${maxCards})`;
        });
    }
    function checkIfReadyToSubmit(){
        const totalPlaced = selectedCardsForPlacement.front.length +
                            selectedCardsForPlacement.middle.length +
                            selectedCardsForPlacement.back.length;
        const ready = selectedCardsForPlacement.front.length === 3 &&
                      selectedCardsForPlacement.middle.length === 5 &&
                      selectedCardsForPlacement.back.length === 5;
        submitHandBtn.classList.toggle('hidden', !ready);
        resetSelectionBtn.classList.toggle('hidden', totalPlaced === 0);
    }


    // --- API Interaction ---
    async function fetchAPI(action, params = {}, method = 'GET') {
        showLoading(true);
        let url = `${API_BASE_URL}?action=${action}`;
        const options = { method };

        if (method === 'GET' && Object.keys(params).length > 0) {
            url += '&' + new URLSearchParams(params).toString();
        } else if (method === 'POST') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(params);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`服务器错误 ${response.status}: ${errorText || response.statusText}`);
            }
            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.message || '后端返回操作失败');
            }
            return data;
        } catch (error) {
            console.error(`API Error (${action}):`, error);
            showPermanentError(`操作失败: ${error.message}`);
            throw error; // Re-throw for caller to handle if needed
        } finally {
            showLoading(false);
        }
    }

    async function startNewGame() {
        try {
            const numPlayers = numPlayersSelect.value;
            const data = await fetchAPI('new_game', { players: numPlayers });
            currentGameState = data.gameState;
            // Assuming 'player1' is always "me" for now, or backend tells us our ID
            // In a real multi-user system, the backend would assign a session-based player ID.
            // For this example, let's try to find a hand with cards.
            myPlayerId = Object.keys(currentGameState.players).find(pid => currentGameState.players[pid].my_hand_str && currentGameState.players[pid].my_hand_str.length > 0) || 'player1';

            renderFullGameBoard(currentGameState);
            gameBoard.classList.remove('hidden');
            submitHandBtn.classList.add('hidden'); // Hide until cards are placed
            resetSelectionBtn.classList.add('hidden');
            updateGameMessage('游戏开始！请摆牌。');
        } catch (error) {
            // Error already shown by fetchAPI
        }
    }

    async function submitMyHand() {
        if (!myPlayerId) {
            showPermanentError("无法确定您的玩家ID。");
            return;
        }
        if (selectedCardsForPlacement.front.length !== 3 ||
            selectedCardsForPlacement.middle.length !== 5 ||
            selectedCardsForPlacement.back.length !== 5) {
            showPermanentError("请确保所有墩位牌数正确。");
            return;
        }

        const payload = {
            playerId: myPlayerId,
            front: selectedCardsForPlacement.front,
            middle: selectedCardsForPlacement.middle,
            back: selectedCardsForPlacement.back
        };

        try {
            const data = await fetchAPI('submit_hand', payload, 'POST');
            currentGameState = data.gameState; // Update with new state from server
            renderFullGameBoard(currentGameState); // Re-render based on potentially updated state
            updateGameMessage(data.message || '牌组已提交！等待其他玩家...', data.status === 'error');
            if (data.status === 'success') {
                submitHandBtn.classList.add('hidden');
                resetSelectionBtn.classList.add('hidden');
                 // Disable further card interaction for my hand
                myHandArea.innerHTML = '<p><i>牌已提交</i></p>';
                [frontHandArea, middleHandArea, backHandArea].forEach(area => {
                    area.querySelectorAll('.card-image').forEach(c => c.classList.add('disabled'));
                    area.removeEventListener('click', handleDroppableAreaClick); // Stop interaction
                });

            }
        } catch (error) {
            // Error already shown by fetchAPI, but server might return specific validation messages
            if(error.message && error.message.includes("相公")) {
                // Keep UI active for correction if it's a misplay error that allows retry
                // Or, backend might automatically mark as "dao_san" and lock submission.
                // This depends on game rules.
            }
        }
    }

    function resetCardSelection() {
        // Clear placement areas
        selectedCardsForPlacement = { front: [], middle: [], back: [] };
        [frontHandArea, middleHandArea, backHandArea].forEach(area => area.innerHTML = '');
        updatePlacementCounts();

        // Re-render my hand from original state
        myHandArea.innerHTML = ''; // Clear current hand (might have disabled cards)
        handCardElements = {}; // Reset stored elements
        if (currentGameState && currentGameState.players[myPlayerId] && currentGameState.players[myPlayerId].my_hand_str) {
            currentGameState.players[myPlayerId].my_hand_str.forEach(cardStr => {
                const cardEl = createCardElement(cardStr, true);
                handCardElements[cardStr] = cardEl;
                myHandArea.appendChild(cardEl);
            });
        }
        checkIfReadyToSubmit();
    }


    // --- Rendering Functions ---
    function renderFullGameBoard(gameState) {
        if (!gameState || !gameState.players) {
            console.error("无效的游戏状态数据", gameState);
            showPermanentError("无法加载游戏数据。");
            return;
        }
        myPlayerIdDisplay.textContent = myPlayerId || '未知';

        // Render player info (scores, status)
        playerInfoArea.innerHTML = '';
        Object.values(gameState.players).forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-status');
            playerDiv.id = `player-info-${player.id}`;

            let statusDotClass = 'status-waiting';
            if (player.is_dao_san) statusDotClass = 'status-daosan';
            else if (player.has_submitted) statusDotClass = 'status-submitted';

            playerDiv.innerHTML = `
                <h4><span class="status-dot ${statusDotClass}"></span> 玩家: ${player.id}</h4>
                <p>总分: <span class="score">${player.score}</span></p>
                <p>本局: <span class="${player.round_score_display && player.round_score_display.startsWith('+') ? 'round-score-positive' : (player.round_score_display && player.round_score_display.startsWith('-') ? 'round-score-negative' : '')}">${player.round_score_display || '0'}</span></p>
                ${player.special_hand_display && player.special_hand_display !== '无特殊牌型' ? `<p class="special-hand">${player.special_hand_display}</p>` : ''}
            `;
            playerInfoArea.appendChild(playerDiv);
        });

        // Render my hand (if not submitted yet)
        const myPlayerData = gameState.players[myPlayerId];
        if (myPlayerData && !myPlayerData.has_submitted) {
            myHandArea.innerHTML = ''; // Clear before re-rendering
            handCardElements = {};
            if (myPlayerData.my_hand_str) {
                myPlayerData.my_hand_str.forEach(cardStr => {
                    const cardEl = createCardElement(cardStr, true);
                    handCardElements[cardStr] = cardEl;
                    myHandArea.appendChild(cardEl);
                });
            }
             // Restore placed cards if any (e.g. after a state refresh but before submission)
            Object.keys(selectedCardsForPlacement).forEach(areaType => {
                const areaDOM = document.getElementById(`${areaType}HandArea`);
                areaDOM.innerHTML = ''; // Clear first
                selectedCardsForPlacement[areaType].forEach(cardStr => {
                    const cardEl = createCardElement(cardStr, true); // Make them clickable again
                    areaDOM.appendChild(cardEl);
                    if(handCardElements[cardStr]) handCardElements[cardStr].classList.add('disabled');
                });
            });
            updatePlacementCounts();
            checkIfReadyToSubmit();

        } else if (myPlayerData && myPlayerData.has_submitted) {
            // My hand is submitted, show the submitted cards in their final place.
            // (This might be redundant if submitMyHand already locks it, but good for re-render)
            myHandArea.innerHTML = '<p><i>您的牌已提交</i></p>';
            renderPlayerSubmittedCards(myPlayerId, myPlayerData.submitted_cards_display, document.querySelector('.my-player-area .played-hands-area'), true);
        }


        // Render other players' boards
        otherPlayersView.innerHTML = '<h3>其他玩家</h3>';
        Object.values(gameState.players).forEach(player => {
            if (player.id === myPlayerId) return;

            const otherPlayerBoard = document.createElement('div');
            otherPlayerBoard.classList.add('other-player-board');
            otherPlayerBoard.id = `other-player-${player.id}`;
            otherPlayerBoard.innerHTML = `<h4>玩家: ${player.id} (${player.has_submitted ? (player.is_dao_san ? '已相公' : '已出牌') : '等待中'})</h4>`;

            const playedArea = document.createElement('div');
            playedArea.classList.add('played-hands-area');
            otherPlayerBoard.appendChild(playedArea);

            if (player.has_submitted && player.submitted_cards_display) {
                renderPlayerSubmittedCards(player.id, player.submitted_cards_display, playedArea, false);
            } else { // Show card backs or placeholder
                playedArea.innerHTML = `
                    <div class="played-hand-segment"><h4>头墩</h4><div class="hand-segment">${renderCardBacks(3)}</div></div>
                    <div class="played-hand-segment"><h4>中墩</h4><div class="hand-segment">${renderCardBacks(5)}</div></div>
                    <div class="played-hand-segment"><h4>尾墩</h4><div class="hand-segment">${renderCardBacks(5)}</div></div>
                `;
            }
             // Display comparison details if available
            if(player.comparison_details_display && gameState.game_info.round_state === 'finished') {
                const detailsDiv = document.createElement('div');
                detailsDiv.classList.add('comparison-details');
                let detailsHtml = `<strong>与 ${player.id} 的比牌结果:</strong><br/>`;
                if (myPlayerData && myPlayerData.comparison_details_display && myPlayerData.comparison_details_display[player.id]) {
                    const vsData = myPlayerData.comparison_details_display[player.id];
                    detailsHtml += `${vsData.result || ''}<br/>`;
                    if(vsData.segments) {
                        detailsHtml += `头: ${vsData.segments.front}, 中: ${vsData.segments.middle}, 尾: ${vsData.segments.back}<br/>`;
                    }
                    detailsHtml += `得分变化: ${vsData.score_change_vs_player > 0 ? '+' : ''}${vsData.score_change_vs_player}`;
                } else {
                    detailsHtml += "等待结算...";
                }
                detailsDiv.innerHTML = detailsHtml;
                otherPlayerBoard.appendChild(detailsDiv);
            }

            otherPlayersView.appendChild(otherPlayerBoard);
        });

        // Game status messages
        if (gameState.game_info && gameState.game_info.round_state === 'finished') {
            updateGameMessage('本局结束！点击“开始新游戏”进行下一局。');
            // Show detailed scores and comparisons on player cards
        } else if (myPlayerData && myPlayerData.has_submitted && !gameState.game_info.all_submitted) {
            updateGameMessage('等待其他玩家出牌...');
        } else if (myPlayerData && !myPlayerData.has_submitted) {
             updateGameMessage('请摆牌并提交。');
        }
    }

    function renderCardBacks(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `<img src="${getCardImagePath('card_back')}" alt="牌背" class="card-image disabled">`;
        }
        return html;
    }

    function renderPlayerSubmittedCards(pId, submittedCards, containerElement, isMyCards) {
        containerElement.innerHTML = ''; // Clear previous
        ['front', 'middle', 'back'].forEach(segmentKey => {
            const segmentDiv = document.createElement('div');
            segmentDiv.classList.add('played-hand-segment');
            const title = segmentKey === 'front' ? '头墩' : (segmentKey === 'middle' ? '中墩' : '尾墩');
            segmentDiv.innerHTML = `<h4>${title} (${submittedCards[segmentKey].length}张)</h4>`;
            const handSegmentDiv = document.createElement('div');
            handSegmentDiv.classList.add('hand-segment');
            handSegmentDiv.id = `${pId}-${segmentKey}HandArea`; // Unique ID for each player's segment

            if (submittedCards[segmentKey] && submittedCards[segmentKey].length > 0) {
                submittedCards[segmentKey].forEach(cardStr => {
                    // For my own submitted cards, they should not be interactive anymore for placement
                    // For other players' cards, they are never interactive for placement
                    handSegmentDiv.appendChild(createCardElement(cardStr, false));
                });
            }
            segmentDiv.appendChild(handSegmentDiv);
            containerElement.appendChild(segmentDiv);
        });
    }


    // --- Event Listeners ---
    newGameBtn.addEventListener('click', startNewGame);
    submitHandBtn.addEventListener('click', submitMyHand);
    resetSelectionBtn.addEventListener('click', resetCardSelection);

    // Initial call or auto-refresh logic
    // For a simple setup, we might not auto-refresh. Player clicks "New Game".
    // If you want auto-refresh:
    // setInterval(async () => {
    //     if (currentGameState && currentGameState.game_info.round_state !== 'finished' && !currentGameState.players[myPlayerId].has_submitted) {
    //         try {
    //            const data = await fetchAPI('get_state');
    //            currentGameState = data.gameState;
    //            renderFullGameBoard(currentGameState); // This needs to be careful not to mess with ongoing card selection
    //         } catch(e){}
    //     }
    // }, 5000); // Refresh every 5 seconds

    updateGameMessage("点击“开始新游戏”");
});
