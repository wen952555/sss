// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 常量定义 ---
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';
    const HAND_TYPES = {
        HIGH_CARD: { value: 0, name: "乌龙" }, ONE_PAIR: { value: 1, name: "一对" },
        TWO_PAIR: { value: 2, name: "两对" }, THREE_OF_A_KIND: { value: 3, name: "三条" },
        STRAIGHT: { value: 4, name: "顺子" }, FLUSH: { value: 5, name: "同花" },
        FULL_HOUSE: { value: 6, name: "葫芦" }, FOUR_OF_A_KIND: { value: 7, name: "铁支" },
        STRAIGHT_FLUSH: { value: 8, name: "同花顺" },
    };
    const SUIT_VALUES = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };

    // --- DOM 元素获取 ---
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const backHandDiv = document.getElementById('backHand');
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');
    const aiArrangeButton = document.getElementById('aiArrangeButton');
    const ai托管Button = document.getElementById('ai托管Button');
    const ai托管RoundsSelect = document.getElementById('ai托管Rounds');
    
    // --- 状态变量 ---
    let currentHandData = []; 
    let draggedCardElement = null; 
    let isMiddleDeckActive = false;
    let ai托管RemainingRounds = 0;
    let isAi托管Active = false;

    // --- 辅助函数 ---
    const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => {
        zone.innerHTML = mainLabelHTML + secondaryLabelHTML;
    };

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    function getCardValue(rank) {
        const rankValues = { 'ace': 14, 'king': 13, 'queen': 12, 'jack': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, '3':3 };
        return rankValues[rank?.toLowerCase()] || 0;
    }
    function getSuitValue(suit) { return SUIT_VALUES[suit?.toLowerCase()] || 0; }

    // --- 核心功能函数 ---
    async function fetchNewHand(isAiCall = false) {
        console.log("FN: Resetting state. isAiCall:", isAiCall);
        isMiddleDeckActive = false; 
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        aiArrangeButton.style.display = 'none'; 
        ai托管Button.style.display = 'none';
        ai托管RoundsSelect.style.display = 'none';
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;

        recreateLabelsInZone(frontHandDiv, '<h3 class="deck-label">头墩 (3张)</h3>');
        recreateLabelsInZone(playerHandOrMiddleDeckDiv, 
            `<h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>`,
            `<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>`
        );
        recreateLabelsInZone(backHandDiv, '<h3 class="deck-label">尾墩 (5张)</h3>');
        
        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); 
        const initialHandTitle = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const initialMiddleLbl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        if(initialHandTitle) initialHandTitle.style.display = 'block';
        if(initialMiddleLbl) initialMiddleLbl.style.display = 'none';

        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data || !Array.isArray(data.hand)) throw new Error('后端返回手牌数据无效');
            
            currentHandData = data.hand.map(card => {
                if (card && typeof card === 'object' && card.rank && card.suit) { // 增加了对 rank 和 suit 的检查
                    return {
                        ...card,
                        value: getCardValue(card.rank),
                        suitValue: getSuitValue(card.suit)
                    };
                }
                console.warn("FN: Invalid card data received from backend:", card);
                return null; 
            }).filter(card => card !== null); 

            if (currentHandData.length !== 13 && !isAiCall) { // 非AI调用时，如果牌数不对，给出更明确提示
                messageArea.textContent = `错误：获取到 ${currentHandData.length} 张牌，需要13张。请重试。`;
                messageArea.className = "error";
                dealButton.disabled = false; // 允许用户重试
                return; // 提前退出
            } else if (currentHandData.length !== 13 && isAiCall) {
                throw new Error(`AI获取到 ${currentHandData.length} 张牌，中止托管。`);
            }


            displayAndSortHand(currentHandData); 
            
            if (!isAi托管Active) { 
                aiArrangeButton.style.display = 'inline-block';
                ai托管Button.style.display = 'inline-block';
                ai托管RoundsSelect.style.display = 'inline-block';
            }
            
            messageArea.textContent = '发牌完成！';
            if (!isAi托管Active) messageArea.textContent += '请摆牌或使用AI分牌。';
            messageArea.className = 'success';

            if (isAiCall && isAi托管Active) { 
                console.log("FN: AI托管中，自动进行AI分牌。");
                await delay(500); 
                handleAiArrange(); 
            }

        } catch (error) { 
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}.`;
            messageArea.className = 'error';
            if (isAi托管Active) stopAi托管(`错误: ${error.message}，取消托管。`);
            else dealButton.disabled = false; // 允许用户重试
        } 
        finally { 
            if (!isAi托管Active && !dealButton.disabled) { /* 只有在非托管且dealButton未被错误处理启用时，才保持其disabled状态 */ }
            else if (!isAi托管Active) {dealButton.disabled = false;}
            updateUIState(); 
        }
    }

    function displayAndSortHand(handDataArray) {
        console.log("DSS: Sorting and displaying hand. isMiddleDeckActive:", isMiddleDeckActive);
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        Array.from(playerHandOrMiddleDeckDiv.children).forEach(child => {
            if (child !== handTitleEl && child !== middleLabelEl) {
                playerHandOrMiddleDeckDiv.removeChild(child);
            }
        });

        const sortedHandData = [...handDataArray].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });
        console.log("DSS: Sorted hand data:", sortedHandData);

        sortedHandData.forEach(cardData => {
            const cardElement = createCardElement(cardData, true); // 初始手牌总是可拖拽
            if (cardElement instanceof Node) {
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            }
        });
        updateUIState(); 
    }

    function createCardElement(cardData, draggable) { 
        const img = document.createElement('img');
        if (!cardData || !cardData.rank || !cardData.suit) { 
            console.error("CCE: Invalid cardData", cardData);
            img.alt = "无效"; return img; 
        }
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`;
        img.alt = `${cardData.rank} of ${cardData.suit}`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `${cardData.rank}_of_${cardData.suit}_${Date.now()}`;
        img.cardData = cardData; 

        // console.log(`CCE: Card ${img.dataset.cardId}. Draggable: ${draggable}.`);

        if (draggable) { 
            img.draggable = true;
            img.addEventListener('dragstart', handleDragStart);
            img.addEventListener('dragend', handleDragEnd);
        } else {
            img.draggable = false;
        }
        return img;
    }

    function handleDragStart(event) {
        if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
            event.preventDefault(); return;
        }
        draggedCardElement = event.target;
        // console.log("DRAGSTART: Card:", draggedCardElement.cardData.card_id);
        draggedCardElement.classList.add('dragging');
    }

    function handleDragEnd(event) {
        if (draggedCardElement) { 
            // console.log("DRAGEND: Card:", draggedCardElement.cardData.card_id);
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
    }
    
    [frontHandDiv, playerHandOrMiddleDeckDiv, backHandDiv].forEach(zone => {
        addDropZoneListeners(zone, zone === playerHandOrMiddleDeckDiv);
    });

    function addDropZoneListeners(zone, isPlayerHandZone) {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 
            const cardElementsInZone = Array.from(zone.children).filter(el => el.classList.contains('card')).length;
            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity;
            if ((cardElementsInZone < maxCards || (draggedCardElement && draggedCardElement.parentElement === zone)) || (isPlayerHandZone && !isMiddleDeckActive)) {
                zone.classList.add('over');
            }
        });
        zone.addEventListener('dragleave', (event) => { zone.classList.remove('over'); });
        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('over');
            if (!draggedCardElement) return; // 如果没有拖拽中的牌，直接返回
            // 如果是中墩激活状态，且目标是中墩，并且牌不是从中墩内部拖拽的（即从外面拖入激活的中墩），则阻止
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv && draggedCardElement.parentElement !== playerHandOrMiddleDeckDiv) return; 

            const targetZone = zone; 
            const sourceZone = draggedCardElement.parentElement;
            const cardElementsInTargetZone = Array.from(targetZone.children).filter(el => el.classList.contains('card')).length;
            const maxCards = targetZone.dataset.maxCards ? parseInt(targetZone.dataset.maxCards) : Infinity;

            if (targetZone !== sourceZone && cardElementsInTargetZone >= maxCards && !isPlayerHandZone) {
                 messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`; messageArea.className = 'error'; return;
            }
            if (targetZone !== sourceZone || targetZone === playerHandOrMiddleDeckDiv) { // 允许在手牌区内部拖动排序
                targetZone.appendChild(draggedCardElement); 
            }
            updateUIState(); 
        });
    }

    function updateUIState() { 
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;
        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        if (!handTitleEl || !middleLabelEl) { console.warn("UIUpdate: 无法找到标签元素。"); }

        const prevIsMiddleDeckActive = isMiddleDeckActive;
        
        if (frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
        } else {
            isMiddleDeckActive = false;
        }

        if (isMiddleDeckActive) {
            if (handTitleEl) handTitleEl.style.display = 'none'; 
            if (middleLabelEl) middleLabelEl.style.display = 'block'; 
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            if (!isAi托管Active) { // 只有非托管时才显示提交按钮让用户点
                 submitArrangementButton.style.display = 'block';
                 submitArrangementButton.disabled = false;
            }
            if (!prevIsMiddleDeckActive) { 
                messageArea.textContent = '牌已摆好，中墩形成！';
                if (!isAi托管Active) messageArea.textContent += '请确认牌型。';
                messageArea.className = 'success';
                console.log("UIUpdate: Setting middle deck cards to NOT draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    if (cardEl.cardData) { // 确保 cardData 存在
                        const newCardEl = createCardElement(cardEl.cardData, false); 
                        playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                    }
                });
            }
        } else { 
            if (handTitleEl) {
                handTitleEl.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
                handTitleEl.style.display = 'block';
            }
            if (middleLabelEl) middleLabelEl.style.display = 'none'; 
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
            if (prevIsMiddleDeckActive) { 
                 messageArea.textContent = '牌墩已重置。'; 
                 messageArea.className = 'info'; 
                console.log("UIUpdate: Setting player hand cards to draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                     if (cardEl.cardData) {
                        const newCardEl = createCardElement(cardEl.cardData, true); 
                        playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                    }
                });
            }
        }
        // (这个条件判断应该在 isMiddleDeckActive 状态确定之后)
        // 移除，因为上面的逻辑已经覆盖了状态转换
    }
    
    function handleSubmitArrangement(isAiCall = false) { 
        console.log("HS: Submitting. isAiCall:", isAiCall, "isMiddleDeckActive:", isMiddleDeckActive);
        if (!isMiddleDeckActive) {
            messageArea.textContent = '错误：中墩尚未形成或牌不完整！';
            messageArea.className = 'error';
            if (isAi托管Active) stopAi托管("AI摆牌错误，取消托管。");
            return;
        }
        // ... (其余与之前相同，但确保 isAi托管Active 时的行为) ...
        setTimeout(async () => { 
            if (isAi托管Active && ai托管RemainingRounds > 0) {
                ai托管RemainingRounds--;
                messageArea.textContent = `AI托管：剩余 ${ai托管RemainingRounds} 局。正在开始下一局...`;
                console.log(`HS: AI托管，剩余 ${ai托管RemainingRounds} 局。`);
                if (ai托管RemainingRounds > 0) {
                    await delay(isAiCall ? 500 : 1000); // AI 提交后到下一局的延迟可以短一点
                    await fetchNewHand(true); 
                } else {
                    stopAi托管("托管局数已完成。");
                }
            } else if (isAi托管Active && ai托管RemainingRounds <= 0) {
                stopAi托管("托管局数已完成。");
            } else { 
                dealButton.disabled = false;
                aiArrangeButton.style.display = 'inline-block'; 
                messageArea.textContent = '可以重新发牌开始新的一局。';
                messageArea.className = '';
                // 重置UI，清空牌区并重置标签
                isMiddleDeckActive = false; // 确保状态重置
                recreateLabelsInZone(frontHandDiv, '<h3 class="deck-label">头墩 (3张)</h3>');
                recreateLabelsInZone(playerHandOrMiddleDeckDiv, 
                    `<h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>`,
                    `<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>`
                );
                recreateLabelsInZone(backHandDiv, '<h3 class="deck-label">尾墩 (5张)</h3>');
                const resetHandTitle = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
                const resetMiddleLbl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
                if (resetHandTitle) resetHandTitle.style.display = 'block';
                if (resetMiddleLbl) resetMiddleLbl.style.display = 'none';
                playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
                submitArrangementButton.style.display = 'none'; 
            }
        }, isAiCall ? 1000 : 3000); // AI调用时结果显示时间短一点
    }

    // --- AI 功能 ---
    function handleAiArrange() { /* ... (与上一版本基本相同，确保调用 findBestArrangement 和 placeArrangementOnBoard) ... */ }
    function findBestArrangement(hand) { /* ... (与上一版本相同 - 占位符AI) ... */ }
    function placeArrangementOnBoard(arrangement) { /* ... (与上一版本相同) ... */ }
    function clearAllDecksDOM() { /* ... (与上一版本相同) ... */ }
    function startAi托管() { /* ... (与上一版本相同) ... */ }
    function stopAi托管(reason = "AI托管已停止。") { /* ... (与上一版本相同) ... */ }

    // --- 牌型逻辑函数 (确保这些函数是您之前版本中功能完整的) ---
    function getHandDetails(cardsData) { /* ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... */ }
    
    // --- 事件绑定 ---
    dealButton.addEventListener('click', () => fetchNewHand(false));
    submitArrangementButton.addEventListener('click', () => handleSubmitArrangement(false));
    aiArrangeButton.addEventListener('click', handleAiArrange);
    ai托管Button.addEventListener('click', () => {
        if (isAi托管Active) stopAi托管("手动取消托管。");
        else startAi托管();
    });
    ai托管RoundsSelect.addEventListener('change', () => { /* ... */ });

    // --- 初始调用 ---
    updateUIState();
});
