// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 常量定义 ---
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';
    const HAND_TYPES = { /* ... */ };
    const SUIT_VALUES = { /* ... */ };

    // --- DOM 元素获取 ---
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
    let isMiddleDeckActive = false; // 确保初始为 false

    // --- 主要功能函数定义 ---
    async function fetchNewHand() {
        console.log("fetchNewHand called. Resetting isMiddleDeckActive to false.");
        isMiddleDeckActive = false; // 显式重置
        // ... (其他重置代码与上一版本相同) ...
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;

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
            // ... (fetch 和数据处理与上一版本相同) ...
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
                } else { console.warn('手牌数据中存在无效的卡牌项:', card); }
            });
            const validHand = currentHandRaw.filter(card => card && typeof card === 'object' && card.rank && card.suit);
            
            console.log("Calling displayInitialHand. isMiddleDeckActive is currently:", isMiddleDeckActive); // 关键日志
            displayInitialHand(validHand); 

            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) { /* ... */ } finally { /* ... */ }
    }

    function displayInitialHand(hand) {
        // ... (标签处理与上一版本相同) ...
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        Array.from(playerHandOrMiddleDeckDiv.children).forEach(child => {
            if (child !== handTitleEl && child !== middleLabelEl) {
                playerHandOrMiddleDeckDiv.removeChild(child);
            }
        });
        
        const sortedHand = [...hand].sort((a, b) => { /* ... */ });

        sortedHand.forEach((cardData, index) => {
            if (!cardData || typeof cardData.rank === 'undefined' || typeof cardData.suit === 'undefined') {
                console.error('无效的 cardData 在 sortedHand 中:', cardData, '索引:', index);
                return; 
            }
            // 在调用 createCardElement 时，明确传递 draggable 参数
            // 对于初始手牌，它们总是应该可拖动的 (除非游戏一开始就设定了特殊状态)
            // isMiddleDeckActive 在发牌时应为 false
            console.log(`displayInitialHand: Creating card ${index}. isMiddleDeckActive: ${isMiddleDeckActive}`); // 关键日志
            const cardElement = createCardElement(cardData, true); // 确保 draggable 为 true
            
            if (cardElement instanceof Node) {
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            } else { /* ... */ }
        });
        updateCardCountAndCheckCompletion(); 
    }

    function createCardElement(cardData, shouldBeDraggable) { // 参数名改为 shouldBeDraggable 以示清晰
        console.log(`createCardElement called. cardData:`, cardData, `shouldBeDraggable: ${shouldBeDraggable}`, `isMiddleDeckActive: ${isMiddleDeckActive}`); // 关键日志
        const img = document.createElement('img');
        if (!cardData) { /* ... (处理无效 cardData) ... */ return img; }

        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`;
        img.alt = `${cardData.rank || 'N/A'} of ${cardData.suit || 'N/A'} (V:${cardData.value} S:${cardData.suitValue})`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `invalid-card-${Date.now()}`;
        img.cardData = cardData; 
        
        // 核心判断逻辑：只有当明确指示该牌可拖动，并且全局状态 isMiddleDeckActive 为 false 时，才真正设置拖拽
        // 或者，如果这张牌不在中墩区域，也应该可拖动（这需要更复杂的判断，暂时简化）
        if (shouldBeDraggable && !isMiddleDeckActive) { 
            console.log(`  Setting draggable=true for card: ${cardData.card_id}`);
            img.draggable = true;
            img.addEventListener('dragstart', (event) => {
                // dragstart 内部的判断是为了防止从中墩拖出，如果牌本身就不该是中墩的牌，这里不应阻止
                if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
                    console.log("Drag prevented: middle deck active and card is in middle deck.");
                    event.preventDefault(); 
                    return;
                }
                console.log("Drag started for card:", event.target.cardData.card_id);
                draggedCard = event.target;
                draggedCardData = event.target.cardData;
                event.target.classList.add('dragging');
            });
            img.addEventListener('dragend', (event) => {
                console.log("Drag ended for card:", event.target.cardData.card_id);
                if (event.target) { // 检查 event.target 是否仍然存在
                    event.target.classList.remove('dragging');
                }
                draggedCard = null; 
                draggedCardData = null;
            });
        } else {
            console.log(`  Setting draggable=false for card: ${cardData.card_id}. shouldBeDraggable: ${shouldBeDraggable}, isMiddleDeckActive: ${isMiddleDeckActive}`);
            img.draggable = false; 
        }
        return img;
    }
    
    function addDropZoneListeners(zone, isPlayerHandZone = false) { /* ... (与之前相同) ... */ }

    function updateCardCountAndCheckCompletion() {
        // ... (与之前相同的逻辑，包括切换 isMiddleDeckActive 和调用 createCardElement 替换牌) ...
        // 确保在调用 createCardElement 时，第二个 draggable 参数传递正确
        // 例如：
        // if (isMiddleDeckActive) { ... newCardEl = createCardElement(cardEl.cardData, false); ... }
        // else { ... newCardEl = createCardElement(cardEl.cardData, true); ... }
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;
        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        if (!handTitleEl || !middleLabelEl) { /* ... */ }

        // 保存当前的 isMiddleDeckActive 状态，以便比较是否发生变化
        const prevIsMiddleDeckActive = isMiddleDeckActive;

        if (!isMiddleDeckActive && frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
        } else if (isMiddleDeckActive && (frontCount !== 3 || backCount !== 5 || handCardsCount !== 5 )) {
            isMiddleDeckActive = false;
        }
        // 如果状态没有改变，但之前是 isMiddleDeckActive=false 且不满足355条件，则保持 isMiddleDeckActive=false

        // 根据最新的 isMiddleDeckActive 更新UI
        if (!isMiddleDeckActive) {
            if (handTitleEl) {
                handTitleEl.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
                handTitleEl.style.display = 'block';
            }
            if (middleLabelEl) middleLabelEl.style.display = 'none';
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
            // 如果状态从激活变为非激活，或者初始就是非激活，确保牌是可拖动的
            if (prevIsMiddleDeckActive !== isMiddleDeckActive || !prevIsMiddleDeckActive) { // 确保只在需要时更新
                console.log("Updating cards in playerHandOrMiddleDeckDiv to be draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const newCardEl = createCardElement(cardEl.cardData, true); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                });
            }
        } else { // isMiddleDeckActive is true
            if (handTitleEl) handTitleEl.style.display = 'none'; 
            if (middleLabelEl) middleLabelEl.style.display = 'block'; 
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！'; // 移到这里，只在形成时提示
            messageArea.className = 'success';
            // 如果状态从非激活变为激活，确保牌是不可拖动的
             if (prevIsMiddleDeckActive !== isMiddleDeckActive) { // 确保只在需要时更新
                console.log("Updating cards in playerHandOrMiddleDeckDiv to be NOT draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const newCardEl = createCardElement(cardEl.cardData, false); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                });
            }
        }
        if (isMiddleDeckActive && (frontCount !== 3 || backCount !== 5 || handCardsCount !== 5 )) {
             if (messageArea.className !== 'error') { // 避免覆盖其他错误
                messageArea.textContent = '牌墩数量变化，请重新摆牌。';
                messageArea.className = 'error';
             }
        }
    }
    
    function handleSubmitArrangement() { /* ... (与之前相同) ... */ }
    function getCardValue(rank) { /* ... (与之前相同) ... */ }
    function getSuitValue(suit) { /* ... (与之前相同) ... */ }
    function getHandDetails(cardsData) { /* ... (与之前相同) ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... (与之前相同) ... */ }
    
    // --- 事件绑定 ---
    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    // --- 初始调用 ---
    updateCardCountAndCheckCompletion();
});
