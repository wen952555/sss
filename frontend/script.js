// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('dealButton');
    const playerHandDiv = document.getElementById('playerHand');
    const frontHandDiv = document.getElementById('frontHand');
    const middleHandDiv = document.getElementById('middleHand');
    const backHandDiv = document.getElementById('backHand');
    const dropZones = [frontHandDiv, middleHandDiv, backHandDiv];
    const messageArea = document.getElementById('messageArea');
    const cardCountSpan = document.getElementById('card-count');
    const submitArrangementButton = document.getElementById('submitArrangement');

    // 确保这是你后端API的正确HTTPS路径
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; 
    const CARD_IMAGE_BASE_PATH = './cards/';

    let currentHand = [];
    let draggedCard = null;
    let draggedCardData = null;

    // 牌型常量 (用于比较强度)
    const HAND_TYPES = {
        HIGH_CARD: { value: 0, name: "乌龙" },
        ONE_PAIR: { value: 1, name: "一对" },
        TWO_PAIR: { value: 2, name: "两对" },
        THREE_OF_A_KIND: { value: 3, name: "三条" },
        STRAIGHT: { value: 4, name: "顺子" },
        FLUSH: { value: 5, name: "同花" },
        FULL_HOUSE: { value: 6, name: "葫芦" },
        FOUR_OF_A_KIND: { value: 7, name: "铁支" }, // 四梅
        STRAIGHT_FLUSH: { value: 8, name: "同花顺" },
        // ROYAL_FLUSH: { value: 9, name: "皇家同花顺" } // Royal Flush 是 Straight Flush 的一种特殊情况
    };


    dealButton.addEventListener('click', fetchNewHand);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    async function fetchNewHand() {
        // ... (代码与之前基本一致，只是确保从后端获取的cardData包含value)
        messageArea.textContent = '正在发牌...';
        messageArea.className = ''; 
        dealButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        submitArrangementButton.disabled = true; // 初始禁用

        playerHandDiv.innerHTML = '';
        dropZones.forEach(zone => zone.innerHTML = '');
        cardCountSpan.textContent = '0';

        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            currentHand = data.hand;
            // 确保卡牌数据有value，如果没有，需要从rank映射
            currentHand.forEach(card => {
                if (card.value === undefined) { // 如果后端没直接给value
                    card.value = getCardValue(card.rank);
                }
            });
            displayHand(currentHand);
            messageArea.textContent = '发牌完成！请将手牌拖拽到对应牌墩。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}. 请检查后端API (${BACKEND_API_URL}) 是否可以通过HTTPS正常访问，以及CORS设置是否正确。`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
        }
    }

    function displayHand(hand) {
        playerHandDiv.innerHTML = '';
        hand.forEach(cardData => {
            const cardElement = createCardElement(cardData);
            playerHandDiv.appendChild(cardElement);
        });
        updateCardCount();
        checkArrangementCompletion();
    }

    function createCardElement(cardData) {
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        img.alt = `${cardData.rank} of ${cardData.suit} (Value: ${cardData.value})`; // 显示value以便调试
        img.classList.add('card');
        img.draggable = true;
        img.dataset.cardId = cardData.card_id;
        img.cardData = cardData;

        img.addEventListener('dragstart', (event) => {
            draggedCard = event.target;
            draggedCardData = event.target.cardData;
            event.target.classList.add('dragging');
        });

        img.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
            draggedCard = null;
            draggedCardData = null;
        });
        return img;
    }

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (event) => {
            event.preventDefault();
            const maxCards = parseInt(zone.dataset.maxCards);
            if (zone.children.length < maxCards || (draggedCard && draggedCard.parentElement === zone)) { // 允许从同一区域内拖动
                zone.classList.add('over');
            }
        });

        zone.addEventListener('dragleave', (event) => {
            zone.classList.remove('over');
        });

        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('over');
            const maxCards = parseInt(zone.dataset.maxCards);

            if (draggedCard && (zone.children.length < maxCards || draggedCard.parentElement === zone)) {
                 // 如果是从其他地方拖过来的，并且目标区域未满
                if (draggedCard.parentElement !== zone && zone.children.length >= maxCards) {
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

                updateCardCount();
                checkArrangementCompletion();
            } else if (draggedCard) {
                messageArea.textContent = `这个牌墩已满 (${maxCards}张)!`;
                messageArea.className = 'error';
            }
        });
    });
    
    playerHandDiv.addEventListener('dragover', (event) => {
        event.preventDefault();
        playerHandDiv.classList.add('over');
    });
    playerHandDiv.addEventListener('dragleave', (event) => {
        playerHandDiv.classList.remove('over');
    });
    playerHandDiv.addEventListener('drop', (event) => {
        event.preventDefault();
        playerHandDiv.classList.remove('over');
        if (draggedCard && draggedCard.parentElement !== playerHandDiv) {
            if (draggedCard.parentElement) { // 确保有父元素再移除
                draggedCard.parentElement.removeChild(draggedCard);
            }
            playerHandDiv.appendChild(draggedCard);
            updateCardCount();
            checkArrangementCompletion();
        }
    });

    function updateCardCount() {
        cardCountSpan.textContent = playerHandDiv.children.length;
    }

    function checkArrangementCompletion() {
        const frontCount = frontHandDiv.children.length;
        const middleCount = middleHandDiv.children.length;
        const backCount = backHandDiv.children.length;

        if (playerHandDiv.children.length === 0 && frontCount === 3 && middleCount === 5 && backCount === 5) {
            submitArrangementButton.style.display = 'block';
            submitArrangementButton.disabled = false;
            messageArea.textContent = '牌已摆好，可以确认牌型了！';
            messageArea.className = 'success';
        } else {
            submitArrangementButton.style.display = 'none';
            submitArrangementButton.disabled = true;
        }
    }

    // --- 核心牌型逻辑开始 ---
    function getCardValue(rank) {
        const rankValues = { 'ace': 14, 'king': 13, 'queen': 12, 'jack': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, '3':3 }; // A高
        return rankValues[rank.toLowerCase()] || 0;
    }
    
    function sortCards(cards) { // 按牌值降序排列
        return [...cards].sort((a, b) => b.value - a.value);
    }

    function getHandDetails(cardsData) {
        if (!cardsData || cardsData.length === 0) return { type: HAND_TYPES.HIGH_CARD, cards: [], name: "无", kickers: [] };

        const cards = sortCards(cardsData.map(c => ({ rank: c.rank, suit: c.suit, value: c.value })));
        const n = cards.length;

        const counts = {}; // 统计每个点数出现的次数
        cards.forEach(card => {
            counts[card.value] = (counts[card.value] || 0) + 1;
        });
        
        const values = cards.map(c => c.value);
        const suits = cards.map(c => c.suit);

        const isFlush = new Set(suits).size === 1;
        
        // 检查顺子 (包括 A-2-3-4-5 和 10-J-Q-K-A)
        let isStraight = false;
        const uniqueSortedValues = [...new Set(values)].sort((a, b) => a - b); // 升序排列去重点数
        if (uniqueSortedValues.length >= 5) { // 至少需要5张不同点数的牌才可能构成顺子 (用于中墩/尾墩)
            // 正常顺子
            for (let i = 0; i <= uniqueSortedValues.length - 5; i++) {
                if (uniqueSortedValues[i+4] - uniqueSortedValues[i] === 4) {
                    isStraight = true;
                    // 如果是顺子，我们通常取最大的那张作为顺子的“代表牌”或最大牌
                    // 这里为了简单，仅标记为 isStraight
                    break;
                }
            }
            // 特殊顺子 A-2-3-4-5 (Ace value is 14, 2 is 2, etc.)
            if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3) && uniqueSortedValues.includes(4) && uniqueSortedValues.includes(5)) {
                isStraight = true;
                // 如果是 A2345 顺子，实际比较时 5 是最大的牌。
                // 为了简化比较，我们将A的值临时视为1，排序后比较。
                // 或者在比较顺子大小时特殊处理 A2345。
                // 目前的 HAND_TYPES.STRAIGHT 的 value 已经可以处理，但比较时需要细化。
            }
        } else if (n === 3) { // 头墩的顺子 (三张牌)
             if (uniqueSortedValues.length === 3 && uniqueSortedValues[2] - uniqueSortedValues[0] === 2 && uniqueSortedValues[1] - uniqueSortedValues[0] === 1) {
                isStraight = true;
             }
             // A23 (14,2,3 -> 2,3,14) -> 2,3, (A=1)
             if (!isStraight && uniqueSortedValues.includes(14) && uniqueSortedValues.includes(2) && uniqueSortedValues.includes(3)) {
                 isStraight = true;
             }
        }


        if (isFlush && isStraight) {
            // 为了同花顺比较，通常需要同花顺里最大的牌
            // A2345同花顺，A算小；TJQKA同花顺，A算大
            let straightFlushCards = cards;
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) { // A2345
                // 调整A的值为1进行比较
                straightFlushCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c));
            }
            return { type: HAND_TYPES.STRAIGHT_FLUSH, cards: straightFlushCards, name: HAND_TYPES.STRAIGHT_FLUSH.name, kickers: values };
        }

        const rankCounts = Object.values(counts);
        const fourOfAKindValue = Object.keys(counts).find(v => counts[v] === 4);
        if (fourOfAKindValue) {
            const kicker = values.find(v => v !== parseInt(fourOfAKindValue));
            return { type: HAND_TYPES.FOUR_OF_A_KIND, cards, name: HAND_TYPES.FOUR_OF_A_KIND.name, primary: parseInt(fourOfAKindValue), kickers: kicker ? [kicker] : [] };
        }

        const threeOfAKindValue = Object.keys(counts).find(v => counts[v] === 3);
        const pairValues = Object.keys(counts).filter(v => counts[v] === 2);

        if (threeOfAKindValue && pairValues.length > 0) {
            return { type: HAND_TYPES.FULL_HOUSE, cards, name: HAND_TYPES.FULL_HOUSE.name, primary: parseInt(threeOfAKindValue), secondary: parseInt(pairValues[0]) };
        }

        if (isFlush) {
            return { type: HAND_TYPES.FLUSH, cards, name: HAND_TYPES.FLUSH.name, kickers: values };
        }

        if (isStraight) {
            // 对于顺子，比较时是比较顺子中最大的牌。A2345顺子中5最大。
            let straightCards = cards;
            if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) { // A2345
                straightCards = sortCards(cards.map(c => c.value === 14 ? {...c, value: 1} : c)); // A 当 1 处理后排序，最大的会是5
                 // 但用于比较的 "kicker" 应该是5
                return { type: HAND_TYPES.STRAIGHT, cards: straightCards, name: HAND_TYPES.STRAIGHT.name, kickers: [5] };
            }
            return { type: HAND_TYPES.STRAIGHT, cards, name: HAND_TYPES.STRAIGHT.name, kickers: [Math.max(...values)] };
        }

        if (threeOfAKindValue) {
            const kickers = values.filter(v => v !== parseInt(threeOfAKindValue)).sort((a, b) => b - a).slice(0, n - 3);
            return { type: HAND_TYPES.THREE_OF_A_KIND, cards, name: HAND_TYPES.THREE_OF_A_KIND.name, primary: parseInt(threeOfAKindValue), kickers };
        }

        if (pairValues.length === 2) { // 两对
            const sortedPairValues = pairValues.map(Number).sort((a,b)=>b-a);
            const kicker = values.find(v => !sortedPairValues.includes(v));
            return { type: HAND_TYPES.TWO_PAIR, cards, name: HAND_TYPES.TWO_PAIR.name, primary: sortedPairValues[0], secondary: sortedPairValues[1], kickers: kicker ? [kicker] : [] };
        }

        if (pairValues.length === 1) { // 一对
            const kickers = values.filter(v => v !== parseInt(pairValues[0])).sort((a,b)=>b-a).slice(0, n - 2);
            return { type: HAND_TYPES.ONE_PAIR, cards, name: HAND_TYPES.ONE_PAIR.name, primary: parseInt(pairValues[0]), kickers };
        }
        
        // 乌龙 (高牌)
        return { type: HAND_TYPES.HIGH_CARD, cards, name: HAND_TYPES.HIGH_CARD.name, kickers: values.sort((a,b)=>b-a) };
    }

    // 比较两个牌墩的函数 (返回 true 如果 hand1 > hand2)
    // 注意：这个比较函数需要非常细致，处理各种牌型下的比较逻辑
    function compareHands(hand1Details, hand2Details) {
        if (hand1Details.type.value > hand2Details.type.value) return 1; // hand1 牌型更大
        if (hand1Details.type.value < hand2Details.type.value) return -1; // hand2 牌型更大

        // 牌型相同，比较具体牌值
        switch (hand1Details.type) {
            case HAND_TYPES.STRAIGHT_FLUSH:
            case HAND_TYPES.STRAIGHT:
                // 比较顺子中最大的牌。A2345中5最大，10JQKA中A最大。
                // getHandDetails 中 kickers[0] 已经处理了A2345的情况
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0; // 完全相同 (理论上同花顺/顺子不应该完全相同除非是公牌，十三水里不会)
            
            case HAND_TYPES.FOUR_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 比较 kicker (理论上十三水里5张牌的铁支，kicker只有一个)
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1;
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;

            case HAND_TYPES.FULL_HOUSE:
                if (hand1Details.primary > hand2Details.primary) return 1; // 比较三条部分
                if (hand1Details.primary < hand2Details.primary) return -1;
                if (hand1Details.secondary > hand2Details.secondary) return 1; // 比较对子部分
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                return 0;
            
            case HAND_TYPES.FLUSH:
                 // 比较同花：依次比较从大到小的牌
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;

            case HAND_TYPES.THREE_OF_A_KIND:
                if (hand1Details.primary > hand2Details.primary) return 1;
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 比较kicker
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;

            case HAND_TYPES.TWO_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; // 比较大对
                if (hand1Details.primary < hand2Details.primary) return -1;
                if (hand1Details.secondary > hand2Details.secondary) return 1; // 比较小对
                if (hand1Details.secondary < hand2Details.secondary) return -1;
                if (hand1Details.kickers[0] > hand2Details.kickers[0]) return 1; // 比较单张
                if (hand1Details.kickers[0] < hand2Details.kickers[0]) return -1;
                return 0;

            case HAND_TYPES.ONE_PAIR:
                if (hand1Details.primary > hand2Details.primary) return 1; // 比较对子
                if (hand1Details.primary < hand2Details.primary) return -1;
                // 比较kickers
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;
            
            case HAND_TYPES.HIGH_CARD:
                 // 比较高牌：依次比较从大到小的牌
                for (let i = 0; i < hand1Details.kickers.length; i++) {
                    if (hand1Details.kickers[i] > hand2Details.kickers[i]) return 1;
                    if (hand1Details.kickers[i] < hand2Details.kickers[i]) return -1;
                }
                return 0;
            default:
                return 0; // 未知或相同
        }
    }
    // --- 核心牌型逻辑结束 ---


    function handleSubmitArrangement() {
        const frontCardsData = Array.from(frontHandDiv.children).map(c => c.cardData);
        const middleCardsData = Array.from(middleHandDiv.children).map(c => c.cardData);
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
        
        // 墩序比较规则: 头墩 <= 中墩 <= 尾墩 (这里用的是小于等于，因为完全相同的牌型也是允许的，只是没有额外加分)
        // 严格来说，如果牌型相同，则比较具体牌值。
        // compareHands返回1表示前者大，-1表示后者大，0表示相同。
        // 我们要验证的是: front <= middle AND middle <= back

        const frontVsMiddle = compareHands(middleHandDetails, frontHandDetails); // 中墩 vs 头墩
        const middleVsBack = compareHands(backHandDetails, middleHandDetails); // 尾墩 vs 中墩

        let isValidOrder = true;
        let orderMessage = "";

        if (frontVsMiddle === -1) { // middle < front (中墩小于头墩，错误)
            isValidOrder = false;
            orderMessage += "错误：中墩牌型小于头墩！<br>";
        }
        if (middleVsBack === -1) { // back < middle (尾墩小于中墩，错误)
            isValidOrder = false;
            orderMessage += "错误：尾墩牌型小于中墩！<br>";
        }
        
        // 特殊情况：三顺子、三同花等特殊牌型判断 (十三水规则)
        // 这里的 getHandDetails 还没有处理十三水特有的三张牌的顺子和同花牌型
        // 头墩(3张): 只能是 乌龙、一对、三条。(有些规则允许小顺子或小同花，如A23, 但不常见)
        // 我们的 getHandDetails 对3张牌只能识别出 三条、一对、乌龙。
        // 如果要支持头墩三张顺子/同花，需要修改getHandDetails
        if (frontCardsData.length === 3) {
            if (frontHandDetails.type.value > HAND_TYPES.THREE_OF_A_KIND.value) {
                // isValidOrder = false; // 暂时不强制，因为有些地方规则头墩可以有小顺子/同花
                // orderMessage += "提示：头墩通常不能大于三条 (除非特殊牌型)。<br>";
            }
        }


        if (isValidOrder) {
            message += "<strong style='color:green;'>墩序正确！</strong>";
            messageArea.className = 'success';
             // 这里可以添加计分逻辑
        } else {
            message += `<strong style='color:red;'>${orderMessage}牌型无效 (倒水)！</strong>`;
            messageArea.className = 'error';
        }

        messageArea.innerHTML = message; // 使用innerHTML来显示换行
        dealButton.disabled = true;
        submitArrangementButton.disabled = true;

        setTimeout(() => {
            dealButton.disabled = false;
            submitArrangementButton.disabled = true; // 确认后，除非重新发牌，否则不能再次提交
            submitArrangementButton.style.display = 'none';
            messageArea.textContent = '可以重新发牌开始新的一局。';
            messageArea.className = '';
        }, 7000); // 延长显示结果的时间
    }
});
