// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    // middleOrHandTitle 和 middleDeckLabel 现在是 playerHandOrMiddleDeckDiv 的子元素
    const backHandDiv = document.getElementById('backHand');
    
    let activeDropZones = [frontHandDiv, backHandDiv]; 
    const messageArea = document.getElementById('messageArea');
    const submitArrangementButton = document.getElementById('submitArrangement');

    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';

    let currentHandRaw = [];
    let draggedCard = null;
    let draggedCardData = null;
    let isMiddleDeckActive = false;

    const HAND_TYPES = {
        HIGH_CARD: { value: 0, name: "乌龙" }, ONE_PAIR: { value: 1, name: "一对" },
        TWO_PAIR: { value: 2, name: "两对" }, THREE_OF_A_KIND: { value: 3, name: "三条" },
        STRAIGHT: { value: 4, name: "顺子" }, FLUSH: { value: 5, name: "同花" },
        FULL_HOUSE: { value: 6, name: "葫芦" }, FOUR_OF_A_KIND: { value: 7, name: "铁支" },
        STRAIGHT_FLUSH: { value: 8, name: "同花顺" },
    };
    const SUIT_VALUES = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };

    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;
        isMiddleDeckActive = false; 

        // 清空牌区并确保标签在内部被正确重建
        frontHandDiv.innerHTML = '<h3 class="deck-label">头墩 (3张)</h3>'; 
        playerHandOrMiddleDeckDiv.innerHTML = `
            <h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>
            <h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>
        `;
        backHandDiv.innerHTML = '<h3 class="deck-label">尾墩 (5张)</h3>';
        
        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); 
        
        // 确保初始标签状态正确
        const initialHandTitle = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const initialMiddleLbl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        if(initialHandTitle) initialHandTitle.style.display = 'block';
        if(initialMiddleLbl) initialMiddleLbl.style.display = 'none';


        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            currentHandRaw = data.hand;
            currentHandRaw.forEach(card => {
                if (card.value === undefined) card.value = getCardValue(card.rank);
                if (card.suitValue === undefined) card.suitValue = getSuitValue(card.suit);
            });
            displayInitialHand(currentHandRaw); 
            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}.`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
            updateCardCountAndCheckCompletion(); 
        }
    }
    
    function getSuitValue(suit) {
        return SUIT_VALUES[suit.toLowerCase()] || 0;
    }

    function displayInitialHand(hand) {
        // 保存并稍后恢复标签
        const handTitleHTML = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title')?.outerHTML || `<h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>`;
        const middleLabelHTML = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel')?.outerHTML || `<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>`;
        
        playerHandOrMiddleDeckDiv.innerHTML = handTitleHTML + middleLabelHTML; // 先把标签放回去
        
        const sortedHand = [...hand].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });

        sortedHand.forEach(cardData => {
            const cardElement = createCardElement(cardData, true); 
            playerHandOrMiddleDeckDiv.appendChild(cardElement); 
        });
        updateCardCountAndCheckCompletion(); 
    }

    function createCardElement(cardData, draggable = true) { /* ... (与之前相同) ... */ }
    
    activeDropZones.forEach(zone => { addDropZoneListeners(zone); });
    addDropZoneListeners(playerHandOrMiddleDeckDiv, true); 

    function addDropZoneListeners(zone, isPlayerHandZone = false) { /* ... (与之前相同，注意卡牌数量计算排除标签) ... */ }

    function updateCardCountAndCheckCompletion() {
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;

        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

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
    
    function handleSubmitArrangement() { /* ... (与之前相同，确保结束时重置标签状态) ... */ 
        setTimeout(() => {
            // ... (重置 dealButton, isMiddleDeckActive 等) ...
            frontHandDiv.innerHTML = '<h3 class="deck-label">头墩 (3张)</h3>';
            playerHandOrMiddleDeckDiv.innerHTML = `
                <h2 id="middle-or-hand-title" class="deck-label">我的手牌 (<span id="card-count">0</span>/13)</h2>
                <h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>
            `;
            backHandDiv.innerHTML = '<h3 class="deck-label">尾墩 (5张)</h3>';
            
            const resetHandTitle = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
            const resetMiddleLbl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
            if (resetHandTitle) resetHandTitle.style.display = 'block';
            if (resetMiddleLbl) resetMiddleLbl.style.display = 'none';
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none'; 
             messageArea.textContent = '可以重新发牌开始新的一局。'; // 确保消息正确
             messageArea.className = ''; // 清除消息样式
        }, 7000); 
    }

    function getCardValue(rank) { /* ... (与之前相同) ... */ }
    function getHandDetails(cardsData) { /* ... (与之前相同) ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... (与之前相同) ... */ }
    
    updateCardCountAndCheckCompletion();
});
