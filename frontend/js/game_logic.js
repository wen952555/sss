// frontend/js/game_logic.js

// (依赖 card_defs.js 中的 SUITS, RANKS, RANK_VALUES, HAND_TYPES, createCardObject)

/**
 * 生成一副标准的52张扑克牌
 * @returns {object[]} 返回包含52个卡牌对象的数组
 */
function createDeck() {
    const deck = [];
    SUITS.forEach(suit => {
        RANKS.forEach(rank => {
            deck.push(createCardObject(rank, suit));
        });
    });
    return deck;
}

/**
 * 洗牌 (Fisher-Yates shuffle)
 * @param {object[]} deck - 要洗的牌堆数组 (会直接修改原数组)
 */
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // ES6解构赋值交换
    }
}

/**
 * 发牌给指定数量的玩家，每人13张
 * @param {object[]} deck - 已经洗好的牌堆
 * @param {number} numPlayers - 玩家数量
 * @returns {object[][]} 返回一个二维数组，每个子数组是一个玩家的13张手牌
 *                       如果牌不够，则返回空数组或部分手牌
 */
function dealHands(deck, numPlayers = 4) {
    const hands = [];
    const cardsPerPlayer = 13;
    if (deck.length < numPlayers * cardsPerPlayer) {
        console.error("Not enough cards in deck to deal.");
        return []; // 或者可以处理部分发牌
    }
    for (let i = 0; i < numPlayers; i++) {
        hands.push([]);
    }
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let j = 0; j < numPlayers; j++) {
            hands[j].push(deck.pop()); // 从牌堆末尾取牌
        }
    }
    return hands;
}

// --- 牌型判断核心逻辑 ---
// 这部分会比较复杂，我们先实现基础的，十三水具体规则很多
// 返回对象: { type: HAND_TYPES.X, score: number, name: string, highCards: number[] (用于同牌型比较) }

/**
 * 评估一手牌 (3张或5张)
 * @param {object[]} hand - 卡牌对象数组
 * @returns {object} 牌型评估结果 { typeScore, name, relevantCardValues }
 */
function evaluateHand(hand) {
    if (!hand || (hand.length !== 3 && hand.length !== 5)) {
        return { typeScore: 0, name: '无效墩', relevantCardValues: [] };
    }

    // 按牌值降序排序 (value在card_defs.js中定义)
    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const values = sortedHand.map(c => c.value);
    const suits = sortedHand.map(c => c.suit);
    const ranks = sortedHand.map(c => c.rank); // '2', 'ace'等

    const isFlush = new Set(suits).size === 1;
    const straightCheck = checkStraight(values); // {isStraight, highCard, isAceLow}
    const isStraight = straightCheck.isStraight;

    const rankCounts = {};
    ranks.forEach(rank => { rankCounts[rank] = (rankCounts[rank] || 0) + 1; });
    const counts = Object.values(rankCounts).sort((a,b) => b-a); // [4,1], [3,2], [3,1,1], [2,2,1], [2,1,1,1]

    let type = HAND_TYPES.HIGH_CARD;
    let relevantCardValues = [...values]; // 默认比较所有牌

    if (hand.length === 5) {
        if (isStraight && isFlush) {
            type = HAND_TYPES.STRAIGHT_FLUSH;
            relevantCardValues = [straightCheck.highCard, ...values]; // 顺子最大牌优先，然后是其他牌
            if(straightCheck.isAceLow) relevantCardValues = [5, 4, 3, 2, 1]; // A2345的比较值
        } else if (counts[0] === 4) {
            type = HAND_TYPES.FOUR_OF_A_KIND;
            const fourRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
            const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
            relevantCardValues = [RANK_VALUES[fourRank], RANK_VALUES[kickerRank]];
        } else if (counts[0] === 3 && counts[1] === 2) {
            type = HAND_TYPES.FULL_HOUSE;
            const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
            const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
            relevantCardValues = [RANK_VALUES[threeRank], RANK_VALUES[pairRank]];
        } else if (isFlush) {
            type = HAND_TYPES.FLUSH;
            relevantCardValues = values; // 比较所有牌
        } else if (isStraight) {
            type = HAND_TYPES.STRAIGHT;
            relevantCardValues = [straightCheck.highCard, ...values];
            if(straightCheck.isAceLow) relevantCardValues = [5, 4, 3, 2, 1];
        } else if (counts[0] === 3) {
            type = HAND_TYPES.THREE_OF_A_KIND;
            const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
            const kickers = ranks.filter(r => r !== threeRank).map(r => RANK_VALUES[r]).sort((a,b)=>b-a);
            relevantCardValues = [RANK_VALUES[threeRank], ...kickers.slice(0,2)];
        } else if (counts[0] === 2 && counts[1] === 2) {
            type = HAND_TYPES.TWO_PAIR;
            const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === 2);
            const pairValues = pairRanks.map(r => RANK_VALUES[r]).sort((a,b)=>b-a);
            const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
            relevantCardValues = [...pairValues, RANK_VALUES[kickerRank]];
        } else if (counts[0] === 2) {
            type = HAND_TYPES.ONE_PAIR;
            const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
            const kickers = ranks.filter(r => r !== pairRank).map(r => RANK_VALUES[r]).sort((a,b)=>b-a);
            relevantCardValues = [RANK_VALUES[pairRank], ...kickers.slice(0,3)];
        }
    } else if (hand.length === 3) { // 头墩
        if (counts[0] === 3) { // 冲三
            type = HAND_TYPES.THREE_OF_A_KIND; // 特殊的三条
            const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
            relevantCardValues = [RANK_VALUES[threeRank]];
        } else if (counts[0] === 2) { // 一对
            type = HAND_TYPES.ONE_PAIR;
            const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
            const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
            relevantCardValues = [RANK_VALUES[pairRank], RANK_VALUES[kickerRank]];
        }
        // 乌龙牌 relevantCardValues 已经是 values
    }

    return {
        typeScore: type.score,
        name: type.name,
        relevantCardValues: relevantCardValues // 用于同牌型比较的值，已排序
    };
}

function checkStraight(sortedValuesDesc) { // values: [14, 10, 9, 8, 7]
    if (sortedValuesDesc.length < 3) return { isStraight: false }; // 至少3张，十三水顺子通常5张
    // A2345 (牌值为 14,5,4,3,2)
    if (sortedValuesDesc.length === 5 &&
        sortedValuesDesc[0] === 14 && sortedValuesDesc[1] === 5 && sortedValuesDesc[2] === 4 &&
        sortedValuesDesc[3] === 3 && sortedValuesDesc[4] === 2) {
        return { isStraight: true, highCard: 5, isAceLow: true }; // A2345顺子以5为最大牌
    }
    // 普通顺子
    for (let i = 0; i < sortedValuesDesc.length - 1; i++) {
        if (sortedValuesDesc[i] - sortedValuesDesc[i+1] !== 1) {
            return { isStraight: false };
        }
    }
    return { isStraight: true, highCard: sortedValuesDesc[0], isAceLow: false };
}

/**
 * 比较两手牌的评估结果
 * @param {object} eval1 - 第一个牌的评估结果
 * @param {object} eval2 - 第二个牌的评估结果
 * @returns {number} 1 if eval1 > eval2, -1 if eval1 < eval2, 0 if equal
 */
function compareEvaluatedHands(eval1, eval2) {
    if (eval1.typeScore > eval2.typeScore) return 1;
    if (eval1.typeScore < eval2.typeScore) return -1;

    // 牌型相同，比较 relevantCardValues
    for (let i = 0; i < Math.min(eval1.relevantCardValues.length, eval2.relevantCardValues.length); i++) {
        if (eval1.relevantCardValues[i] > eval2.relevantCardValues[i]) return 1;
        if (eval1.relevantCardValues[i] < eval2.relevantCardValues[i]) return -1;
    }
    return 0; // 完全相同
}

/**
 * 检查三墩是否倒水
 * @param {object} headEval
 * @param {object} middleEval
 * @param {object} tailEval
 * @returns {boolean} true if 倒水, false otherwise
 */
function isDaoshui(headEval, middleEval, tailEval) {
    if (compareEvaluatedHands(headEval, middleEval) > 0) return true; // 头 > 中
    if (compareEvaluatedHands(middleEval, tailEval) > 0) return true; // 中 > 尾
    return false;
}


// --- 简单AI摆牌逻辑 ---
// (这是一个非常基础的AI，只为让游戏能进行)
/**
 * AI 自动摆牌 (简化版)
 * @param {object[]} hand - AI的13张手牌
 * @returns {object|null} { head: [], middle: [], tail: [], headEval:{}, middleEval:{}, tailEval:{}, isDaoshui: bool } 或 null
 */
function getAIArrangement(hand) {
    if (hand.length !== 13) return null;

    // 策略：尝试所有组合太慢，用一个启发式方法
    // 1. 尝试找出最大的牌型（如同花顺、铁支、葫芦）放在尾墩
    // 2. 然后用剩下的牌在中墩组最好的牌
    // 3. 最后头墩
    // 4. 如果倒水，则调整（例如，降级尾墩或中墩的牌型）
    //
    // 极简化：直接按牌值大小分配，确保不倒水
    // (这通常不是好牌，但能保证不倒水)
    const sortedHand = [...hand].sort((a, b) => a.value - b.value); // 升序

    const potentialArrangements = [];

    // 尝试不同的分割点，这里只是一种非常简单的尝试
    // 实际上，一个好的AI需要枚举更多有意义的组合或使用更复杂的策略
    function tryArrangement(h, m, t) {
        const headCards = h;
        const middleCards = m;
        const tailCards = t;

        const headEval = evaluateHand(headCards);
        const middleEval = evaluateHand(middleCards);
        const tailEval = evaluateHand(tailCards);
        const daoshui = isDaoshui(headEval, middleEval, tailEval);

        if (!daoshui) {
            // 计算一个简单的分数来评估这个摆法，例如三墩牌型分之和
            const score = (headEval.typeScore || 0) + (middleEval.typeScore || 0) * 1.1 + (tailEval.typeScore || 0) * 1.2; // 给中尾墩稍高权重
            potentialArrangements.push({
                head: headCards, middle: middleCards, tail: tailCards,
                headEval, middleEval, tailEval, isDaoshui: daoshui, score
            });
        }
    }

    // 这是一个非常暴力的全组合尝试，对于纯前端可能会非常慢，需要优化
    // C(13,3) * C(10,5) = 72072 种
    // 为了演示，我们只做一个保底策略
    const head = sortedHand.slice(0, 3);
    const middle = sortedHand.slice(3, 8);
    const tail = sortedHand.slice(8, 13);
    tryArrangement(head, middle, tail);


    // 如果没有找到不倒水的（理论上上面那个保底会找到）
    // 或者想找“更好”的，就需要更多组合尝试和评分
    if (potentialArrangements.length > 0) {
        // 简单返回第一个不倒水的，或者可以根据score排序选最好的
        potentialArrangements.sort((a,b) => b.score - a.score); // 按评估分降序
        return potentialArrangements[0];
    }


    // 绝对保底 (如果上面逻辑出问题)
    const fallbackHead = sortedHand.slice(0, 3);
    const fallbackMiddle = sortedHand.slice(3, 8);
    const fallbackTail = sortedHand.slice(8, 13);
    const hE = evaluateHand(fallbackHead);
    const mE = evaluateHand(fallbackMiddle);
    const tE = evaluateHand(fallbackTail);

    return {
        head: fallbackHead, middle: fallbackMiddle, tail: fallbackTail,
        headEval: hE, middleEval: mE, tailEval: tE,
        isDaoshui: isDaoshui(hE, mE, tE), // 应该不会倒水
        score: (hE.typeScore || 0) + (mE.typeScore || 0) + (tE.typeScore || 0)
    };
}

// --- 比牌逻辑 (纯前端，简化版，只比较道数) ---
/**
 * 比较两个玩家摆好的牌，计算得分
 * @param {object} player1Arrangement - 玩家1的摆牌结果 (同 getAIArrangement 返回的结构)
 * @param {object} player2Arrangement - 玩家2的摆牌结果
 * @returns {object} { player1Score: number, player2Score: number, details: string[] }
 */
function comparePlayerHands(player1Arrangement, player2Arrangement) {
    let p1Score = 0;
    const details = [];

    if (player1Arrangement.isDaoshui && player2Arrangement.isDaoshui) {
        details.push("双方都倒水，平局。");
    } else if (player1Arrangement.isDaoshui) {
        p1Score -= 6; // 假设倒水输6道 (打枪)
        details.push("玩家1倒水，输6道。");
    } else if (player2Arrangement.isDaoshui) {
        p1Score += 6; // 玩家2倒水，赢6道
        details.push("AI倒水，玩家1赢6道。");
    } else {
        // 逐墩比较
        const headComp = compareEvaluatedHands(player1Arrangement.headEval, player2Arrangement.headEval);
        let headPoints = headComp;
        // 头冲三算3道
        if (headComp > 0 && player1Arrangement.headEval.typeScore === HAND_TYPES.THREE_OF_A_KIND.score) headPoints = 3;
        if (headComp < 0 && player2Arrangement.headEval.typeScore === HAND_TYPES.THREE_OF_A_KIND.score) headPoints = -3;
        p1Score += headPoints;
        details.push(`头墩: ${headPoints > 0 ? '赢' : (headPoints < 0 ? '输' : '平')} ${Math.abs(headPoints)} 道 (${player1Arrangement.headEval.name} vs ${player2Arrangement.headEval.name})`);

        const middleComp = compareEvaluatedHands(player1Arrangement.middleEval, player2Arrangement.middleEval);
        // 中墩铁支、同花顺有额外道数，这里简化，只算1道
        p1Score += middleComp;
        details.push(`中墩: ${middleComp > 0 ? '赢' : (middleComp < 0 ? '输' : '平')} ${Math.abs(middleComp)} 道 (${player1Arrangement.middleEval.name} vs ${player2Arrangement.middleEval.name})`);

        const tailComp = compareEvaluatedHands(player1Arrangement.tailEval, player2Arrangement.tailEval);
        // 尾墩铁支、同花顺有额外道数
        p1Score += tailComp;
        details.push(`尾墩: ${tailComp > 0 ? '赢' : (tailComp < 0 ? '输' : '平')} ${Math.abs(tailComp)} 道 (${player1Arrangement.tailEval.name} vs ${player2Arrangement.tailEval.name})`);

        // 简单打枪判断 (三墩全胜/全输)
        if (headComp > 0 && middleComp > 0 && tailComp > 0) {
            p1Score = (Math.abs(headPoints) + Math.abs(middleComp) + Math.abs(tailComp)) * 2; // 道数翻倍
            details.push("玩家1打枪！得分翻倍。");
        } else if (headComp < 0 && middleComp < 0 && tailComp < 0) {
            p1Score = -(Math.abs(headPoints) + Math.abs(middleComp) + Math.abs(tailComp)) * 2;
            details.push("AI打枪！玩家1失分翻倍。");
        }
    }

    // TODO: 实现特殊牌型的额外加分 (如一条龙、三同花等)

    return {
        player1Score: p1Score, // 这是“道数”变化，不是最终积分
        player2Score: -p1Score,
        details: details
    };
}
