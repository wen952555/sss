// backend/gameLogic.js
const { v4: uuidv4 } = require('uuid');

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
// 为了方便图片命名，rank用字符表示，内部处理时可以映射为数值
const RANKS_DISPLAY = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const RANKS_VALUE = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };


function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS_DISPLAY) {
            deck.push({
                suit,
                rank,
                value: RANKS_VALUE[rank],
                id: `${rank}_of_${suit}` // 用于唯一标识和图片名
            });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCards(deck, numPlayers) {
    const hands = Array(numPlayers).fill(null).map(() => []);
    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (deck.length > 0) {
                hands[j].push(deck.pop());
            }
        }
    }
    return hands;
}

// --- 牌型判断和比较 (非常简化，需要大幅扩展) ---
// 牌型等级 (数字越大牌型越大)
const HAND_TYPES = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    // 特殊牌型可以有更高值
    THIRTEEN_ROUNDS: 9, // 一条龙
    // ... 更多特殊牌型
};

// 辅助函数：获取牌的点数统计
function getRankCounts(hand) {
    const counts = {};
    hand.forEach(card => {
        counts[card.rank] = (counts[card.rank] || 0) + 1;
    });
    return counts;
}

// 辅助函数：获取牌的花色统计
function getSuitCounts(hand) {
    const counts = {};
    hand.forEach(card => {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
    });
    return counts;
}
// 辅助函数：检查是否为顺子
function isStraight(hand) {
    if (hand.length !== 5 && hand.length !== 3) return false; // 简化，头墩可以是三张顺子
    const sortedValues = hand.map(c => c.value).sort((a, b) => a - b);
    // 处理 A2345 顺子
    if (JSON.stringify(sortedValues) === JSON.stringify([2,3,4,5,14])) { // A,2,3,4,5
        return { is: true, highCardValue: 5 }; // A2345顺子，5最大
    }
    for (let i = 0; i < sortedValues.length - 1; i++) {
        if (sortedValues[i+1] - sortedValues[i] !== 1) return { is: false };
    }
    return { is: true, highCardValue: sortedValues[sortedValues.length - 1] };
}

// 辅助函数：检查是否为同花
function isFlush(hand) {
    if (hand.length < 3) return false; // 至少3张才能是同花（如头墩）
    const firstSuit = hand[0].suit;
    return hand.every(card => card.suit === firstSuit);
}


// 主要牌型判断函数 (简化版)
// 返回 { type: HAND_TYPES, primaryRankValue: number, secondaryRankValue?: number, kickerValues?: number[] }
// primaryRankValue 用于比较相同牌型，如对A > 对K
// kickerValues 用于比较高牌等情况
function evaluateHand(hand) {
    if (!hand || hand.length === 0) return { type: HAND_TYPES.HIGH_CARD, primaryRankValue: 0 };
    
    hand.sort((a, b) => b.value - a.value); // 按点数降序排序，方便取高牌

    const rankCounts = getRankCounts(hand);
    const suitCounts = getSuitCounts(hand);
    const ranks = Object.keys(rankCounts).map(r => RANKS_VALUE[r]).sort((a,b)=>b-a);
    const values = hand.map(c => c.value).sort((a, b) => b - a);


    const flush = isFlush(hand);
    const straightInfo = isStraight(hand); // isStraight现在也需要处理3张牌的情况

    // 简化判断，头墩3张，中尾墩5张
    if (hand.length === 3) {
        const counts = Object.values(rankCounts);
        if (counts.includes(3)) { // 三条
             return { type: HAND_TYPES.THREE_OF_A_KIND, primaryRankValue: ranks[0] };
        }
        if (straightInfo.is && flush) { // 三张同花顺 (特殊) - 假设不常见，先不处理
             // 一般十三水头墩不计同花顺和顺子，除非特殊规则
        }
        if (counts.includes(2)) { // 对子
            const pairRank = RANKS_VALUE[Object.keys(rankCounts).find(r => rankCounts[r] === 2)];
            const kicker = values.find(v => v !== pairRank);
            return { type: HAND_TYPES.PAIR, primaryRankValue: pairRank, kickerValues: [kicker] };
        }
        return { type: HAND_TYPES.HIGH_CARD, primaryRankValue: values[0], kickerValues: values.slice(1) };
    }

    if (hand.length === 5) {
        if (straightInfo.is && flush) {
            return { type: HAND_TYPES.STRAIGHT_FLUSH, primaryRankValue: straightInfo.highCardValue };
        }
        const countsValues = Object.values(rankCounts);
        if (countsValues.includes(4)) { // 铁支
            const fourRank = RANKS_VALUE[Object.keys(rankCounts).find(r => rankCounts[r] === 4)];
            return { type: HAND_TYPES.FOUR_OF_A_KIND, primaryRankValue: fourRank };
        }
        if (countsValues.includes(3) && countsValues.includes(2)) { // 葫芦
            const threeRank = RANKS_VALUE[Object.keys(rankCounts).find(r => rankCounts[r] === 3)];
            const pairRank = RANKS_VALUE[Object.keys(rankCounts).find(r => rankCounts[r] === 2)];
            return { type: HAND_TYPES.FULL_HOUSE, primaryRankValue: threeRank, secondaryRankValue: pairRank };
        }
        if (flush) {
            return { type: HAND_TYPES.FLUSH, primaryRankValue: values[0], kickerValues: values.slice(1) };
        }
        if (straightInfo.is) {
            return { type: HAND_TYPES.STRAIGHT, primaryRankValue: straightInfo.highCardValue };
        }
        if (countsValues.includes(3)) { // 三条
            const threeRank = RANKS_VALUE[Object.keys(rankCounts).find(r => rankCounts[r] === 3)];
            const kickers = values.filter(v => v !== threeRank).slice(0,2);
            return { type: HAND_TYPES.THREE_OF_A_KIND, primaryRankValue: threeRank, kickerValues: kickers };
        }
        const pairs = Object.keys(rankCounts).filter(r => rankCounts[r] === 2).map(r => RANKS_VALUE[r]).sort((a,b)=>b-a);
        if (pairs.length === 2) { // 两对
            const kicker = values.find(v => !pairs.includes(v));
            return { type: HAND_TYPES.TWO_PAIR, primaryRankValue: pairs[0], secondaryRankValue: pairs[1], kickerValues: [kicker] };
        }
        if (pairs.length === 1) { // 一对
            const kickers = values.filter(v => v !== pairs[0]).slice(0,3);
            return { type: HAND_TYPES.PAIR, primaryRankValue: pairs[0], kickerValues: kickers };
        }
        return { type: HAND_TYPES.HIGH_CARD, primaryRankValue: values[0], kickerValues: values.slice(1,5) };
    }
    return { type: HAND_TYPES.HIGH_CARD, primaryRankValue: 0 }; // Should not happen for 3 or 5 cards
}

// 比较两手牌 (A vs B)
// 返回: 1 如果 handA > handB, -1 如果 handA < handB, 0 如果平手
function compareSingleHand(evalA, evalB) {
    if (evalA.type !== evalB.type) {
        return evalA.type > evalB.type ? 1 : -1;
    }
    // 牌型相同，比较主要点数
    if (evalA.primaryRankValue !== evalB.primaryRankValue) {
        return evalA.primaryRankValue > evalB.primaryRankValue ? 1 : -1;
    }
    // 比较次要点数 (如葫芦的对子，两对的小对)
    if (evalA.secondaryRankValue && evalB.secondaryRankValue && evalA.secondaryRankValue !== evalB.secondaryRankValue) {
        return evalA.secondaryRankValue > evalB.secondaryRankValue ? 1 : -1;
    }
    // 比较 Kicker
    if (evalA.kickerValues && evalB.kickerValues) {
        for (let i = 0; i < Math.min(evalA.kickerValues.length, evalB.kickerValues.length); i++) {
            if (evalA.kickerValues[i] !== evalB.kickerValues[i]) {
                return evalA.kickerValues[i] > evalB.kickerValues[i] ? 1 : -1;
            }
        }
    }
    return 0; // 平手
}


// 验证三墩牌是否合法 (头墩 < 中墩 < 尾墩)
// hands = { front: Card[], middle: Card[], back: Card[] }
function isValidArrangement(arrangedHands) {
    const evalFront = evaluateHand(arrangedHands.front);
    const evalMiddle = evaluateHand(arrangedHands.middle);
    const evalBack = evaluateHand(arrangedHands.back);

    // console.log("Eval Front:", evalFront);
    // console.log("Eval Middle:", evalMiddle);
    // console.log("Eval Back:", evalBack);

    const middleVsFront = compareSingleHand(evalMiddle, evalFront);
    const backVsMiddle = compareSingleHand(evalBack, evalMiddle);
    
    // 中墩必须大于等于头墩，尾墩必须大于等于中墩
    // 如果牌型相同，则比较点数。严格来说，十三水不允许完全相同的牌型和点数（除非特殊规则或多副牌）
    // 这里简化为：如果牌型相同，则点数也必须分出大小，否则视为不合法（除非规则允许平手墩）
    // 倒水：前面比后面大
    if (middleVsFront === -1) return false; // 中墩 < 头墩
    if (backVsMiddle === -1) return false; // 尾墩 < 中墩

    return true;
}

// 比较两个玩家的三墩牌，计算得分 (非常简化)
// playerA_arrangedHands, playerB_arrangedHands
// 返回: { playerAScore: number, playerBScore: number, details: [] }
function compareAllHands(playerA, playerB) {
    let scoreA = 0;
    let scoreB = 0;
    const details = []; // [{ dun: 'front', winner: 'A'/'B'/'Draw', points: 1 }, ...]

    const handsA = playerA.arrangedHandsEvaluated;
    const handsB = playerB.arrangedHandsEvaluated;

    const compareAndScore = (dunKey, points) => {
        const result = compareSingleHand(handsA[dunKey], handsB[dunKey]);
        if (result === 1) {
            scoreA += points;
            details.push({ dun: dunKey, winner: playerA.id, points });
        } else if (result === -1) {
            scoreB += points;
            details.push({ dun: dunKey, winner: playerB.id, points });
        } else {
            details.push({ dun: dunKey, winner: 'Draw', points: 0 });
        }
    };

    compareAndScore('front', 1); // 头墩1水
    compareAndScore('middle', 1); // 中墩1水
    compareAndScore('back', 1); // 尾墩1水
    
    // 简化的打枪逻辑：如果一方三墩全胜，则得分翻倍 (普通打枪)
    let aWins = 0;
    let bWins = 0;
    details.forEach(d => {
        if (d.winner === playerA.id) aWins++;
        if (d.winner === playerB.id) bWins++;
    });

    if (aWins === 3 && bWins === 0) { // A打枪B
        scoreA *= 2; // 假设基础分翻倍
        details.push({ type: 'shoot', shooter: playerA.id, target: playerB.id, multiplier: 2 });
    } else if (bWins === 3 && aWins === 0) { // B打枪A
        scoreB *= 2;
        details.push({ type: 'shoot', shooter: playerB.id, target: playerA.id, multiplier: 2 });
    }
    
    // TODO: 处理特殊牌型加分 (如三同花、三顺子、全垒打等)

    return { playerAScore: scoreA, playerBScore: scoreB, details };
}


module.exports = {
    createDeck,
    shuffleDeck,
    dealCards,
    evaluateHand,
    isValidArrangement,
    compareAllHands,
    compareSingleHand,
    HAND_TYPES,
    uuidv4,
    RANKS_VALUE // 导出RANKS_VALUE方便前端使用
};
