// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const middleOrHandTitle = document.getElementById('middle-or-hand-title'); // 这是外部的 H2 (手牌计数)
    const middleDeckLabel = document.getElementById('middleDeckLabel'); // 这是内部中墩的 H3 标签
    const backHandDiv = document.getElementById('backHand');
    
    let activeDropZones = [frontHandDiv, backHandDiv]; 
    const messageArea = document.getElementById('messageArea');
    // const cardCountSpan = document.getElementById('card-count'); // 这个 span 还在 middleOrHandTitle 内
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

        frontHandDiv.innerHTML = '<h3 class="deck-label">头墩 (3张)</h3>'; // 确保标签存在
        playerHandOrMiddleDeckDiv.innerHTML = '<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>'; // 重建标签
        backHandDiv.innerHTML = '<h3 class="deck-label">尾墩 (5张)</h3>'; // 确保标签存在
        
        // 更新 middleDeckLabel 的引用，因为它被重新创建了
        // middleDeckLabel = document.getElementById('middleDeckLabel'); // 这一行现在不需要，因为我们直接操作内部的label

        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); 
        document.getElementById('middleDeckLabel').style.display = 'none'; // 显式隐藏新建的label
        
        middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">0</span>/13)`;


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
        // 先清空牌，但保留标签
        const currentLabel = playerHandOrMiddleDeckDiv.querySelector('.deck-label');
        playerHandOrMiddleDeckDiv.innerHTML = ''; // 清空所有内容
        if (currentLabel) { // 如果标签存在，重新添加回去
             playerHandOrMiddleDeckDiv.appendChild(currentLabel);
        } else { // 万一标签没了，重建一个（理论上不应该发生）
            const newLabel = document.createElement('h3');
            newLabel.id = 'middleDeckLabel';
            newLabel.className = 'deck-label';
            newLabel.textContent = '中墩 (5张)';
            newLabel.style.display = 'none';
            playerHandOrMiddleDeckDiv.appendChild(newLabel);
        }
        
        const sortedHand = [...hand].sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return b.suitValue - a.suitValue; 
        });

        sortedHand.forEach(cardData => {
            const cardElement = createCardElement(cardData, true); 
            playerHandOrMiddleDeckDiv.appendChild(cardElement); // 牌会添加到标签之后
        });
        updateCardCountAndCheckCompletion(); 
    }

    function createCardElement(cardData, draggable = true) {
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        img.alt = `${cardData.rank} of ${cardData.suit} (V:${cardData.value} S:${cardData.suitValue})`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id;
        img.cardData = cardData;
        
        if (draggable && !isMiddleDeckActive) { 
            img.draggable = true;
            img.addEventListener('dragstart', (event) => {
                if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
                    event.preventDefault(); 
                    return;
                }
                draggedCard = event.target;
                draggedCardData = event.target.cardData;
                event.target.classList.add('dragging');
            });

            img.addEventListener('dragend', (event) => {
                event.target.classList.remove('dragging');
                draggedCard = null;
                draggedCardData = null;
            });
        } else {
            img.draggable = false; 
        }
        return img;
    }
    
    activeDropZones.forEach(zone => { // 只为头墩和尾墩添加初始监听
        addDropZoneListeners(zone);
    });
    addDropZoneListeners(playerHandOrMiddleDeckDiv, true); // 为手牌区/中墩区添加监听


    function addDropZoneListeners(zone, isPlayerHandZone = false) {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 

            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity; 
            
            if ( (zone.children.length -1 < maxCards || (draggedCard && draggedCard.parentElement === zone)) || (isPlayerHandZone && !isMiddleDeckActive) ) { // -1 because of label
                zone.classList.add('over');
            }
        });

        zone.addEventListener('dragleave', (event) => {
            zone.classList.remove('over');
        });

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
                 zone.appendChild(draggedCard); // 会自动添加到最后，即标签之后
            }

            updateCardCountAndCheckCompletion();
        });
    }

    function updateCardCountAndCheckCompletion() {
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card')).length;

        const frontCount = countCardsInZone(frontHandDiv);
        const backCount = countCardsInZone(backHandDiv);
        const handCardsCount = countCardsInZone(playerHandOrMiddleDeckDiv); 
        
        const middleDeckLabelEl = document.getElementById('middleDeckLabel'); // 重新获取以防万一

        if (!isMiddleDeckActive) {
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
        } else {
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">0</span>/13) - <strong style="color:lightgreen;">中墩已形成</strong>`; 
        }

        if (!isMiddleDeckActive && frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
            if(middleDeckLabelEl) middleDeckLabelEl.style.display = 'block'; 
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
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
            if(middleDeckLabelEl) middleDeckLabelEl.style.display = 'none'; 
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
            if(middleDeckLabelEl) middleDeckLabelEl.style.display = 'none'; 
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
        const countCardsInZone = (zone) => Array.from(zone.children).filter(el => el.classList.contains('card'));

        const frontCardElements = countCardsInZone(frontHandDiv);
        const middleCardElements = countCardsInZone(playerHandOrMiddleDeckDiv);
        const backCardElements = countCardsInZone(backHandDiv);

        const frontCardsData = frontCardElements.map(c => c.cardData);
        const middleCardsData = middleCardElements.map(c => c.cardData);
        const backCardsData = backCardElements.map(c => c.cardData);


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
            
            // 重置UI状态
            isMiddleDeckActive = false;
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            const middleDeckLabelEl = document.getElementById('middleDeckLabel');
            if(middleDeckLabelEl) middleDeckLabelEl.style.display = 'none'; 
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">0</span>/13)`; 
            submitArrangementButton.style.display = 'none'; 
            
            // 清空牌区并重新添加标签
            frontHandDiv.innerHTML = '<h3 class="deck-label">头墩 (3张)</h3>';
            playerHandOrMiddleDeckDiv.innerHTML = '<h3 id="middleDeckLabel" class="deck-label" style="display: none;">中墩 (5张)</h3>';
            backHandDiv.innerHTML = '<h3 class="deck-label">尾墩 (5张)</h3>';

        }, 7000); 
    }

    function getCardValue(rank) {
        const rankValues = { 'ace': 14, 'king': 13, 'queen': 12, 'jack': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, '3':3 };
        return rankValues[rank.toLowerCase()] || 0;
    }
    
    function getHandDetails(cardsData) {
        if (!cardsData || cardsData.length === 0) return { type: HAND_TYPES.HIGH_CARD, cards: [], name: "无", kickers: [] };
        const cards = [...cardsData].sort((a,b) => b.value - a.value); 
        const n = cards.length;
        const counts = {}; 
        cards.forEach(card => { counts[card.value] = (counts[card.value] || 0) + 1; });
        const values = cards.map(c => c.value);
        const suits = cards.map(c => c.suit);
        const isFlush = new Set(suits).size === 1;
        let isStraight = false;
        const uniqueSortedValues = [...new Set(values)].sort((a, b) => a - b); 
        if (uniqueSortedValues.length >= 5 && n === 5) { 
            for (let i = 0; i <= uniqueSortedValues.length - 5; i++) {
                if (uniqueSortedValues[i+4] - uniqueSortedValues[i] === 4) { isStraight = true; break; }
            }
            if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3) && uniqueSortedValues.includes(4) && uniqueSortedValues.includes(5)) {
                isStraight = true; 
            }
        } else if (n === 3) { 
             if (uniqueSortedValues.length === 3 && uniqueSortedValues[2] - uniqueSortedValues[0] === 2 && uniqueSortedValues[1] - uniqueSortedValues[0] === 1) {
                isStraight = true; 
             }
             if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3)) { 
                 isStraight = true;
             }
        }

        if (isFlush && isStraight) {
            let kickerValue = Math.max(...values);
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) kickerValue = 5; 
            else if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) kickerValue = 3;
            return { type: HAND_TYPES.STRAIGHT_FLUSH, cards, name: HAND_TYPES.STRAIGHT_FLUSH.name, kickers: [kickerValue] };
        }
        const fourOfAKindValue = Object.keys(counts).find(v => counts[v] === 4);
        if (fourOfAKindValue && n === 5) { 
            const kicker = values.find(v => v !== parseInt(fourOfAKindValue));
            return { type: HAND_TYPES.FOUR_OF_A_KIND, cards, name: HAND_TYPES.FOUR_OF_A_KIND.name, primary: parseInt(fourOfAKindValue), kickers: kicker ? [kicker] : [] };
        }
        const threeOfAKindValue = Object.keys(counts).find(v => counts[v] === 3);
        const pairValues = Object.keys(counts).filter(v => counts[v] === 2);
        if (threeOfAKindValue && pairValues.length > 0 && n === 5) { 
            return { type: HAND_TYPES.FULL_HOUSE, cards, name: HAND_TYPES.FULL_HOUSE.name, primary: parseInt(threeOfAKindValue), secondary: parseInt(pairValues[0]) };
        }
        if (isFlush) { 
            return { type: HAND_TYPES.FLUSH, cards, name: HAND_TYPES.FLUSH.name, kickers: values.sort((a,b)=>b-a) };
        }
        if (isStraight) { 
            let kickerValue = Math.max(...values);
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) kickerValue = 5;
            else if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) kickerValue = 3;
            return { type: HAND_TYPES.STRAIGHT, cards, name: HAND_TYPES.STRAIGHT.name, kickers: [kickerValue] };
        }
        if (threeOfAKindValue) { 
            const kickers = values.filter(v => v !== parseInt(threeOfAKindValue)).sort((a, b) => b - a).slice(0, n - 3);
            return { type: HAND_TYPES.THREE_OF_A_KIND, cards, name: HAND_TYPES.THREE_OF_A_KIND.name, primary: parseInt(threeOfAKindValue), kickers };
        }
        if (pairValues.length === 2 && n === 5) { 
            const sortedPairValues = pairValues.map(Number).sort((a,b)=>b-a);
            const kicker = values.find(v => !sortedPairValues.includes(v));
            return { type: HAND_TYPES.TWO_PAIR, cards, name: HAND_TYPES.TWO_PAIR.name, primary: sortedPairValues[0], secondary: sortedPairValues[1], kickers: kicker ? [kicker] : [] };
        }
        if (pairValues.length === 1) { 
            const kickers = values.filter(v => v !== parseInt(pairValues[0])).sort((a,b)=>b-a).slice(0, n - 2);
            return { type: HAND_TYPES.ONE_PAIR, cards, name: HAND_TYPES.ONE_PAIR.name, primary: parseInt(pairValues[0]), kickers };
        }
        return { type: HAND_TYPES.HIGH_CARD, cards, name: HAND_TYPES.HIGH_CARD.name, kickers: values.sort((a,b)=>b-a) };
    }

    function compareHands(hand1Details, hand2Details) {
        if (hand1Details.type.value > hand2Details.type.value) return 1;
        if (hand1Details.type.value < hand2Details.type.value) return -1;
        switch (hand1Details.type) {
            case HAND_TYPES.STRAIGHT_FLUSH: case HAND_TYPES.STRAIGHT:
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0; 
            case HAND_TYPES.FOUR_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;
            case HAND_TYPES.FULL_HOUSE:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                if (hand1Details.secondary > hand2Details.secondary) return 1; 
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                return 0;
            case HAND_TYPES.FLUSH: case HAND_TYPES.HIGH_CARD:
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                } return 0;
            case HAND_TYPES.THREE_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                } return 0;
            case HAND_TYPES.TWO_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                if (hand1Details.secondary > hand2Details.secondary) return 1; 
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1; 
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;
            case HAND_TYPES.ONE_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                } return 0;
            default: return 0;
        }
    }
    updateCardCountAndCheckCompletion();
});
