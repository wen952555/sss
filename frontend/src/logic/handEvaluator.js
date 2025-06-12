// frontend/src/logic/handEvaluator.js
// 移除了 Card 和 RANK_SYMBOLS 的导入，保留 RANKS 因为 A-5 顺子判断中用到了
import { RANKS } from './card';

export const HAND_TYPES = {
    HIGH_CARD: 0,
    ONE_PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9,
};

export const HAND_TYPE_NAMES = {
    [HAND_TYPES.HIGH_CARD]: "乌龙",
    [HAND_TYPES.ONE_PAIR]: "一对",
    [HAND_TYPES.TWO_PAIR]: "两对",
    [HAND_TYPES.THREE_OF_A_KIND]: "三条",
    [HAND_TYPES.STRAIGHT]: "顺子",
    [HAND_TYPES.FLUSH]: "同花",
    [HAND_TYPES.FULL_HOUSE]: "葫芦",
    [HAND_TYPES.FOUR_OF_A_KIND]: "铁支",
    [HAND_TYPES.STRAIGHT_FLUSH]: "同花顺",
    [HAND_TYPES.ROYAL_FLUSH]: "同花大顺",
};

export function evaluateHand(cardsArray) {
    if (!cardsArray || cardsArray.length === 0) {
        return { type: HAND_TYPES.HIGH_CARD, kickers: [], handCards: [], name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
    }
    const cards = [...cardsArray].sort((a, b) => b.rank - a.rank);
    const n = cards.length;

    if (n !== 3 && n !== 5) {
        const kickers = cards.map(c => c.rank);
        return { type: HAND_TYPES.HIGH_CARD, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
    }

    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(rank => { rankCounts[rank] = (rankCounts[rank] || 0) + 1; });

    const isFlush = new Set(suits).size === 1;
    const uniqueRanksSorted = [...new Set(ranks)].sort((a, b) => a - b);
    let isAceLowStraight = false;
    if (n === 5 && uniqueRanksSorted.length === 5) {
        if (uniqueRanksSorted[0] === RANKS['2'] &&
            uniqueRanksSorted[1] === RANKS['3'] &&
            uniqueRanksSorted[2] === RANKS['4'] &&
            uniqueRanksSorted[3] === RANKS['5'] &&
            uniqueRanksSorted[4] === RANKS['A']) { // RANKS['A'] 是 14
            isAceLowStraight = true;
        }
    }

    let isStraight = false;
    if (uniqueRanksSorted.length === n) {
        if (!isAceLowStraight && (ranks[0] - ranks[n - 1] === n - 1)) {
            isStraight = true;
        } else if (isAceLowStraight) {
            isStraight = true;
        }
    }
    
    if (n === 5 && isStraight && isFlush) {
        // Ace-low straight flush (A2345s) uses 5 as the high card for kicker comparison.
        const kickers = isAceLowStraight ? [RANKS['5']] : [ranks[0]];
        if (ranks[0] === RANKS['A'] && ranks[1] === RANKS['K'] && !isAceLowStraight) {
             return { type: HAND_TYPES.ROYAL_FLUSH, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.ROYAL_FLUSH] };
        }
        return { type: HAND_TYPES.STRAIGHT_FLUSH, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT_FLUSH] };
    }

    if (n === 5) {
        for (const rankKey in rankCounts) {
            if (rankCounts[rankKey] === 4) {
                const quadRank = parseInt(rankKey);
                const kicker = ranks.find(r => r !== quadRank); // kicker can be undefined if no other card (not possible in 5 cards)
                return { type: HAND_TYPES.FOUR_OF_A_KIND, kickers: [quadRank, kicker], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FOUR_OF_A_KIND] };
            }
        }
    }

    if (n === 5) {
        let threeRank = null, pairRank = null;
        for (const rankKey in rankCounts) {
            if (rankCounts[rankKey] === 3) threeRank = parseInt(rankKey);
            if (rankCounts[rankKey] === 2) pairRank = parseInt(rankKey);
        }
        if (threeRank !== null && pairRank !== null) {
            return { type: HAND_TYPES.FULL_HOUSE, kickers: [threeRank, pairRank], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FULL_HOUSE] };
        }
    }

    if (n === 5 && isFlush) {
        return { type: HAND_TYPES.FLUSH, kickers: ranks, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FLUSH] };
    }

    if (n === 5 && isStraight) {
        const kickers = isAceLowStraight ? [RANKS['5']] : [ranks[0]];
        return { type: HAND_TYPES.STRAIGHT, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT] };
    }

    let threeKindRank = null;
    for (const rankKey in rankCounts) {
        if (rankCounts[rankKey] === 3) {
            threeKindRank = parseInt(rankKey);
            break;
        }
    }
    if (threeKindRank !== null) {
        const kickers = [threeKindRank, ...ranks.filter(r => r !== threeKindRank).sort((a,b)=>b-a).slice(0, n === 5 ? 2 : 0)];
        return { type: HAND_TYPES.THREE_OF_A_KIND, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.THREE_OF_A_KIND] };
    }

    if (n === 5) {
        const pairsRanks = [];
        for (const rankKey in rankCounts) {
            if (rankCounts[rankKey] === 2) pairsRanks.push(parseInt(rankKey));
        }
        if (pairsRanks.length === 2) {
            pairsRanks.sort((a,b) => b-a);
            const kicker = ranks.find(r => !pairsRanks.includes(r));
            return { type: HAND_TYPES.TWO_PAIR, kickers: [...pairsRanks, kicker], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.TWO_PAIR] };
        }
    }

    let pairRank = null;
    for (const rankKey in rankCounts) {
        if (rankCounts[rankKey] === 2) {
            pairRank = parseInt(rankKey);
            break;
        }
    }
    if (pairRank !== null) {
        const kickers = [pairRank, ...ranks.filter(r => r !== pairRank).sort((a,b)=>b-a).slice(0, n === 5 ? 3 : 1)];
        return { type: HAND_TYPES.ONE_PAIR, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.ONE_PAIR] };
    }

    return { type: HAND_TYPES.HIGH_CARD, kickers: ranks, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
}

export function compareEvaluatedHands(handA, handB) {
    if (handA.type > handB.type) return 1;
    if (handA.type < handB.type) return -1;

    for (let i = 0; i < handA.kickers.length; i++) {
        if (i >= handB.kickers.length) return 1;
        if (handA.kickers[i] > handB.kickers[i]) return 1;
        if (handA.kickers[i] < handB.kickers[i]) return -1;
    }
    if (handB.kickers.length > handA.kickers.length) return -1;
    return 0;
}
