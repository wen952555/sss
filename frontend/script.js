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
    let currentHandRawData = []; // 存储从后端获取并处理后的卡牌数据对象数组
    let draggedCardElement = null; // 当前拖动的卡牌DOM元素
    // let draggedCardData = null; // 这个可以从 draggedCardElement.cardData 获取
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
            
            currentHandRawData = data.hand.map(card => { // 处理并存储卡牌数据
                if (card && typeof card === 'object') {
                    return {
                        ...card,
                        value: card.value !== undefined ? card.value : getCardValue(card.rank),
                        suitValue: card.suitValue !== undefined ? card.suitValue : getSuitValue(card.suit)
                    };
                }
                return null; // 或抛出错误
            }).filter(card => card && card.rank && card.suit); // 过滤无效卡牌

            if (currentHandRawData.length !== 13) {
                console.warn("FN: Fetched hand does not contain 13 valid cards.", currentHandRawData);
            }

            displayAndSortHand(currentHandRawData); 
            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) { /* ... (错误处理) ... */ } 
        finally { dealButton.disabled = false; updateUIT состояния(); }
    }

    function displayAndSortHand(handDataArray) {
        console.log("DSS: Sorting and displaying hand. isMiddleDeckActive:", isMiddleDeckActive);
        // 1. 清空现有卡牌 (保留标签)
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');
        Array.from(playerHandOrMiddleDeckDiv.children).forEach(child => {
            if (child !== handTitleEl && child !== middleLabelEl) {
                playerHandOrMiddleDeckDiv.removeChild(child);
            }
        });

        // 2. 排序卡牌数据
        const sortedHandData = [...handDataArray].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });
        console.log("DSS: Sorted hand data:", sortedHandData);

        // 3. 根据排序后的数据创建并添加卡牌元素
        sortedHandData.forEach(cardData => {
            // 对于初始手牌，它们总是可拖动的，因为 isMiddleDeckActive 此时应为 false
            const cardElement = createCardElement(cardData, true); 
            if (cardElement instanceof Node) {
                playerHandOrMiddleDeckDiv.appendChild(cardElement); 
            }
        });
        updateUIT состояния(); 
    }

    function createCardElement(cardData, draggable) { // draggable 参数现在直接决定是否添加拖拽功能
        const img = document.createElement('img');
        if (!cardData) { /* ... (处理无效 cardData) ... */ return img; }
        // ... (设置 img 属性: src, alt, classList, dataset) ...
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file || 'placeholder.svg'}`;
        img.alt = `${cardData.rank || 'N/A'} of ${cardData.suit || 'N/A'}`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id || `invalid-${Date.now()}`;
        img.cardData = cardData; // 将完整数据对象附加到元素上

        console.log(`CCE: Creating card ${cardData.card_id}. Requested draggable: ${draggable}. Current isMiddleDeckActive: ${isMiddleDeckActive}`);

        if (draggable) { // 只看传入的 draggable 参数
            console.log(`CCE: Setting draggable=true for ${cardData.card_id}`);
            img.draggable = true;
            img.addEventListener('dragstart', handleDragStart);
            img.addEventListener('dragend', handleDragEnd);
        } else {
            console.log(`CCE: Setting draggable=false for ${cardData.card_id}`);
            img.draggable = false;
            // 确保移除可能存在的旧监听器 (如果元素被复用而不是替换)
            // 但由于我们通常是replaceChild，所以新元素不会有旧监听器
        }
        return img;
    }

    function handleDragStart(event) {
        // 阻止从中墩拖拽的逻辑应该在这里，基于全局状态和父元素
        if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
            console.log("DRAGSTART: Prevented drag from active middle deck.");
            event.preventDefault();
            return;
        }
        draggedCardElement = event.target;
        console.log("DRAGSTART: Card:", draggedCardElement.cardData.card_id);
        draggedCardElement.classList.add('dragging');
        // event.dataTransfer.setData('text/plain', draggedCardElement.cardData.card_id); // 可选
    }

    function handleDragEnd(event) {
        if (draggedCardElement) { // 确保 draggedCardElement 存在
            console.log("DRAGEND: Card:", draggedCardElement.cardData.card_id);
            draggedCardElement.classList.remove('dragging');
        }
        draggedCardElement = null;
    }
    
    // 为所有放置区（包括手牌区自身）添加拖放监听器
    [frontHandDiv, playerHandOrMiddleDeckDiv, backHandDiv].forEach(zone => {
        addDropZoneListeners(zone, zone === playerHandOrMiddleDeckDiv);
    });

    function addDropZoneListeners(zone, isPlayerHandZone) {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 
            // ... (maxCards 和 over 类的处理，确保计算牌数时排除标签) ...
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

            const targetZone = zone; // drop 事件的目标区域
            const sourceZone = draggedCardElement.parentElement;

            // ... (maxCards 和牌数检查，确保计算牌数时排除标签) ...
            const cardElementsInTargetZone = Array.from(targetZone.children).filter(el => el.classList.contains('card')).length;
            const maxCards = targetZone.dataset.maxCards ? parseInt(targetZone.dataset.maxCards) : Infinity;

            if (targetZone !== sourceZone && cardElementsInTargetZone >= maxCards && !isPlayerHandZone) {
                 messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`; messageArea.className = 'error'; return;
            }
            
            // 移动DOM元素
            if (targetZone !== sourceZone) { // 只有当目标和源不同时才移动
                targetZone.appendChild(draggedCardElement); 
            }
            updateUIT состояния();
        });
    }

    function updateUIT состояния() { // 重命名以避免与JS内置函数冲突的可能
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;
        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const handTitleEl = playerHandOrMiddleDeckDiv.querySelector('#middle-or-hand-title');
        const middleLabelEl = playerHandOrMiddleDeckDiv.querySelector('#middleDeckLabel');

        if (!handTitleEl || !middleLabelEl) { console.warn("UIUpdate: 无法找到标签元素。"); }

        const prevIsMiddleDeckActive = isMiddleDeckActive;
        
        // 更新 isMiddleDeckActive 状态
        if (frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
        } else {
            isMiddleDeckActive = false;
        }

        // 根据 isMiddleDeckActive 更新UI和卡牌拖拽性
        if (isMiddleDeckActive) {
            if (handTitleEl) handTitleEl.style.display = 'none'; 
            if (middleLabelEl) middleLabelEl.style.display = 'block'; 
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            if (!prevIsMiddleDeckActive) { // 仅当状态从非激活变为激活时
                messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！';
                messageArea.className = 'success';
                // 将中墩的牌设为不可拖动
                console.log("UIUpdate: Setting middle deck cards to NOT draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const cardData = cardEl.cardData; // 获取数据
                    const newCardEl = createCardElement(cardData, false); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                });
            }
        } else { // Not middle deck active
            if (handTitleEl) {
                handTitleEl.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
                handTitleEl.style.display = 'block';
            }
            if (middleLabelEl) middleLabelEl.style.display = 'none'; 
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
            if (prevIsMiddleDeckActive) { // 仅当状态从激活变为非激活时
                 messageArea.textContent = '牌墩数量变化，请重新摆牌。'; // 或其他合适的消息
                 messageArea.className = 'info'; // 或 'error'
                // 将手牌区的牌设为可拖动
                console.log("UIUpdate: Setting player hand cards to draggable.");
                Array.from(playerHandOrMiddleDeckDiv.children).filter(el => el.classList.contains('card')).forEach(cardEl => {
                    const cardData = cardEl.cardData; // 获取数据
                    const newCardEl = createCardElement(cardData, true); 
                    playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
                });
            }
        }
    }
    
    function handleSubmitArrangement() { /* ... (与之前相同，确保结束时重置 isMiddleDeckActive 和标签状态) ... */ }
    function getCardValue(rank) { /* ... (与之前相同) ... */ }
    function getSuitValue(suit) { return SUIT_VALUES[suit.toLowerCase()] || 0; }
    function getHandDetails(cardsData) { /* ... (与之前相同) ... */ }
    function compareHands(hand1Details, hand2Details) { /* ... (与之前相同) ... */ }
    
    // --- 事件绑定 ---
    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    // --- 初始调用 ---
    updateUIT состояния(); // 确保函数名正确
});
