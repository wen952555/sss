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

    // --- DOM 元素获取 (可以放在函数定义之后，事件绑定之前) ---
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const backHandDiv = document.getElementById('backHand');
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');
    
    let activeDropZones = [frontHandDiv, backHandDiv]; 

    // --- 状态变量 ---
    let currentHandRaw = [];
    let draggedCard = null;
    let draggedCardData = null;
    let isMiddleDeckActive = false;

    // --- 主要功能函数定义 ---
    async function fetchNewHand() {
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;
        isMiddleDeckActive = false; 

        const recreateLabelsInZone = (zone, mainLabelHTML, secondaryLabelHTML = '') => {
            zone.innerHTML = mainLabelHTML + secondaryLabelHTML;
        };

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
            if (!data || !Array.isArray(data.hand)) {
                console.error('后端返回的手牌数据无效:', data);
                throw new Error('后端返回的手牌数据无效');
            }
            currentHandRaw = data.hand;
            currentHandRaw.forEach(card => {
                if (card && typeof card === 'object') {
                    if (card.value === undefined) card.value = getCardValue(card.rank);
                    if (card.suitValue === undefined) card.suitValue = getSuitValue(card.suit);
                } else {
                    console.warn('手牌数据中存在无效的卡牌项:', card);
                }
            });
            const validHand = currentHandRaw.filter(card => card && typeof card === 'object' && card.rank && card.suit);
            displayInitialHand(validHand); 

            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}. 请查看控制台获取更多信息。`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
            updateCardCountAndCheckCompletion(); 
        }
    }

    function displayInitialHand(hand) {
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        Array.from(playerHandOrMiddleDeckDiv.children).forEach(child => {
            if (child !== handTitleEl && child !== middleLabelEl) {
                playerHandOrMiddleDeckDiv.removeChild(child);
            }
        });
        
        const sortedHand = [...hand].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });

        sortedHand.forEach((cardData, index) => {
            if (!cardData || typeof cardData.rank === 'undefined' || typeof cardData.suit === 'undefined') {
                console.error('无效的 cardData 在 sortedHand 中:', cardData, '索引:', index);
                return; 
            }
            const cardElement = createCardElement(cardData, true); 
            if (cardElement instanceof Node) {
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            } else {
                console.error(`创建的 cardElement 在索引 ${index} 处不是有效的 Node:`, cardElement, '原始 cardData:', cardData);
            }
        });
        updateCardCountAndCheckCompletion(); 
    }

    function createCardElement(cardData, draggable = true) {
        const img = document.createElement('img');
        if (!cardData) {
            console.error("createCardElement 接收到无效的 cardData", cardData);
            img.alt = "无效卡牌"; 
            return img; 
        }
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`;
        img.alt = `${cardData.rank || 'N/A'} of ${cardData.suit || 'N/A'} (V:${cardData.value} S:${cardData.suitValue})`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `invalid-card-${Date.now()}`;
        img.cardData = cardData; 
        
        if (draggable && !isMiddleDeckActive) { 
            img.draggable = true;
            img.addEventListener('dragstart', (event) => {
                if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
                    event.preventDefault(); return;
                }
                draggedCard = event.target;
                draggedCardData = event.target.cardData;
                event.target.classList.add('dragging');
            });
            img.addEventListener('dragend', (event) => {
                event.target.classList.remove('dragging');
                draggedCard = null; draggedCardData = null;
            });
        } else {
            img.draggable = false; 
        }
        return img;
    }
    
    function addDropZoneListeners(zone, isPlayerHandZone = false) {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 
            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity; 
            const cardElementsInZone = Array.from(zone.children).filter(el => el.classList.contains('card')).length;
            if ( (cardElementsInZone < maxCards || (draggedCard && draggedCard.parentElement === zone)) || (isPlayerHandZone && !isMiddleDeckActive) ) {
                zone.classList.add('over');
            }
        });
        zone.addEventListener('dragleave', (event) => { zone.classList.remove('over'); });
        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('over');
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 
            if (!draggedCard) return;
            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity;
            const cardElementsInZone = Array.from(zone.children).filter(el => el.classList.contains('card')).length;
            if (!isPlayerHandZone && cardElementsInZone >= maxCards && draggedCard.parentElement !== zone) {
                messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`;
                messageArea.className = 'error';
                return;
            }
            if (draggedCard.parentElement && draggedCard.parentElement !== zone) {
                 draggedCard.parentElement.removeChild(draggedCard);
            }
            if (draggedCard.parentElement !== zone) {
                 zone.appendChild(draggedCard); 
            }
            updateCardCountAndCheckCompletion();
        });
    }

    function updateCardCountAndCheckCompletion() {
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;
        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        if (!handTitleEl || !middleLabelEl) {
            console.warn("updateCardCountAndCheckCompletion: 无法找到标签元素。");
        }

        if (!isMiddleDeckActive) {
            if (handTitleEl) {
                handTitleEl.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
                handTitleEl.style.display = 'block';
            }
            if (middleLabelEl) middleLabelEl.style.display = 'none';
        } else {
            if (handTitleEl) handTitleEl.style.display = 'none'; 
            if (middleLabelEl) middleLabelEl.style.display = 'block'; 
        }

        if (!isMiddleDeckActive && frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
            if (handTitleEl) handTitleEl.style.display = 'none';
            if (middleLabelEl) middleLabelEl.style.display = 'block';
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                const newCardEl = createCardElement(cardEl.cardData, false); 
                playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
            });
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！';
            messageArea.className = 'success';
        } else if (isMiddleDeckActive && (frontCount !== 3 || backCount !== 5 || handCardsCount !== 5 )) {
            isMiddleDeckActive = false;
            if (handTitleEl) {
                handTitleEl.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
                handTitleEl.style.display = 'block';
            }
            if (middleLabelEl) middleLabelEl.style.display = 'none';
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                const newCardEl = createCardElement(cardEl.cardData, true); 
                playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
            });
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
            messageArea.textContent = '牌墩数量变化，请重新摆牌。';
            messageArea.className = 'error';
        } else if (!isMiddleDeckActive) { 
            if (handTitleEl) handTitleEl.style.display = 'block';
            if (middleLabelEl) middleLabelEl.style.display = 'none'; 
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
        }
    }
    
    function handleSubmitArrangement() { 
        if (!isMiddleDeckActive) {
            messageArea.textContent = '错误：中墩尚未形成！';
            messageArea.className = 'error';
            return;
        }
        const getCardsDataFromZone = (zone) => Array.from(zone.children)
                                                .filter(el => el.classList.contains('card'))
                                                .map(c => c.cardData);

        const frontCardsData = getCardsDataFromZone(frontHandDiv);
        const middleCardsData = getCardsDataFromZone(playerHandOrMiddleDeckDiv);
        const backCardsData = getCardsDataFromZone(backHandDiv);

        if (frontCardsData.length !== 3 || middleCardsData.length !== 5 || backCardsData.length !== 5) {
             messageArea.textContent = '牌墩数量不正确！头墩3张，中墩5张，尾墩5张。';
             messageArea.className = 'error';
             return;
        }

        const frontHandDetails = getHandDetails(frontCardsData);
        const middleHandDetails = getHandDetails(middleCardsData);
        const backHandDetails = getHandDetails(backCardsData);
        
        let message = `头墩: ${frontHandDetails.name} (${frontHandDetails.cards.map(c=>c.rank + c.suit.charAt(0).toUpperCase()).join(',')})<br>`;
        message += `中墩: ${middleHandDetails.name} (${middleHandDetails.cards.map(c=>c.rank + c.suit.charAt(0).toUpperCase()).join(',')})<br>`;
        message += `尾墩: ${backHandDetails.name} (${backHandDetails.cards.map(c=>c.rank + c.suit.charAt(0).toUpperCase()).join(',')})<br>`;
        
        const frontVsMiddle = compareHands(middleHandDetails, frontHandDetails); 
        const middleVsBack = compareHands(backHandDetails, middleHandDetails);

        let isValidOrder = true;
        let orderMessage = "";

        if (frontVsMiddle === -1) { 
            isValidOrder = false;
            orderMessage += "错误：中墩牌型小于头墩！<br>";
        }
        if (middleVsBack === -1) { 
            isValidOrder = false;
            orderMessage += "错误：尾墩牌型小于中墩！<br>";
        }
        
        if (isValidOrder) {
            message += "<strong style='color:green;'>墩序正确！</strong>";
            messageArea.className = 'success';
        } else {
            message += `<strong style='color:red;'>${orderMessage}牌型无效 (倒水)！</strong>`;
            messageArea.className = 'error';
        }

        messageArea.innerHTML = message; 
        dealButton.disabled = true;
        submitArrangementButton.disabled = true;

        setTimeout(() => {
            dealButton.disabled = false;
            messageArea.textContent = '可以重新发牌开始新的一局。';
            messageArea.className = '';
            
            isMiddleDeckActive = false;
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

    // --- 牌型和工具函数定义 ---
    function getCardValue(rank) { /* ... (与之前相同) ... */ }
    function getSuitValue(suit) { return SUIT_VALUES[suit.toLowerCase()] || 0; } // 确保 getSuitValue 也定义了
    function getHandDetails(cardsData) { /* ... (与之前相同) ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... (与之前相同) ... */ }
    
    // --- 事件绑定 ---
    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement); // 现在 handleSubmitArrangement 应该已定义

    // --- 初始调用 ---
    updateCardCountAndCheckCompletion();
});
