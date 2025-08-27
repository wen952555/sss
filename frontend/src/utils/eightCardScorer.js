// --- START OF FILE frontend/src/utils/eightCardScorer.js (MODIFIED) ---

/**
 * eightCardScorer.js - 八张游戏专用比牌计分器 (V3 - 修复平局比较规则)
 * 规则：
 * - 牌型：同花顺 > 三条 > 顺子 > 对子 > 高牌
 * - 花色：黑桃 > 红桃 > 梅花 > 方块
 * - 计分：根据牌道和牌型有特殊加水
 * - 顺子比较：AKQ > A23 > KQJ ...
 * - 同花顺比较：先比花色，再比顺子大小
 */

const VALUE_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };
const SUIT_ORDER = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };
const HAND_RANK = { '同花顺': 5, '三条': 4, '顺子': 3, '对子': 2, '高牌': 1 };

const parseCardString = (cardStr) => {
    const [rank, , suit] = cardStr.split('_');
    return { rank, suit, value: VALUE_ORDER[rank], suitValue: SUIT_ORDER[suit] };
};

export function getHandType(cards) {
    if (!cards || cards.length === 0) return '高牌';
    const n = cards.length;
    const ranks = cards.map(c => VALUE_ORDER[c.rank]).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);
    
    const isFlush = new Set(suits).size === 1;
    const isStraight = (new Set(ranks).size === n) && (ranks[n - 1] - ranks[0] === n - 1 || JSON.stringify(ranks) === JSON.stringify([2, 3, 14]));

    if (isStraight && isFlush) return '同花顺';
    
    const rankCounts = ranks.reduce((acc, rank) => { acc[rank] = (acc[rank] || 0) + 1; return acc; }, {});
    const counts = Object.values(rankCounts);

    if (counts.includes(3)) return '三条';
    if (isStraight) return '顺子';
    if (counts.includes(2)) return '对子';
    
    return '高牌';
}

function getStraightValue(cards) {
    const ranks = cards.map(c => c.value).sort((a, b) => a - b);
    if (ranks.includes(14) && ranks.includes(13)) return 14;
    if (ranks.includes(14) && ranks.includes(2)) return 13.5;
    return ranks[ranks.length - 1];
}

function compareSameTypeHands(cardsA, cardsB) {
    const sortedA = [...cardsA].sort((a, b) => b.value - a.value || b.suitValue - a.suitValue);
    const sortedB = [...cardsB].sort((a, b) => b.value - a.value || b.suitValue - a.suitValue);

    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i].value !== sortedB[i].value) return sortedA[i].value - sortedB[i].value;
    }
    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i].suitValue !== sortedB[i].suitValue) return sortedA[i].suitValue - sortedB[i].suitValue;
    }
    return 0;
}

// --- 核心修复：重写此函数，使其逻辑更健壮 ---
export function compareLanes(laneA, laneB) {
    const typeA = getHandType(laneA);
    const typeB = getHandType(laneB);

    if (HAND_RANK[typeA] !== HAND_RANK[typeB]) {
        return HAND_RANK[typeA] - HAND_RANK[typeB];
    }
    
    // 如果牌型相同，则进行详细比较
    const cardsA = laneA.map(c => ({...c, value: VALUE_ORDER[c.rank], suitValue: SUIT_ORDER[c.suit]}));
    const cardsB = laneB.map(c => ({...c, value: VALUE_ORDER[c.rank], suitValue: SUIT_ORDER[c.suit]}));
    
    if (typeA === '同花顺') {
        const suitA = cardsA[0].suitValue;
        const suitB = cardsB[0].suitValue;
        if (suitA !== suitB) return suitA - suitB; // 1. 比较花色
    }

    if (typeA === '同花顺' || typeA === '顺子') {
        const straightValueA = getStraightValue(cardsA);
        const straightValueB = getStraightValue(cardsB);
        if (straightValueA !== straightValueB) return straightValueA - straightValueB; // 2. 比较顺子大小
    }

    // 3. 对于所有其他平局情况（包括三条、对子、高牌，以及顺子/同花顺的最终比较），
    // 使用通用的、从大到小逐张比较的方法。
    return compareSameTypeHands(cardsA, cardsB);
}

function isFoul(head, middle, tail) {
    if (compareLanes(middle, tail) > 0) return true;
    if (compareLanes(head, middle) > 0) return true;
    return false;
}

export function getLaneScore(cards, laneName) {
    const type = getHandType(cards);
    switch (laneName) {
        case 'head':
            if (type === '对子') return VALUE_ORDER[cards[0].rank];
            break;
        case 'middle':
            if (type === '同花顺') return 10;
            if (type === '三条') return 6;
            break;
        case 'tail':
            if (type === '同花顺') return 5;
            if (type === '三条') return 3;
            break;
    }
    return 1;
}

export function calculateSinglePairScoreForEight(p1, p2) {
    const p1Info = { ...p1, isFoul: isFoul(p1.head, p1.middle, p1.tail) };
    const p2Info = { ...p2, isFoul: isFoul(p2.head, p2.middle, p2.tail) };
    
    let pairScore = 0;
    if (p1Info.isFoul && !p2Info.isFoul) pairScore = -3;
    else if (!p1Info.isFoul && p2Info.isFoul) pairScore = 3;
    else if (p1Info.isFoul && p2Info.isFoul) pairScore = 0;
    else {
        const headComparison = compareLanes(p1Info.head, p2Info.head);
        if (headComparison > 0) pairScore += getLaneScore(p1Info.head, 'head');
        else if (headComparison < 0) pairScore -= getLaneScore(p2Info.head, 'head');

        const middleComparison = compareLanes(p1Info.middle, p2Info.middle);
        if (middleComparison > 0) pairScore += getLaneScore(p1Info.middle, 'middle');
        else if (middleComparison < 0) pairScore -= getLaneScore(p2Info.middle, 'middle');
        
        const tailComparison = compareLanes(p1Info.tail, p2Info.tail);
        if (tailComparison > 0) pairScore += getLaneScore(p1Info.tail, 'tail');
        else if (tailComparison < 0) pairScore -= getLaneScore(p2Info.tail, 'tail');
    }
    return pairScore;
}

export function calculateEightCardScores(players) {
    const n = players.length;
    if (n < 2) return new Array(n).fill(0);
    let finalScores = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const pairScore = calculateSinglePairScoreForEight(players[i], players[j]);
            finalScores[i] += pairScore;
            finalScores[j] -= pairScore;
        }
    }
    return finalScores;
}

// --- END OF FILE frontend/src/utils/eightCardScorer.js (MODIFIED) ---