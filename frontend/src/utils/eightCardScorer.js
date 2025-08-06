// --- START OF FILE frontend/src/utils/eightCardScorer.js ---

/**
 * eightCardScorer.js - 八张游戏专用比牌计分器 (V2 - 增强比较规则)
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

// --- 辅助函数 ---

const cardObjToString = (card) => `${card.rank}_of_${card.suit}`;
const parseCardString = (cardStr) => {
    const [rank, , suit] = cardStr.split('_');
    return { rank, suit, value: VALUE_ORDER[rank], suitValue: SUIT_ORDER[suit] };
};

function getHandType(cards) {
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

// --- ↓↓↓ 新增/修改的核心比较逻辑 ↓↓↓ ---

/**
 * 计算顺子的“真实”价值用于比较
 * AKQ -> 14, A23 -> 13.5 (特殊值，介于AKQ和KQJ之间), KQJ -> 13, ...
 * @param {Array<Object>} cards - 牌对象数组
 * @returns {number} 顺子的价值
 */
function getStraightValue(cards) {
    const ranks = cards.map(c => c.value).sort((a, b) => a - b);
    if (ranks.includes(14) && ranks.includes(13)) { // A-K-Q
        return 14;
    }
    if (ranks.includes(14) && ranks.includes(2)) { // A-2-3
        return 13.5; // 特殊值，比K-Q-J大，比A-K-Q小
    }
    return ranks[ranks.length - 1]; // 普通顺子，返回最大牌的点数
}

/**
 * 比较两手牌的大小（假设牌型相同）
 * @param {Array<Object>} cardsA - A的牌对象数组
 * @param {Array<Object>} cardsB - B的牌对象数组
 * @returns {number}
 */
function compareSameTypeHands(cardsA, cardsB) {
    const sortedA = [...cardsA].sort((a, b) => b.value - a.value || b.suitValue - a.suitValue);
    const sortedB = [...cardsB].sort((a, b) => b.value - a.value || b.suitValue - a.suitValue);

    // 比较三条、对子、高牌
    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i].value !== sortedB[i].value) return sortedA[i].value - sortedB[i].value;
    }
    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i].suitValue !== sortedB[i].suitValue) return sortedA[i].suitValue - sortedB[i].suitValue;
    }
    return 0;
}

/**
 * 比较单个道次的牌 (主比较函数)
 * @param {Array<Object>} laneA - A的牌道
 * @param {Array<Object>} laneB - B的牌道
 * @returns {number}
 */
function compareLanes(laneA, laneB) {
    const typeA = getHandType(laneA);
    const typeB = getHandType(laneB);

    if (HAND_RANK[typeA] !== HAND_RANK[typeB]) {
        return HAND_RANK[typeA] - HAND_RANK[typeB];
    }
    
    // 牌型相同，进入细分比较
    const cardsA = laneA.map(parseCardString);
    const cardsB = laneB.map(parseCardString);
    
    if (typeA === '同花顺') {
        const suitA = cardsA[0].suitValue;
        const suitB = cardsB[0].suitValue;
        // 1. 先比花色
        if (suitA !== suitB) return suitA - suitB;
        // 2. 花色相同，按顺子规则比大小
        const straightValueA = getStraightValue(cardsA);
        const straightValueB = getStraightValue(cardsB);
        if (straightValueA !== straightValueB) return straightValueA - straightValueB;
        // 3. 顺子大小也相同（只可能都是A23），比A的花色
        const aceA = cardsA.find(c => c.rank === 'ace');
        const aceB = cardsB.find(c => c.rank === 'ace');
        return aceA.suitValue - aceB.suitValue;
    }

    if (typeA === '顺子') {
        const straightValueA = getStraightValue(cardsA);
        const straightValueB = getStraightValue(cardsB);
        if (straightValueA !== straightValueB) return straightValueA - straightValueB;
        // 顺子大小相同（都是A23），比A的花色
        const aceA = cardsA.find(c => c.rank === 'ace');
        const aceB = cardsB.find(c => c.rank === 'ace');
        return aceA.suitValue - aceB.suitValue;
    }

    // 其他牌型（三条、对子、高牌）的比较
    return compareSameTypeHands(cardsA, cardsB);
}

// --- ↑↑↑ 核心比较逻辑结束 ↑↑↑ ---

// (isFoul, getLaneScore 等函数保持不变)
function isFoul(head, middle, tail) {
    if (compareLanes(middle, tail) > 0) return true;
    if (compareLanes(head, middle) > 0) return true;
    return false;
}

function getLaneScore(cards, laneName) {
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


// --- 主计分函数 (保持不变) ---
export function calculateEightCardScores(players) {
    const n = players.length;
    if (n < 2) return new Array(n).fill(0);

    let finalScores = new Array(n).fill(0);

    const playerInfos = players.map(p => ({
        ...p,
        isFoul: isFoul(p.head, p.middle, p.tail)
    }));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const p1 = playerInfos[i];
            const p2 = playerInfos[j];
            let pairScore = 0;

            if (p1.isFoul && !p2.isFoul) {
                pairScore = -3;
            } else if (!p1.isFoul && p2.isFoul) {
                pairScore = 3;
            } else if (p1.isFoul && p2.isFoul) {
                pairScore = 0;
            } else {
                const headComparison = compareLanes(p1.head, p2.head);
                if (headComparison > 0) pairScore += getLaneScore(p1.head, 'head');
                else if (headComparison < 0) pairScore -= getLaneScore(p2.head, 'head');

                const middleComparison = compareLanes(p1.middle, p2.middle);
                if (middleComparison > 0) pairScore += getLaneScore(p1.middle, 'middle');
                else if (middleComparison < 0) pairScore -= getLaneScore(p2.middle, 'middle');
                
                const tailComparison = compareLanes(p1.tail, p2.tail);
                if (tailComparison > 0) pairScore += getLaneScore(p1.tail, 'tail');
                else if (tailComparison < 0) pairScore -= getLaneScore(p2.tail, 'tail');
            }
            
            finalScores[i] += pairScore;
            finalScores[j] -= pairScore;
        }
    }
    return finalScores;
}

// --- END OF FILE frontend/src/utils/eightCardScorer.js ---