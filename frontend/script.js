// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const dealButton = document.getElementById('dealButton');
    const sortHandButton = document.getElementById('sortHandButton'); // 假设已在HTML中或动态创建
    const playerHandDiv = document.getElementById('playerHand');
    const frontHandDiv = document.getElementById('frontHand');
    const middleHandDiv = document.getElementById('middleHand');
    const backHandDiv = document.getElementById('backHand');
    const dropZones = [frontHandDiv, middleHandDiv, backHandDiv];
    const messageArea = document.getElementById('messageArea');
    const cardCountSpan = document.getElementById('card-count');
    const submitArrangementButton = document.getElementById('submitArrangement');
    const scoreArea = document.getElementById('scoreArea'); // 新增：显示得分区域

    // --- Constants ---
    const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; // 您的后端API
    const CARD_IMAGE_BASE_PATH = './cards/';

    const CARD_RANKS_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };
    const CARD_SUITS_MAP = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };
    const RANK_DISPLAY_MAP = {'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'};
    const SUIT_DISPLAY_MAP = {'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣'};

    const HAND_TYPES = {
        INVALID: { value: -1, name: '无效牌型', score: 0 }, // 用于墩牌数不正确
        HIGH_CARD: { value: 0, name: '乌龙', score: 0 },
        ONE_PAIR: { value: 1, name: '一对', score: 0 },
        TWO_PAIR: { value: 2, name: '两对', score: 0 },
        THREE_OF_A_KIND: { value: 3, name: '三条', score: 0 }, // 头墩三条通常有额外分
        STRAIGHT: { value: 4, name: '顺子', score: 0 },
        FLUSH: { value: 5, name: '同花', score: 0 },
        FULL_HOUSE: { value: 6, name: '葫芦', score: 0 },
        FOUR_OF_A_KIND: { value: 7, name: '铁支', score: 0 },
        STRAIGHT_FLUSH: { value: 8, name: '同花顺', score: 0 },
        // 特殊牌型 (简化版，只加几个示意)
        CHONG_SAN: { value: 3.5, name: '冲三', score: 3 }, // 头墩三条特殊处理
        ZHONG_DUN_HU_LU: { value: 6.5, name: '中墩葫芦', score: 2 }, // 示例：中墩葫芦额外2分
        ZHONG_DUN_TIE_ZHI: { value: 7.5, name: '中墩铁支', score: 7 },
        ZHONG_DUN_TONG_HUA_SHUN: {value: 8.5, name: '中墩同花顺', score: 10},
        WEI_DUN_TIE_ZHI: { value: 7.6, name: '尾墩铁支', score: 4 }, // 尾墩分数通常比中墩低
        WEI_DUN_TONG_HUA_SHUN: {value: 8.6, name: '尾墩同花顺', score: 5},

        // 更多特殊牌型可以定义在这里，它们的 value 可以设得很高以表示优先
    };

    // --- Game State ---
    let currentHand = [];
    let draggedCard = null;
    let gameScore = 0; // 总得分
    let isGameOver = false;

    // --- Event Listeners ---
    dealButton.addEventListener('click', fetchNewHand);
    if (sortHandButton) sortHandButton.addEventListener('click', sortPlayerHandDisplay);
    submitArrangementButton.addEventListener('click', handleSubmitArrangement);

    // --- Core Functions ---
    async function fetchNewHand() {
        isGameOver = false;
        messageArea.textContent = '正在发牌...';
        messageArea.className = '';
        scoreArea.textContent = ''; // 清空得分显示
        dealButton.disabled = true;
        if (sortHandButton) sortHandButton.disabled = true;
        submitArrangementButton.style.display = 'none';
        playerHandDiv.innerHTML = '';
        dropZones.forEach(zone => {
            zone.innerHTML = '';
            updateHandTypeDisplay(zone, null);
        });
        cardCountSpan.textContent = '0';
        makeCardsStatic(false); // 确保卡牌可拖动

        try {
            // 后端发牌
            const response = await fetch(`${BACKEND_API_URL}?action=deal`);
            if (!response.ok) {
                throw new Error(`后端发牌失败: ${response.status} ${await response.text()}`);
            }
            const data = await response.json();
            if (data.error) {
                 throw new Error(`后端错误: ${data.error}`);
            }
            currentHand = data.hand.map(card => ({
                ...card,
                rankValue: CARD_RANKS_MAP[card.rank],
                suitValue: CARD_SUITS_MAP[card.suit],
                id: card.card_id // 确保有个唯一ID
            }));
            displayHand(sortCards(currentHand));
            messageArea.textContent = '发牌完成！请摆牌。';
            messageArea.className = 'success';
        } catch (error) {
            console.error('获取手牌失败:', error);
            messageArea.textContent = `获取手牌失败: ${error.message}`;
            messageArea.className = 'error';
        } finally {
            dealButton.disabled = false;
            if (sortHandButton) sortHandButton.disabled = false;
        }
    }

    function displayHand(hand) {
        playerHandDiv.innerHTML = '';
        hand.forEach(cardData => {
            playerHandDiv.appendChild(createCardElement(cardData));
        });
        updateCardCount();
        checkArrangementCompletion();
    }

    function createCardElement(cardData) {
        const img = document.createElement('img');
        img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
        const displayName = `${SUIT_DISPLAY_MAP[cardData.suit]}${RANK_DISPLAY_MAP[cardData.rank]}`;
        img.alt = displayName;
        img.title = displayName;
        img.classList.add('card');
        img.draggable = true;
        img.dataset.cardId = cardData.id; // 使用 card_id 作为 dataset
        img.cardData = cardData;

        img.addEventListener('dragstart', (event) => {
            if (isGameOver) { event.preventDefault(); return; }
            draggedCard = event.target;
            event.dataTransfer.setData('text/plain', draggedCard.dataset.cardId); // 兼容某些浏览器
            setTimeout(() => event.target.classList.add('dragging'), 0);
        });

        img.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
            draggedCard = null;
        });
        return img;
    }

    // --- Drag and Drop Logic ---
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', dragOver);
        zone.addEventListener('dragenter', dragEnter);
        zone.addEventListener('dragleave', dragLeave);
        zone.addEventListener('drop', dragDrop);
    });
    playerHandDiv.addEventListener('dragover', dragOver);
    playerHandDiv.addEventListener('dragenter', dragEnter);
    playerHandDiv.addEventListener('dragleave', dragLeave);
    playerHandDiv.addEventListener('drop', dragDropToPlayerHand);

    function dragOver(event) {
        event.preventDefault();
        if (isGameOver || !draggedCard) return;
        const targetZone = event.currentTarget;
        const maxCards = parseInt(targetZone.dataset.maxCards) || Infinity; // playerHandDiv没有maxCards
        if (targetZone.children.length < maxCards) {
            // targetZone.classList.add('over'); // classList.add('over') 移到 dragEnter
        }
    }
    function dragEnter(event) {
        event.preventDefault();
        if (isGameOver || !draggedCard) return;
        const targetZone = event.currentTarget;
        const maxCards = parseInt(targetZone.dataset.maxCards) || Infinity;
         if (targetZone.children.length < maxCards) {
            targetZone.classList.add('over');
        }
    }
    function dragLeave(event) {
        if (isGameOver || !draggedCard) return;
        event.currentTarget.classList.remove('over');
    }
    function dragDrop(event) { // Drop to a Dun
        event.preventDefault();
        if (isGameOver || !draggedCard) return;
        const targetZone = event.currentTarget;
        targetZone.classList.remove('over');
        const maxCards = parseInt(targetZone.dataset.maxCards);

        if (targetZone.children.length < maxCards) {
            const sourceParent = draggedCard.parentElement;
            targetZone.appendChild(draggedCard);
            updateAfterDrop(targetZone, sourceParent);
        } else {
            messageArea.textContent = `此墩已满 (${maxCards}张)!`;
            messageArea.className = 'error';
        }
        draggedCard = null; // 清理
    }
    function dragDropToPlayerHand(event) {
        event.preventDefault();
        if (isGameOver || !draggedCard) return;
        const targetZone = event.currentTarget;
        targetZone.classList.remove('over');
        const sourceParent = draggedCard.parentElement;
        if (sourceParent !== playerHandDiv) { // 只有从墩里拖回来才处理
            targetZone.appendChild(draggedCard);
            updateAfterDrop(targetZone, sourceParent);
        }
        draggedCard = null; // 清理
    }

    function updateAfterDrop(newParent, oldParent) {
        updateCardCount();
        if (dropZones.includes(newParent)) evaluateAndDisplayHandType(newParent);
        if (dropZones.includes(oldParent)) evaluateAndDisplayHandType(oldParent);
        checkArrangementCompletion();
    }

    // --- UI Updates and Checks ---
    function updateCardCount() {
        cardCountSpan.textContent = playerHandDiv.children.length;
    }

    function checkArrangementCompletion() {
        if (isGameOver) return;
        const frontCount = frontHandDiv.children.length;
        const middleCount = middleHandDiv.children.length;
        const backCount = backHandDiv.children.length;

        const allDunsFull = (frontCount === 3 && middleCount === 5 && backCount === 5);
        
        if (allDunsFull) {
            submitArrangementButton.style.display = 'block';
            const validation = validateArrangementFrontend(); // 前端预校验
            if (validation.valid) {
                messageArea.textContent = '牌已摆好，可确认牌型！';
                messageArea.className = 'success';
            } else {
                messageArea.textContent = validation.message;
                messageArea.className = 'error';
            }
        } else {
            submitArrangementButton.style.display = 'none';
            if (messageArea.className !== 'error' && playerHandDiv.children.length > 0) {
                 messageArea.textContent = '请继续摆牌。';
                 messageArea.className = '';
            } else if (playerHandDiv.children.length === 0 && !allDunsFull) {
                messageArea.textContent = '手牌已空，但墩未摆满！';
                messageArea.className = 'error';
            }
        }
    }

    function makeCardsStatic(isStatic) {
        document.querySelectorAll('.card').forEach(card => {
            card.draggable = !isStatic;
            card.style.cursor = isStatic ? 'default' : 'grab';
        });
    }

    function updateHandTypeDisplay(zone, handTypeInfo) {
        let typeDisplay = zone.previousElementSibling; // H3标签
        if (typeDisplay && typeDisplay.tagName === 'H3') {
            let baseText = "";
            if (zone.id === 'frontHand') baseText = "头墩 (3张)";
            else if (zone.id === 'middleHand') baseText = "中墩 (5张)";
            else if (zone.id === 'backHand') baseText = "尾墩 (5张)";

            if (handTypeInfo && handTypeInfo.name) {
                typeDisplay.textContent = `${baseText} - ${handTypeInfo.name}`;
            } else {
                typeDisplay.textContent = baseText;
            }
        }
    }
    
    // --- Sorting ---
    function sortCards(cards, aceLowForStraightEval = false) { // aceLow用于顺子判断A2345
        return [...cards].sort((a, b) => {
            let rankA = a.rankValue;
            let rankB = b.rankValue;
            if (aceLowForStraightEval) { // A2345顺子中A算1
                if (rankA === 14) rankA = 1;
                if (rankB === 14) rankB = 1;
            }
            if (rankB === rankA) {
                return b.suitValue - a.suitValue; // 花色大优先
            }
            return rankB - rankA; // 点数大优先
        });
    }

    function sortPlayerHandDisplay() {
        if (isGameOver) return;
        const handCardsElements = Array.from(playerHandDiv.children);
        const handCardsData = handCardsElements.map(el => el.cardData);
        displayHand(sortCards(handCardsData)); // 使用 displayHand 重绘，保留事件监听
    }
    
    // --- Hand Evaluation (Frontend - for display and pre-validation) ---
    function getCardsFromZone(zone) {
        return Array.from(zone.children).map(el => el.cardData);
    }

    function evaluateAndDisplayHandType(zone) {
        const cards = getCardsFromZone(zone);
        const maxCards = parseInt(zone.dataset.maxCards);
        let handTypeResult = HAND_TYPES.INVALID;

        if (cards.length === maxCards) {
            handTypeResult = evaluateHand(cards, zone.id); // 传递墩位ID用于特殊牌型判断
        }
        updateHandTypeDisplay(zone, handTypeResult);
        return handTypeResult;
    }

    function evaluateHand(cards, dunId = null) { // dunId: 'frontHand', 'middleHand', 'backHand'
        if (!cards || (dunId === 'frontHand' && cards.length !== 3) || (dunId && dunId !== 'frontHand' && cards.length !== 5) ) {
            if ( (dunId === 'frontHand' && cards.length > 0 && cards.length <3) ||
                 (dunId && dunId !== 'frontHand' && cards.length > 0 && cards.length < 5) ) {
                return HAND_TYPES.INVALID; // 牌数不足但有牌
            }
             return HAND_TYPES.HIGH_CARD; // 空墩或牌数正确但无牌型，也可能
        }


        const sortedOriginalCards = sortCards([...cards]); // 用于返回，保留原始A值
        const n = sortedOriginalCards.length;

        const ranks = sortedOriginalCards.map(c => c.rankValue);
        const suits = sortedOriginalCards.map(c => c.suitValue);

        const rankCounts = ranks.reduce((acc, rank) => {
            acc[rank] = (acc[rank] || 0) + 1;
            return acc;
        }, {});
        const counts = Object.values(rankCounts).sort((a, b) => b - a);

        const isFlush = new Set(suits).size === 1;

        // 顺子判断 (A2345 特殊处理, A T J Q K)
        // 为了A2345，我们需要一个特殊排序的ranks副本
        const ranksForStraight = [...ranks].sort((a,b) => a-b); // 升序
        if (ranksForStraight.includes(14)) { // 如果有A
            const aceAsOneRanks = ranksForStraight.map(r => r === 14 ? 1 : r).sort((a,b)=>a-b);
            if (aceAsOneRanks.join(',') === '1,2,3,4,5' && n === 5) { // A,2,3,4,5
                isStraight = true;
                isAceLowStraight = true;
            }
        }
        const uniqueRanks = [...new Set(ranksForStraight)];
        let isStraight = false;
        let isAceLowStraight = false; // 标记是否为A2345顺子

        if (uniqueRanks.length === n) { // 没有重复的牌才可能是顺子
            // 标准顺子 (非A2345)
            if ((uniqueRanks[n-1] - uniqueRanks[0] === n-1)) {
                 isStraight = true;
            }
            // A2345顺子
            if (n === 5 && uniqueRanks.map(r=>r).sort((a,b)=>a-b).join(',') === '2,3,4,5,14') { // A,2,3,4,5 (A是14)
                isStraight = true;
                isAceLowStraight = true;
            }
        }
        
        // 确定牌型
        let handDetails = { cards: sortedOriginalCards, ranks: ranks, mainValue: ranks[0] }; // mainValue 默认是最大牌

        if (isStraight && isFlush) {
            handDetails.type = HAND_TYPES.STRAIGHT_FLUSH;
            handDetails.isAceLowStraight = isAceLowStraight;
            handDetails.mainValue = isAceLowStraight ? 5 : sortedOriginalCards[0].rankValue; // A2345顺子头是5
            // 特殊墩位同花顺加分
            if (dunId === 'middleHand') return { ...HAND_TYPES.ZHONG_DUN_TONG_HUA_SHUN, ...handDetails };
            if (dunId === 'backHand') return { ...HAND_TYPES.WEI_DUN_TONG_HUA_SHUN, ...handDetails };
            return { ...HAND_TYPES.STRAIGHT_FLUSH, ...handDetails };
        }
        if (counts[0] === 4) {
            handDetails.type = HAND_TYPES.FOUR_OF_A_KIND;
            handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 4));
            handDetails.kicker = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1));
             if (dunId === 'middleHand') return { ...HAND_TYPES.ZHONG_DUN_TIE_ZHI, ...handDetails };
             if (dunId === 'backHand') return { ...HAND_TYPES.WEI_DUN_TIE_ZHI, ...handDetails };
            return { ...HAND_TYPES.FOUR_OF_A_KIND, ...handDetails };
        }
        if (counts[0] === 3 && counts[1] === 2) {
            handDetails.type = HAND_TYPES.FULL_HOUSE;
            handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3)); // 三条的rank
            handDetails.pairValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2)); // 对子的rank
            if (dunId === 'middleHand') return { ...HAND_TYPES.ZHONG_DUN_HU_LU, ...handDetails };
            return { ...HAND_TYPES.FULL_HOUSE, ...handDetails };
        }
        if (isFlush) {
            handDetails.type = HAND_TYPES.FLUSH;
            // mainValue已经是最大牌点数
            return { ...HAND_TYPES.FLUSH, ...handDetails };
        }
        if (isStraight) {
            handDetails.type = HAND_TYPES.STRAIGHT;
            handDetails.isAceLowStraight = isAceLowStraight;
            handDetails.mainValue = isAceLowStraight ? 5 : sortedOriginalCards[0].rankValue;
            return { ...HAND_TYPES.STRAIGHT, ...handDetails };
        }
        if (counts[0] === 3) {
            handDetails.type = HAND_TYPES.THREE_OF_A_KIND;
            handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
            handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue);
            // 头墩三条特殊处理
            if (dunId === 'frontHand') return { ...HAND_TYPES.CHONG_SAN, ...handDetails };
            return { ...HAND_TYPES.THREE_OF_A_KIND, ...handDetails };
        }
        if (counts[0] === 2 && counts[1] === 2) {
            handDetails.type = HAND_TYPES.TWO_PAIR;
            const pairRanks = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a,b)=>b-a);
            handDetails.highPairRank = pairRanks[0];
            handDetails.lowPairRank = pairRanks[1];
            handDetails.mainValue = pairRanks[0]; // 以大对为主要比较值
            handDetails.kicker = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1));
            return { ...HAND_TYPES.TWO_PAIR, ...handDetails };
        }
        if (counts[0] === 2) {
            handDetails.type = HAND_TYPES.ONE_PAIR;
            handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2));
            handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue).sort((a,b)=>b-a);
            return { ...HAND_TYPES.ONE_PAIR, ...handDetails };
        }
        
        handDetails.type = HAND_TYPES.HIGH_CARD;
        // mainValue已是最大牌点数
        return { ...HAND_TYPES.HIGH_CARD, ...handDetails };
    }
    
    // --- Hand Comparison (Frontend - for pre-validation) ---
    // 返回: >0 if hand1 > hand2, <0 if hand1 < hand2, 0 if equal
    function compareSingleHands(hand1Info, hand2Info) {
        if (!hand1Info || !hand2Info || !hand1Info.type || !hand2Info.type) return 0; // 无效比较

        // 1. 牌型不同，直接比较牌型值
        if (hand1Info.type.value !== hand2Info.type.value) {
            return hand1Info.type.value - hand2Info.type.value;
        }

        // 2. 牌型相同，比较关键值
        // handInfo.mainValue 已设为该牌型的主要比较点数
        if (hand1Info.mainValue !== hand2Info.mainValue) {
            return hand1Info.mainValue - hand2Info.mainValue;
        }

        // 牌型相同，主要点数也相同，需要进一步比较 (根据牌型细化)
        switch (hand1Info.type.value) {
            case HAND_TYPES.STRAIGHT_FLUSH.value: // 同花顺/顺子，头牌相同则平（十三水不比花）
            case HAND_TYPES.STRAIGHT.value:
                return 0; // 理论上主值相同就一样了

            case HAND_TYPES.FOUR_OF_A_KIND.value: // 铁支带的单张
                return hand1Info.kicker - hand2Info.kicker;

            case HAND_TYPES.FULL_HOUSE.value: // 葫芦，三条相同，比对子
                return hand1Info.pairValue - hand2Info.pairValue;

            case HAND_TYPES.FLUSH.value: // 同花，逐张比较
            case HAND_TYPES.HIGH_CARD.value: // 乌龙，逐张比较
                for (let i = 0; i < hand1Info.cards.length; i++) {
                    if (hand1Info.cards[i].rankValue !== hand2Info.cards[i].rankValue) {
                        return hand1Info.cards[i].rankValue - hand2Info.cards[i].rankValue;
                    }
                }
                // 还相同，比最大牌花色 (某些规则) - 简化不比花色
                return 0;

            case HAND_TYPES.THREE_OF_A_KIND.value: // 三条，比单张 (Kickers)
                 for (let i = 0; i < hand1Info.kickers.length; i++) {
                    if (hand1Info.kickers[i] !== hand2Info.kickers[i]) {
                        return hand1Info.kickers[i] - hand2Info.kickers[i];
                    }
                }
                return 0;

            case HAND_TYPES.TWO_PAIR.value: // 两对，大对小对都相同，比单张
                if (hand1Info.lowPairRank !== hand2Info.lowPairRank) return hand1Info.lowPairRank - hand2Info.lowPairRank;
                return hand1Info.kicker - hand2Info.kicker;

            case HAND_TYPES.ONE_PAIR.value: // 一对，对子相同，比单张 (Kickers)
                for (let i = 0; i < hand1Info.kickers.length; i++) {
                    if (hand1Info.kickers[i] !== hand2Info.kickers[i]) {
                        return hand1Info.kickers[i] - hand2Info.kickers[i];
                    }
                }
                return 0;
        }
        return 0; // 默认平手
    }

    function validateArrangementFrontend() {
        const frontResult = evaluateAndDisplayHandType(frontHandDiv);
        const middleResult = evaluateAndDisplayHandType(middleHandDiv);
        const backResult = evaluateAndDisplayHandType(backHandDiv);

        if (frontResult.type === HAND_TYPES.INVALID || middleResult.type === HAND_TYPES.INVALID || backResult.type === HAND_TYPES.INVALID) {
             return { valid: false, message: "存在牌墩牌数不正确！" };
        }

        // 倒水判断 (头 > 中 或 中 > 尾)
        // compareSingleHands 返回 > 0 表示前者大
        if (compareSingleHands(frontResult, middleResult) > 0) {
            return { valid: false, message: "倒水：头墩大于中墩！", isDaoshui: true };
        }
        if (compareSingleHands(middleResult, backResult) > 0) {
            return { valid: false, message: "倒水：中墩大于尾墩！", isDaoshui: true };
        }

        return { valid: true, message: "牌墩符合规则。", frontResult, middleResult, backResult };
    }

    // --- Scoring (Simplified) ---
    function calculateScore(validationResult) {
        if (!validationResult.valid && validationResult.isDaoshui) {
            return -10; // 倒水罚分 (示例)
        }
        if (!validationResult.valid) {
            return 0; // 其他无效情况不得分
        }
        // 简单计分：各墩牌型基础分相加
        let score = 0;
        score += validationResult.frontResult.type.score || 0;
        score += validationResult.middleResult.type.score || 0;
        score += validationResult.backResult.type.score || 0;
        
        // 模拟打枪：如果对手是个固定牌力，这里可以比一下 (暂不实现)
        // 后期可扩展为与AI或其他玩家比较，计算打枪、全垒打等
        return score;
    }

    // --- Submit and Game End ---
    async function handleSubmitArrangement() {
        submitArrangementButton.disabled = true;
        messageArea.textContent = '正在提交牌型至服务器验证...';
        messageArea.className = '';

        const frontendValidation = validateArrangementFrontend();
        
        const payload = {
            action: 'submit_hand',
            front: getCardsFromZone(frontHandDiv).map(c => c.id),
            middle: getCardsFromZone(middleHandDiv).map(c => c.id),
            back: getCardsFromZone(backHandDiv).map(c => c.id),
        };

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`服务器验证失败: ${response.status} ${await response.text()}`);
            }
            const serverResult = await response.json();

            if (serverResult.error) {
                messageArea.textContent = `后端错误: ${serverResult.error}`;
                messageArea.className = 'error';
                submitArrangementButton.disabled = false;
                return;
            }
            
            // 使用后端返回的结果进行计分和显示
            isGameOver = true;
            makeCardsStatic(true);
            dealButton.disabled = false; // 允许开始下一局
            if (sortHandButton) sortHandButton.disabled = true;
            submitArrangementButton.style.display = 'none';

            if (serverResult.isValid) {
                gameScore = serverResult.score; // 使用服务器计算的得分
                messageArea.textContent = `牌型已确认! ${serverResult.message || ''} 本局得分: ${gameScore}`;
                messageArea.className = 'success';
                scoreArea.textContent = `总分: ${gameScore}`; // 假设单局得分就是总分，或需要累加
                // 更新各墩牌型显示 (如果后端也返回了牌型名称)
                if(serverResult.frontHandType) updateHandTypeDisplay(frontHandDiv, {name: serverResult.frontHandType});
                if(serverResult.middleHandType) updateHandTypeDisplay(middleHandDiv, {name: serverResult.middleHandType});
                if(serverResult.backHandType) updateHandTypeDisplay(backHandDiv, {name: serverResult.backHandType});

            } else {
                gameScore = serverResult.score; // 即便无效，后端也可能返回罚分
                messageArea.textContent = `牌型无效: ${serverResult.message} 本局得分: ${gameScore}`;
                messageArea.className = 'error';
                scoreArea.textContent = `总分: ${gameScore}`;
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            messageArea.textContent = `提交失败: ${error.message}`;
            messageArea.className = 'error';
            submitArrangementButton.disabled = false;
        }
    }
    
    // --- Initial call or setup ---
    // fetchNewHand(); // 或者让用户点击按钮开始
    if (!dealButton) console.error("Deal button not found!");
    if (!playerHandDiv) console.error("Player hand div not found!");
    // ... 其他元素检查

    // 确保按钮存在才添加事件监听
    if (document.getElementById('sortHandButton')) {
         document.getElementById('sortHandButton').addEventListener('click', sortPlayerHandDisplay);
    } else {
        // 如果HTML中没有，动态创建排序按钮 (如之前的代码)
        const dynamicSortButton = document.createElement('button');
        dynamicSortButton.textContent = '手牌排序';
        dynamicSortButton.id = 'sortHandButtonGlobal'; // 给一个不同的ID或确保只有一个
        dynamicSortButton.style.marginLeft = '10px';
        if (dealButton && dealButton.parentNode) {
            dealButton.parentNode.insertBefore(dynamicSortButton, dealButton.nextSibling);
            dynamicSortButton.addEventListener('click', sortPlayerHandDisplay);
        }
    }
});
