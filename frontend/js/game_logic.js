// frontend/js/game_logic.js
console.log("[GameLogic.js] Loaded");

// (依赖 card_defs.js: SUITS, RANKS, createCard, RANK_VALUES, HAND_TYPE_NAMES)

/**
 * 创建并返回一副洗好的牌
 * @returns {object[]} 卡牌对象数组
 */
function getShuffledDeck() {
    const deck = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            const card = createCard(rank, suit);
            if (card) deck.push(card);
        });
    });

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // console.log("[GameLogic.js] Deck created and shuffled:", deck.length, "cards");
    return deck;
}

/**
 * 从牌堆发牌给指定数量的玩家，每人13张
 * @param {object[]} deck - 洗好的牌堆 (会被修改，牌从末尾发出)
 * @param {number} numPlayers
 * @returns {object[][]} 玩家手牌数组
 */
function dealCardsToPlayers(deck, numPlayers) {
    const hands = Array.from({ length: numPlayers }, () => []);
    const cardsPerHand = 13;

    if (deck.length < numPlayers * cardsPerHand) {
        console.error("[GameLogic.js] Not enough cards in deck to deal!");
        return hands; // 返回空手牌或部分手牌
    }

    for (let i = 0; i < cardsPerHand; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (deck.length > 0) {
                hands[j].push(deck.pop());
            }
        }
    }
    // console.log("[GameLogic.js] Hands dealt:", hands);
    return hands;
}


// --- 牌型判断 (简化版，核心逻辑) ---
function evaluatePokerHand(handCards) { // handCards是Card对象数组
    if (!handCards || (handCards.length !== 3 && handCards.length !== 5)) {
        return { score: 0, name: '-', valuesForTieBreak: [] }; // 无效墩
    }

    const sortedHand = [...handCards].sort((a, b) => b.value - a.value); // 按牌值降序
    const values = sortedHand.map(c => c.value);
    const suits = sortedHand.map(c => c.suit);
    const ranks = sortedHand.map(c => c.rank);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    let straightHighCard = 0;
    let isAceLowStraight = false;

    // 检查顺子 (需要唯一牌值)
    const uniqueValues = [...new Set(values)].sort((a,b) => b-a); // 降序的唯一牌值
    if (uniqueValues.length === sortedHand.length) { // 必须没有重复牌值才能是顺子
        if (uniqueValues.length >= 3) { // 顺子至少3张 (虽然十三水墩是3或5)
             // A2345 (values: 14,5,4,3,2)
            if (uniqueValues.length === 5 && uniqueValues[0] === 14 && uniqueValues[1] === 5 && uniqueValues[2] === 4 && uniqueValues[3] === 3 && uniqueValues[4] === 2) {
                isStraight = true;
                straightHighCard = 5; // A2345顺子以5为最大
                isAceLowStraight = true;
            } else {
                let consecutive = true;
                for (let i = 0; i < uniqueValues.length - 1; i++) {
                    if (uniqueValues[i] - uniqueValues[i+1] !== 1) {
                        consecutive = false;
                        break;
                    }
                }
                if (consecutive) {
                    isStraight = true;
                    straightHighCard = uniqueValues[0];
                }
            }
        }
    }


    const rankCounts = {}; // {'ace':1, '10':2, ...}
    ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
    const counts = Object.values(rankCounts).sort((a,b) => b-a); // [4,1], [3,2], ...

    let handType = { score: 1, name: HAND_TYPE_NAMES.HIGH_CARD, valuesForTieBreak: values };

    if (handCards.length === 5) {
        if (isStraight && isFlush) handType = { score: 9, name: HAND_TYPE_NAMES.STRAIGHT_FLUSH, valuesForTieBreak: isAceLowStraight ? [5,4,3,2,1] : [straightHighCard, ...values.filter(v => v !== straightHighCard && !isAceLowStraight)] };
        else if (counts[0] === 4) {
            const fourRank = Object.keys(rankCounts).find(r => rankCounts[r]===4);
            const kicker = values.find(v => v !== RANK_VALUES[fourRank]);
            handType = { score: 8, name: HAND_TYPE_NAMES.FOUR_OF_A_KIND, valuesForTieBreak: [RANK_VALUES[fourRank], kicker] };
        }
        else if (counts[0] === 3 && counts[1] === 2) {
             const threeRank = Object.keys(rankCounts).find(r => rankCounts[r]===3);
             const pairRank = Object.keys(rankCounts).find(r => rankCounts[r]===2);
             handType = { score: 7, name: HAND_TYPE_NAMES.FULL_HOUSE, valuesForTieBreak: [RANK_VALUES[threeRank], RANK_VALUES[pairRank]] };
        }
        else if (isFlush) handType = { score: 6, name: HAND_TYPE_NAMES.FLUSH, valuesForTieBreak: values };
        else if (isStraight) handType = { score: 5, name: HAND_TYPE_NAMES.STRAIGHT, valuesForTieBreak: isAceLowStraight ? [5,4,3,2,1] : [straightHighCard, ...values.filter(v => v !== straightHighCard && !isAceLowStraight)] };
        else if (counts[0] === 3) {
            const threeRank = Object.keys(rankCounts).find(r => rankCounts[r]===3);
            const kickers = values.filter(v => v !== RANK_VALUES[threeRank]).sort((a,b)=>b-a);
            handType = { score: 4, name: HAND_TYPE_NAMES.THREE_OF_A_KIND, valuesForTieBreak: [RANK_VALUES[threeRank], ...kickers.slice(0,2)] };
        }
        else if (counts[0] === 2 && counts[1] === 2) {
            const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r]===2);
            const pairValues = pairRanks.map(r => RANK_VALUES[r]).sort((a,b)=>b-a);
            const kicker = values.find(v => !pairValues.includes(v));
            handType = { score: 3, name: HAND_TYPE_NAMES.TWO_PAIR, valuesForTieBreak: [...pairValues, kicker] };
        }
        else if (counts[0] === 2) {
            const pairRank = Object.keys(rankCounts).find(r => rankCounts[r]===2);
            const kickers = values.filter(v => v !== RANK_VALUES[pairRank]).sort((a,b)=>b-a);
            handType = { score: 2, name: HAND_TYPE_NAMES.ONE_PAIR, valuesForTieBreak: [RANK_VALUES[pairRank], ...kickers.slice(0,3)] };
        }
    } else if (handCards.length === 3) { // 头墩
        if (counts[0] === 3) {
            const threeRank = Object.keys(rankCounts).find(r => rankCounts[r]===3);
            handType = { score: 4, name: HAND_TYPE_NAMES.THREE_OF_A_KIND, valuesForTieBreak: [RANK_VALUES[threeRank]] }; // 头冲三通常比普通三条大，但基础分一样
        } else if (counts[0] === 2) {
            const pairRank = Object.keys(rankCounts).find(r => rankCounts[r]===2);
            const kicker = values.find(v => v !== RANK_VALUES[pairRank]);
            handType = { score: 2, name: HAND_TYPE_NAMES.ONE_PAIR, valuesForTieBreak: [RANK_VALUES[pairRank], kicker] };
        }
    }
    // console.log(`[GameLogic.js] Evaluated hand: ${handCards.map(c=>c.id).join(',')}`, handType);
    return handType;
}

/**
 * 比较两个已评估的墩
 * @returns 1 if hand1Eval > hand2Eval, -1 if hand1Eval < hand2Eval, 0 if equal
 */
function compareDuns(dun1Eval, dun2Eval) {
    if (dun1Eval.score > dun2Eval.score) return 1;
    if (dun1Eval.score < dun2Eval.score) return -1;
    // 同牌型比大小
    const v1 = dun1Eval.valuesForTieBreak;
    const v2 = dun2Eval.valuesForTieBreak;
    for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
    }
    return 0;
}

/**
 * 检查玩家摆的牌是否倒水
 */
function checkDaoshui(headCards, middleCards, tailCards) {
    const headEval = evaluatePokerHand(headCards);
    const middleEval = evaluatePokerHand(middleCards);
    const tailEval = evaluatePokerHand(tailCards);

    if (compareDuns(headEval, middleEval) > 0) return true; // 头 > 中
    if (compareDuns(middleEval, tailEval) > 0) return true; // 中 > 尾
    return false;
}

/**
 * AI 极简摆牌：按牌值大小顺序摆，小的放头，大的放尾
 * (这通常不是好牌，但能保证不倒水)
 * @param {object[]} aiHand - AI的13张手牌
 * @returns {object} { head: Card[], middle: Card[], tail: Card[] }
 */
function getSimpleAIArrangement(aiHand) {
    const sortedHand = [...aiHand].sort((a, b) => a.value - b.value); // 牌值升序
    return {
        head: sortedHand.slice(0, 3),
        middle: sortedHand.slice(3, 8),
        tail: sortedHand.slice(8, 13)
    };
}

/**
 * 计算玩家与单个AI的比牌结果（道数）
 * @param {object} playerArrangement - { head, middle, tail } 玩家的牌
 * @param {object} aiArrangement - { head, middle, tail } AI的牌
 * @returns {object} { playerScoreChange: number, details: string[] }
 */
function calculateScoreAgainstAI(playerArrangement, aiArrangement) {
    const playerHeadEval = evaluatePokerHand(playerArrangement.head);
    const playerMiddleEval = evaluatePokerHand(playerArrangement.middle);
    const playerTailEval = evaluatePokerHand(playerArrangement.tail);

    const aiHeadEval = evaluatePokerHand(aiArrangement.head);
    const aiMiddleEval = evaluatePokerHand(aiArrangement.middle);
    const aiTailEval = evaluatePokerHand(aiArrangement.tail);

    const playerIsDaoshui = checkDaoshui(playerArrangement.head, playerArrangement.middle, playerArrangement.tail);
    const aiIsDaoshui = checkDaoshui(aiArrangement.head, aiArrangement.middle, aiArrangement.tail);

    let playerScoreChange = 0;
    const details = [];

    details.push(`你的牌: 头(${playerHeadEval.name}) 中(${playerMiddleEval.name}) 尾(${playerTailEval.name}) ${playerIsDaoshui ? '[倒水!]' : ''}`);
    details.push(`AI的牌: 头(${aiHeadEval.name}) 中(${aiMiddleEval.name}) 尾(${aiTailEval.name}) ${aiIsDaoshui ? '[倒水!]' : ''}`);


    if (playerIsDaoshui && aiIsDaoshui) {
        details.push("双方都倒水，本轮平手。");
    } else if (playerIsDaoshui) {
        playerScoreChange = -6; // 简化：倒水输6道（算被打枪）
        details.push("你倒水了，输 6 道。");
    } else if (aiIsDaoshui) {
        playerScoreChange = 6;
        details.push("AI倒水了，你赢 6 道。");
    } else {
        let headScore = 0;
        const headComp = compareDuns(playerHeadEval, aiHeadEval);
        if (headComp !== 0) headScore = headComp > 0 ? 1 : -1;
        // 头冲三特殊算分
        if (playerHeadEval.name === HAND_TYPE_NAMES.THREE_OF_A_KIND && headComp > 0) headScore = 3;
        if (aiHeadEval.name === HAND_TYPE_NAMES.THREE_OF_A_KIND && headComp < 0) headScore = -3;
        details.push(`头墩: ${headScore > 0 ? '赢' : (headScore < 0 ? '输' : '平')} ${Math.abs(headScore)} 道`);
        playerScoreChange += headScore;

        let middleScore = 0;
        const middleComp = compareDuns(playerMiddleEval, aiMiddleEval);
        if (middleComp !== 0) middleScore = middleComp > 0 ? 1 : -1;
        // TODO: 中墩特殊牌型加道 (如铁支、同花顺)
        details.push(`中墩: ${middleScore > 0 ? '赢' : (middleScore < 0 ? '输' : '平')} ${Math.abs(middleScore)} 道`);
        playerScoreChange += middleScore;

        let tailScore = 0;
        const tailComp = compareDuns(playerTailEval, aiTailEval);
        if (tailComp !== 0) tailScore = tailComp > 0 ? 1 : -1;
        // TODO: 尾墩特殊牌型加道
        details.push(`尾墩: ${tailScore > 0 ? '赢' : (tailScore < 0 ? '输' : '平')} ${Math.abs(tailScore)} 道`);
        playerScoreChange += tailScore;

        // 简单打枪判断
        if (headScore > 0 && middleScore > 0 && tailScore > 0) { // 全赢
            playerScoreChange = (Math.abs(headScore) + Math.abs(middleScore) + Math.abs(tailScore)) * 2;
            details.push("打枪！得分翻倍。");
        } else if (headScore < 0 && middleScore < 0 && tailScore < 0) { // 全输
            playerScoreChange = -(Math.abs(headScore) + Math.abs(middleScore) + Math.abs(tailScore)) * 2;
            details.push("被打枪！失分翻倍。");
        }
    }
    details.push(`本轮对该AI总道数变化: ${playerScoreChange > 0 ? '+' : ''}${playerScoreChange}`);
    return { playerScoreChange, details };
}
