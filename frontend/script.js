// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // ... (其他变量声明与之前版本相同) ...
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck');
    const middleOrHandTitle = document.getElementById('middle-or-hand-title');
    const backHandDiv = document.getElementById('backHand');
    let activeDropZones = [frontHandDiv, backHandDiv]; 
    const messageArea = document.getElementById('messageArea');
    const cardCountSpan = document.getElementById('card-count');
    const submitArrangementButton = document.getElementById('submitArrangement');
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';
    let currentHandRaw = [];
    let draggedCard = null;
    let draggedCardData = null;
    let isMiddleDeckActive = false;
    const HAND_TYPES = { /* ... */ }; // (与之前相同)

    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        // ... (与之前版本相同，清空和重置状态) ...
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;
        isMiddleDeckActive = false; 

        frontHandDiv.innerHTML = '';
        playerHandOrMiddleDeckDiv.innerHTML = '';
        backHandDiv.innerHTML = '';
        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); 
        middleOrHandTitle.textContent = `我的手牌 (${cardCountSpan.textContent}/13)`;

        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            currentHandRaw = data.hand;
            currentHandRaw.forEach(card => {
                if (card.value === undefined) card.value = getCardValue(card.rank);
                // 如果后端没有提供花色权重，我们可以在这里添加
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

    // 花色权重 (用于排序，如果点数相同)
    // 黑桃 > 红桃 > 梅花 > 方块 (或者自定义)
    const SUIT_VALUES = {
        'spades': 4,
        'hearts': 3,
        'clubs': 2,
        'diamonds': 1
    };

    function getSuitValue(suit) {
        return SUIT_VALUES[suit.toLowerCase()] || 0;
    }

    function displayInitialHand(hand) {
        playerHandOrMiddleDeckDiv.innerHTML = ''; 
        
        // --- 自动整理牌序 ---
        const sortedHand = [...hand].sort((a, b) => {
            // 主要按点数降序
            if (b.value !== a.value) {
                return b.value - a.value;
            }
            // 点数相同，按花色降序 (黑桃 > 红桃 > 梅花 > 方块)
            return b.suitValue - a.suitValue; 
        });
        // --- 整理结束 ---

        sortedHand.forEach(cardData => {
            const cardElement = createCardElement(cardData, true); 
            playerHandOrMiddleDeckDiv.appendChild(cardElement);
        });
        updateCardCountAndCheckCompletion(); // 更新计数
    }

    function createCardElement(cardData, draggable = true) {
        // ... (与之前版本相同) ...
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        img.alt = `${cardData.rank} of ${cardData.suit} (V:${cardData.value} S:${cardData.suitValue})`; // 显示value和suitValue调试
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
    
    function addDropZoneListeners(zone, isPlayerHandZone = false) {
        // ... (与之前版本相同) ...
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; 

            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity; 
            
            if ( (zone.children.length < maxCards || (draggedCard && draggedCard.parentElement === zone)) || (isPlayerHandZone && !isMiddleDeckActive) ) {
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

            if (!isPlayerHandZone && zone.children.length >= maxCards && draggedCard.parentElement !== zone) {
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
        // ... (与之前版本相同，检查墩牌数，转换中墩状态) ...
        const frontCount = frontHandDiv.children.length;
        const backCount = backHandDiv.children.length;
        const handCardsCount = playerHandOrMiddleDeckDiv.children.length; 
        
        cardCountSpan.textContent = isMiddleDeckActive ? '5' : handCardsCount; 

        if (!isMiddleDeckActive && frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            isMiddleDeckActive = true;
            middleOrHandTitle.textContent = "中墩 (5张)";
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            
            Array.from(playerHandOrMiddleDeckDiv.children).forEach(cardEl => {
                const newCardEl = createCardElement(cardEl.cardData, false); 
                playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
            });

            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！';
            messageArea.className = 'success';

        } else if (isMiddleDeckActive && (frontCount !== 3 || backCount !== 5 || handCardsCount !== 5 )) {
            // 如果中墩激活后，牌数又不对了（例如用户通过某种方式移除了牌，理论上不应该）
            // 则恢复为手牌区状态
            isMiddleDeckActive = false;
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            // 让牌可以重新拖动
             Array.from(playerHandOrMiddleDeckDiv.children).forEach(cardEl => {
                const newCardEl = createCardElement(cardEl.cardData, true); // 设为可拖动
                playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
            });
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
            messageArea.textContent = '牌墩数量变化，请重新摆牌。';
            messageArea.className = 'error';
        } else if (!isMiddleDeckActive) { // 保持手牌区状态
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
        }
    }
    
    function handleSubmitArrangement() {
        // ... (与之前版本相同，获取牌墩数据，比较牌型) ...
        if (!isMiddleDeckActive) {
            messageArea.textContent = '错误：中墩尚未形成！';
            messageArea.className = 'error';
            return;
        }

        const frontCardsData = Array.from(frontHandDiv.children).map(c => c.cardData);
        const middleCardsData = Array.from(playerHandOrMiddleDeckDiv.children).map(c => c.cardData); 
        const backCardsData = Array.from(backHandDiv.children).map(c => c.cardData);

        if (frontCardsData.length !== 3 || middleCardsData.length !== 5 || backCardsData.length !== 5) {
             messageArea.textContent = '牌墩数量不正确！头墩3张，中墩5张，尾墩5张。';
             messageArea.className = 'error';
             return;
        }

        const frontHandDetails = getHandDetails(frontCardsData);
        const middleHandDetails = getHandDetails(middleCardsData);
        const backHandDetails = getHandDetails(backCardsData);
        
        let message = `头墩: ${frontHandDetails.name} (${frontHandDetails.cards.map(c=>c.rank + c.suit.charAt(0).toUpperCase()).join(',')})<br>`; // 显示牌面和花色首字母
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
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">0</span>/13)`; 
            submitArrangementButton.style.display = 'none'; 

        }, 7000); 
    }

    // --- 牌型逻辑函数 (getCardValue, sortCards, getHandDetails, compareHands) ---
    // (这些函数与您上一个版本中的基本一致，确保它们是最新的)
    function getCardValue(rank) {
        const rankValues = { 'ace': 14, 'king': 13, 'queen': 12, 'jack': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, '3':3 };
        return rankValues[rank.toLowerCase()] || 0;
    }
    
    // sortCards 函数不再直接使用，因为排序在 displayInitialHand 中进行
    // function sortCards(cards) { 
    //     return [...cards].sort((a, b) => b.value - a.value);
    // }

    function getHandDetails(cardsData) {
        // ... (与之前版本相同，确保牌型识别逻辑正确，特别是对3张和5张墩的处理) ...
        if (!cardsData || cardsData.length === 0) return { type: HAND_TYPES.HIGH_CARD, cards: [], name: "无", kickers: [] };

        const cards = [...cardsData].sort((a,b) => b.value - a.value); // 在识别牌型前按点数排序输入
        const n = cards.length;

        const counts = {}; 
        cards.forEach(card => {
            counts[card.value] = (counts[card.value] || 0) + 1;
        });
        
        const values = cards.map(c => c.value);
        const suits = cards.map(c => c.suit);

        const isFlush = new Set(suits).size === 1;
        
        let isStraight = false;
        const uniqueSortedValues = [...new Set(values)].sort((a, b) => a - b); 
        if (uniqueSortedValues.length >= 5 && n === 5) { 
            for (let i = 0; i <= uniqueSortedValues.length - 5; i++) {
                if (uniqueSortedValues[i+4] - uniqueSortedValues[i] === 4) {
                    isStraight = true;
                    break;
                }
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
            let straightFlushCards = [...cards]; 
            let kickerValue = Math.max(...values.map(v => v === 14 && values.includes(2) && n===5 ? 1 : v)); // A2345中A算1，取最大牌
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) { 
                kickerValue = 5; 
            } else if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) { 
                kickerValue = 3;
            }
            // 使用原始卡牌顺序，因为它们已经是排序好的
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
            return { type: HAND_TYPES.FLUSH, cards, name: HAND_TYPES.FLUSH.name, kickers: values.sort((a,b)=>b-a) }; // kickers是所有牌值
        }

        if (isStraight) { 
            let kickerValue = Math.max(...values.map(v => v === 14 && values.includes(2) ? 1 : v));
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) { 
                kickerValue = 5;
            } else if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) { 
                kickerValue = 3;
            }
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
        // ... (与之前版本相同) ...
        if (hand1Details.type.value > hand2Details.type.value) return 1;
        if (hand1Details.type.value < hand2Details.type.value) return -1;

        switch (hand1Details.type) {
            case HAND_TYPES.STRAIGHT_FLUSH:
            case HAND_TYPES.STRAIGHT:
                // 顺子比较最大牌
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0; 
            
            case HAND_TYPES.FOUR_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 比较第五张单牌
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;

            case HAND_TYPES.FULL_HOUSE:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 三条相同，比较对子
                if (hand1Details.secondary > hand2Details.secondary) return 1; 
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                return 0;
            
            case HAND_TYPES.FLUSH: // 同花比较单张
            case HAND_TYPES.HIGH_CARD: // 高牌比较单张
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0; // 所有单张都相同

            case HAND_TYPES.THREE_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 三条相同，比较kicker
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;

            case HAND_TYPES.TWO_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 大对相同，比较小对
                if (hand1Details.secondary > hand2Details.secondary) return 1; 
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                // 两对都相同，比较单张
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1; 
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;

            case HAND_TYPES.ONE_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; 
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 对子相同，比较kickers
                for (let i = 0; i < Math.min(hand1Details.kickers.length, hand2Details.kickers.length); i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;
            default:
                return 0;
        }
    }
    updateCardCountAndCheckCompletion();
});
