// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const frontHandDiv = document.getElementById('frontHand');
    // const middleHandDiv = document.getElementById('middleHand'); // 不再有固定的中墩div
    const playerHandOrMiddleDeckDiv = document.getElementById('playerHandOrMiddleDeck'); // 动态区域
    const middleOrHandTitle = document.getElementById('middle-or-hand-title');
    const backHandDiv = document.getElementById('backHand');
    
    // 更新 dropZones，初始只有头墩和尾墩，以及手牌区自身（允许牌拖回）
    // 当 playerHandOrMiddleDeck 变成中墩后，它不再是有效的 drop target
    let activeDropZones = [frontHandDiv, backHandDiv]; // 仅头尾墩是主要放置区

    const messageArea = document.getElementById('messageArea');
    const cardCountSpan = document.getElementById('card-count'); // 仍然用于显示手牌区剩余牌数
    const submitArrangementButton = document.getElementById('submitArrangement');

    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';

    let currentHandRaw = []; // 存储从后端获取的原始手牌数据
    let draggedCard = null;
    let draggedCardData = null;
    let isMiddleDeckActive = false; // 标记中间区域是否已成为中墩

    // 牌型常量 (与之前相同)
    const HAND_TYPES = {
        HIGH_CARD: { value: 0, name: "乌龙" }, ONE_PAIR: { value: 1, name: "一对" },
        TWO_PAIR: { value: 2, name: "两对" }, THREE_OF_A_KIND: { value: 3, name: "三条" },
        STRAIGHT: { value: 4, name: "顺子" }, FLUSH: { value: 5, name: "同花" },
        FULL_HOUSE: { value: 6, name: "葫芦" }, FOUR_OF_A_KIND: { value: 7, name: "铁支" },
        STRAIGHT_FLUSH: { value: 8, name: "同花顺" },
    };

    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true;
        isMiddleDeckActive = false; // 重置状态

        // 清空所有区域
        frontHandDiv.innerHTML = '';
        playerHandOrMiddleDeckDiv.innerHTML = '';
        backHandDiv.innerHTML = '';
        playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active'); // 移除中墩样式
        middleOrHandTitle.textContent = `我的手牌 (${cardCountSpan.textContent}/13)`;


        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            currentHandRaw = data.hand;
            currentHandRaw.forEach(card => {
                if (card.value === undefined) card.value = getCardValue(card.rank);
            });
            displayInitialHand(currentHandRaw); // 显示在 playerHandOrMiddleDeckDiv
            messageArea.textContent = '发牌完成！请将手牌拖拽到头墩或尾墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}.`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
            updateCardCountAndCheckCompletion(); // 发牌后立即检查一次
        }
    }

    function displayInitialHand(hand) {
        playerHandOrMiddleDeckDiv.innerHTML = ''; 
        hand.forEach(cardData => {
            const cardElement = createCardElement(cardData, true); // 初始手牌可拖动
            playerHandOrMiddleDeckDiv.appendChild(cardElement);
        });
    }

    function createCardElement(cardData, draggable = true) {
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        img.alt = `${cardData.rank} of ${cardData.suit} (Value: ${cardData.value})`;
        img.classList.add('card');
        img.dataset.cardId = cardData.card_id;
        img.cardData = cardData;
        
        if (draggable && !isMiddleDeckActive) { // 只有当牌可拖动且中墩未激活时才设置拖动属性
            img.draggable = true;
            img.addEventListener('dragstart', (event) => {
                if (isMiddleDeckActive && event.target.parentElement === playerHandOrMiddleDeckDiv) {
                    event.preventDefault(); // 如果中墩已激活，禁止从中墩拖出
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
            img.draggable = false; // 如果是中墩的牌或不可拖动
        }
        return img;
    }
    
    // 为头墩和尾墩添加拖放事件监听
    activeDropZones.forEach(zone => {
        addDropZoneListeners(zone);
    });

    // 为手牌区/中墩区本身添加拖放监听（允许从墩拖回手牌区，但当中墩激活时不允许）
    addDropZoneListeners(playerHandOrMiddleDeckDiv, true);


    function addDropZoneListeners(zone, isPlayerHandZone = false) {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault(); 
            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; // 中墩激活，不接受拖放

            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity; // 手牌区没有maxCards
            
            // 如果是头墩或尾墩，且未满，或者拖动的牌来自该墩内部，则允许
            // 如果是手牌区 (isPlayerHandZone 为 true), 总是允许 (除非中墩激活)
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

            if (isMiddleDeckActive && zone === playerHandOrMiddleDeckDiv) return; // 中墩激活，不接受
            if (!draggedCard) return;

            const maxCards = zone.dataset.maxCards ? parseInt(zone.dataset.maxCards) : Infinity;

            // 检查目标区域是否已满 (不适用于手牌区本身)
            if (!isPlayerHandZone && zone.children.length >= maxCards && draggedCard.parentElement !== zone) {
                messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`;
                messageArea.className = 'error';
                return;
            }
            
            // 从原父节点移除
            if (draggedCard.parentElement && draggedCard.parentElement !== zone) {
                 draggedCard.parentElement.removeChild(draggedCard);
            }
            
            // 添加到新父节点 (如果不是从当前父节点拖拽到当前父节点)
            if (draggedCard.parentElement !== zone) {
                 zone.appendChild(draggedCard);
            }

            updateCardCountAndCheckCompletion();
        });
    }


    function updateCardCountAndCheckCompletion() {
        const frontCount = frontHandDiv.children.length;
        const backCount = backHandDiv.children.length;
        const handCardsCount = playerHandOrMiddleDeckDiv.children.length; // 现在是这个区域的牌数
        
        cardCountSpan.textContent = isMiddleDeckActive ? '5' : handCardsCount; // 更新手牌计数或中墩计数

        if (!isMiddleDeckActive && frontCount === 3 && backCount === 5 && handCardsCount === 5) {
            // 条件满足，转换手牌区为中墩区
            isMiddleDeckActive = true;
            middleOrHandTitle.textContent = "中墩 (5张)";
            playerHandOrMiddleDeckDiv.classList.add('middle-deck-active');
            
            // 禁止中墩的牌再次被拖动
            Array.from(playerHandOrMiddleDeckDiv.children).forEach(cardEl => {
                cardEl.draggable = false;
                // 移除可能存在的拖拽事件监听，或者在createCardElement时就处理好
                const newCardEl = createCardElement(cardEl.cardData, false); // 创建不可拖拽的副本
                playerHandOrMiddleDeckDiv.replaceChild(newCardEl, cardEl);
            });

            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            messageArea.textContent = '牌已摆好，中墩形成！可以确认牌型了！';
            messageArea.className = 'success';

        } else if (isMiddleDeckActive) {
            // 如果已经是中墩，但后来牌被移走了 (理论上不应该发生，因为我们禁止了拖动)
            // 但为了健壮性，可以考虑回退状态 (或者直接报错)
            // 这里简单地保持提交按钮可见，让用户去提交然后判断
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
        }
        else {
            // 条件未满足，保持为手牌区
            isMiddleDeckActive = false; // 确保状态正确
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">${handCardsCount}</span>/13)`;
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

        const frontCardsData = Array.from(frontHandDiv.children).map(c => c.cardData);
        const middleCardsData = Array.from(playerHandOrMiddleDeckDiv.children).map(c => c.cardData); // 中墩数据来自 playerHandOrMiddleDeckDiv
        const backCardsData = Array.from(backHandDiv.children).map(c => c.cardData);

        if (frontCardsData.length !== 3 || middleCardsData.length !== 5 || backCardsData.length !== 5) {
             messageArea.textContent = '牌墩数量不正确！头墩3张，中墩5张，尾墩5张。';
             messageArea.className = 'error';
             return;
        }

        const frontHandDetails = getHandDetails(frontCardsData);
        const middleHandDetails = getHandDetails(middleCardsData);
        const backHandDetails = getHandDetails(backCardsData);
        
        let message = `头墩: ${frontHandDetails.name} (${frontHandDetails.cards.map(c=>c.rank).join(',')})<br>`;
        message += `中墩: ${middleHandDetails.name} (${middleHandDetails.cards.map(c=>c.rank).join(',')})<br>`;
        message += `尾墩: ${backHandDetails.name} (${backHandDetails.cards.map(c=>c.rank).join(',')})<br>`;
        
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
            // submitArrangementButton.disabled = true; // 保持禁用直到下次满足条件
            // submitArrangementButton.style.display = 'none';
            // fetchNewHand(); // 或者直接调用发牌开始新一局
            messageArea.textContent = '可以重新发牌开始新的一局。';
            messageArea.className = '';
            // 重置状态，以便重新开始
            isMiddleDeckActive = false;
            playerHandOrMiddleDeckDiv.classList.remove('middle-deck-active');
            middleOrHandTitle.innerHTML = `我的手牌 (<span id="card-count">0</span>/13)`; // 重置标题
            submitArrangementButton.style.display = 'none'; // 隐藏提交按钮

        }, 7000); 
    }

    // --- 牌型逻辑函数 (getCardValue, sortCards, getHandDetails, compareHands) ---
    // 这些函数与您上一个版本中的基本一致，这里为了完整性，我会把它们复制过来
    // 请确保您使用的是最新最完善的版本

    function getCardValue(rank) {
        const rankValues = { 'ace': 14, 'king': 13, 'queen': 12, 'jack': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, '3':3 };
        return rankValues[rank.toLowerCase()] || 0;
    }
    
    function sortCards(cards) { 
        return [...cards].sort((a, b) => b.value - a.value);
    }

    function getHandDetails(cardsData) {
        if (!cardsData || cardsData.length === 0) return { type: HAND_TYPES.HIGH_CARD, cards: [], name: "无", kickers: [] };

        const cards = sortCards(cardsData.map(c => ({ rank: c.rank, suit: c.suit, value: c.value })));
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
        if (uniqueSortedValues.length >= 5 && n === 5) { // 中墩或尾墩 (5张)
            for (let i = 0; i <= uniqueSortedValues.length - 5; i++) {
                if (uniqueSortedValues[i+4] - uniqueSortedValues[i] === 4) {
                    isStraight = true;
                    break;
                }
            }
            if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3) && uniqueSortedValues.includes(4) && uniqueSortedValues.includes(5)) {
                isStraight = true; // A2345
            }
        } else if (n === 3) { // 头墩 (3张牌) - 十三水规则头墩通常不认顺子，但这里可以保留逻辑以备扩展
             if (uniqueSortedValues.length === 3 && uniqueSortedValues[2] - uniqueSortedValues[0] === 2 && uniqueSortedValues[1] - uniqueSortedValues[0] === 1) {
                isStraight = true; // e.g., 2-3-4
             }
             if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3)) { // A23
                 isStraight = true;
             }
        }


        if (isFlush && isStraight) {
            let straightFlushCards = [...cards]; // 使用副本
            let kickerValue = Math.max(...values);
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) { // A2345
                straightFlushCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c));
                kickerValue = 5; 
            }
             // 对于3张的同花顺 (如果规则允许)
            if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) { // A23同花顺
                straightFlushCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c));
                kickerValue = 3;
            }
            return { type: HAND_TYPES.STRAIGHT_FLUSH, cards: straightFlushCards, name: HAND_TYPES.STRAIGHT_FLUSH.name, kickers: [kickerValue] };
        }

        const rankCounts = Object.values(counts);
        const fourOfAKindValue = Object.keys(counts).find(v => counts[v] === 4);
        if (fourOfAKindValue && n === 5) { // 铁支只在5张牌墩中
            const kicker = values.find(v => v !== parseInt(fourOfAKindValue));
            return { type: HAND_TYPES.FOUR_OF_A_KIND, cards, name: HAND_TYPES.FOUR_OF_A_KIND.name, primary: parseInt(fourOfAKindValue), kickers: kicker ? [kicker] : [] };
        }

        const threeOfAKindValue = Object.keys(counts).find(v => counts[v] === 3);
        const pairValues = Object.keys(counts).filter(v => counts[v] === 2);

        if (threeOfAKindValue && pairValues.length > 0 && n === 5) { // 葫芦只在5张牌墩中
            return { type: HAND_TYPES.FULL_HOUSE, cards, name: HAND_TYPES.FULL_HOUSE.name, primary: parseInt(threeOfAKindValue), secondary: parseInt(pairValues[0]) };
        }

        if (isFlush) { // 同花 (3张或5张都可以)
            return { type: HAND_TYPES.FLUSH, cards, name: HAND_TYPES.FLUSH.name, kickers: values.sort((a,b)=>b-a) };
        }

        if (isStraight) { // 顺子 (3张或5张都可以)
            let straightCards = [...cards];
            let kickerValue = Math.max(...values);
             if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5) && n===5) { // A2345
                straightCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c));
                kickerValue = 5;
            }
            if (n === 3 && values.includes(14) && values.includes(2) && values.includes(3)) { // A23
                straightCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c));
                kickerValue = 3;
            }
            return { type: HAND_TYPES.STRAIGHT, cards: straightCards, name: HAND_TYPES.STRAIGHT.name, kickers: [kickerValue] };
        }

        if (threeOfAKindValue) { // 三条 (3张或5张都可以，5张时有2个kicker)
            const kickers = values.filter(v => v !== parseInt(threeOfAKindValue)).sort((a, b) => b - a).slice(0, n - 3);
            return { type: HAND_TYPES.THREE_OF_A_KIND, cards, name: HAND_TYPES.THREE_OF_A_KIND.name, primary: parseInt(threeOfAKindValue), kickers };
        }

        if (pairValues.length === 2 && n === 5) { // 两对只在5张牌墩中
            const sortedPairValues = pairValues.map(Number).sort((a,b)=>b-a);
            const kicker = values.find(v => !sortedPairValues.includes(v));
            return { type: HAND_TYPES.TWO_PAIR, cards, name: HAND_TYPES.TWO_PAIR.name, primary: sortedPairValues[0], secondary: sortedPairValues[1], kickers: kicker ? [kicker] : [] };
        }

        if (pairValues.length === 1) { // 一对 (3张或5张)
            const kickers = values.filter(v => v !== parseInt(pairValues[0])).sort((a,b)=>b-a).slice(0, n - 2);
            return { type: HAND_TYPES.ONE_PAIR, cards, name: HAND_TYPES.ONE_PAIR.name, primary: parseInt(pairValues[0]), kickers };
        }
        
        return { type: HAND_TYPES.HIGH_CARD, cards, name: HAND_TYPES.HIGH_CARD.name, kickers: values.sort((a,b)=>b-a) };
    }

    function compareHands(hand1Details, hand2Details) {
        // (这个函数与您之前的版本相同，确保它是您最新最完善的版本)
        if (hand1Details.type.value > hand2Details.type.value) return 1;
        if (hand1Details.type.value < hand2Details.type.value) return -1;

        switch (hand1Details.type) {
            case HAND_TYPES.STRAIGHT_FLUSH:
            case HAND_TYPES.STRAIGHT:
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                // 如果连最大牌都一样 (例如都是A2345顺子)，则比较花色 (十三水通常不比花色，算平)
                // 但如果需要，可以在卡牌数据中加入花色权重
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
            
            case HAND_TYPES.FLUSH:
            case HAND_TYPES.HIGH_CARD:
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;

            case HAND_TYPES.THREE_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;

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
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;
            default:
                return 0;
        }
    }

    // 初始调用一次，确保按钮状态正确
    updateCardCountAndCheckCompletion();
});
