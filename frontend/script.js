// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 常量定义 ---
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';
    const HAND_TYPES = { /* ... (牌型定义) ... */ };
    const SUIT_VALUES = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };

    // --- DOM 元素获取 ---
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const backHandDiv = document.getElementById('backHand');
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');
    
    // --- 状态变量 ---
    let currentHandRawData = []; 
    let draggedCardElement = null; 
    let isMiddleDeckActive = false;

    // --- 辅助函数：在区域内重建标签 ---
    const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => {
        zone.innerHTML = mainLabelHTML + secondaryLabelHTML;
    };

    // --- 核心功能函数 ---
    async function fetchNewHand() {
        console.log("FN: Resetting state.");
        isMiddleDeckActive = false; 
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
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
            
            currentHandRawData = data.hand.map(card => { 
                if (card && typeof card === 'object') {
                    return {
                        ...card,
                        value: card.value !== undefined ? card.value : getCardValue(card.rank),
                        suitValue: card.suitValue !== undefined ? card.suitValue : getSuitValue(card.suit)
                    };
                }
                return null; 
            }).filter(card => card && card.rank && card.suit); 

            if (currentHandRawData.length !== 13) {
                console.warn("FN: Fetched hand does not contain 13 valid cards.", currentHandRawData);
            }

            displayAndSortHand(currentHandRawData); 
            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) { 
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}.`;
            messageArea.className = 'error';
        } 
        finally { 
            dealButton.disabled = false; 
            updateUIState(); // 使用修正后的函数名
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
            const cardElement = createCardElement(cardData, true); 
            if (cardElement instanceof Node) {
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            }
        });
        updateUIState(); // 使用修正后的函数名
    }

    function createCardElement(cardData, draggable) { 
        const img = document.createElement('img');
        if (!cardData) { 
            console.error("CCE: Invalid cardData", cardData);
            img.alt = "无效"; return img; 
        }
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`;
        img.alt = `${cardData.rank || 'N/A'} of ${cardData.suit || 'N/A'}`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `invalid-${Date.now()}`;
        img.cardData = cardData; 

        console.log(`CCE: Card ${cardData.card_id}. Draggable: ${draggable}. isMiddleDeckActive: ${isMiddleDeckActive}`);

        if (draggable) { 
            console.log(`CCE: Setting draggable=true for ${cardData.card_id}`);
            img.draggable = true;
            img.addEventListener('dragstart', handleDragStart);
            img.addEventListener('dragend', handleDragEnd);
        } else {
            console.log(`CCE: Setting draggable=false for ${cardData.card_id}`);
            img.draggable = false;
        }
        return img;
    }

    function handleDragStart(event) {
        if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
            console.log("DRAGSTART: Prevented drag from active middle deck.");
            event.preventDefault();
            return;
        }
        draggedCardElement = event.target;
        console.log("DRAGSTART: Card:", draggedCardElement.cardData.card_id);
        draggedCardElement.classList.add('dragging');
    }

    function handleDragEnd(event) {
        if (draggedCardElement) { 
            console.log("DRAGEND: Card:", draggedCardElement.cardData.card_id);
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
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv && draggedCardElement.parentElement !== zone) return; 
            if (!draggedCardElement) return;
            const targetZone = zone; 
            const sourceZone = draggedCardElement.parentElement;
            const cardElementsInTargetZone = Array.from(targetZone.children).filter(el => el.classList.contains('card')).length;
            const maxCards = targetZone.dataset.maxCards ? parseInt(targetZone.dataset.maxCards) : Infinity;
            if (targetZone !== sourceZone && cardElementsInTargetZone >= maxCards && !isPlayerHandZone) {
                 messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`; messageArea.className = 'error'; return;
            }
            if (targetZone !== sourceZone) { 
                targetZone.appendChild(draggedCardElement); 
            }
            updateUIState(); // 使用修正后的函数名
        });
    }

    function updateUIState() { // <--- 修正函数名
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
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            if (!prevIsMiddleDeckActive) { 
                messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！';
                messageArea.className = 'success';
                console.log("UIUpdate: Setting middle deck cards to NOT draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const cardData = cardEl.cardData; 
                    const newCardEl = createCardElement(cardData, false); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
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
                 messageArea.textContent = '牌墩数量变化，请重新摆牌。'; 
                 messageArea.className = 'info'; 
                console.log("UIUpdate: Setting player hand cards to draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const cardData = cardEl.cardData; 
                    const newCardEl = createCardElement(cardData, true); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                });
            }
        }
        // 这个条件判断应该在 isMiddleDeckActive 状态确定之后
        if (isMiddleDeckActive && (frontCount !== 3 || backCount !== 5 || handCardsCount !== 5 )) {
            // 这种情况理论上不应该发生，因为一旦isMiddleDeckActive为true，牌不可拖动
            // 但如果发生了，应该重置 isMiddleDeckActive 状态
            console.warn("UIUpdate: Middle deck active but counts are wrong. Re-evaluating.");
            isMiddleDeckActive = false; // 强制重置
            // 重新调用一次以更新UI到非激活状态
            updateUIState(); 
            return; // 避免执行下面的消息
        }
    }
    
    function handleSubmitArrangement() { /* ... (与之前相同，确保调用 updateUIState() 而不是旧名称) ... */ 
        if (!isMiddleDeckActive) { /* ... */ return; }
        // ... (获取牌数据和牌型) ...
        // ... (显示结果) ...
        setTimeout(() => {
            dealButton.disabled = false;
            messageArea.textContent = '可以重新发牌开始新的一局。';
            messageArea.className = '';
            isMiddleDeckActive = false; // 重置状态
            // 重建标签和清空卡牌
            const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => {
                 zone.innerHTML = mainLabelHTML + secondaryLabelHTML;
            };
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
        }, 7000); 
    }

    function getCardValue(rank) { /* ... */ }
    function getSuitValue(suit) { return SUIT_VALUES[suit.toLowerCase()] || 0; }
    function getHandDetails(cardsData) { /* ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... */ }
    
    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    updateUIState(); // 使用修正后的函数名
});
