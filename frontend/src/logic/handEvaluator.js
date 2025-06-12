// frontend/src/logic/handEvaluator.js
import { Card, RANK_SYMBOLS, RANKS } from './card'; // Assuming Card class and constants are here

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
    ROYAL_FLUSH: 9, // Technically a type of Straight Flush

    // Thirteen Water Special Hand Types (can be added if AI considers them)
    // These are for the entire 13 cards, not individual 3/5 card hands.
    // DRAGON: 18, // 至尊清龙 (A-K同花顺, or 13 diff cards)
    // THREE_FLUSHES: 11,
    // THREE_STRAIGHTS: 12,
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


/**
 * Evaluates a hand of cards (3 or 5 cards).
 * @param {Card[]} cardsArray - An array of Card objects.
 * @returns {{type: number, kickers: number[], handCards: Card[], name: string}}
 *  - type: HAND_TYPES enum value.
 *  - kickers: Array of ranks for tie-breaking, sorted by importance.
 *  - handCards: The original cards, sorted for consistency.
 *  - name: String name of the hand type.
 */
export function evaluateHand(cardsArray) {
    if (!cardsArray || cardsArray.length === 0) {
        return { type: HAND_TYPES.HIGH_CARD, kickers: [], handCards: [], name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
    }
    // Defensive copy and sort cards by rank descending
    const cards = [...cardsArray].sort((a, b) => b.rank - a.rank);
    const n = cards.length;

    if (n !== 3 && n !== 5) {
        // For Thirteen Water, we typically evaluate 3-card or 5-card hands.
        // If it's not, treat as high card for simplicity or throw error.
        const kickers = cards.map(c => c.rank);
        return { type: HAND_TYPES.HIGH_CARD, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
    }

    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(rank => { rankCounts[rank] = (rankCounts[rank] || 0) + 1; });

    const isFlush = new Set(suits).size === 1;

    // Check for A-5 straight (Wheel)
    const uniqueRanksSorted = [...new Set(ranks)].sort((a, b) => a - b); // Ascending for A-5 check
    let isAceLowStraight = false;
    if (n === 5 && uniqueRanksSorted.length === 5) {
        // Ranks are [2,3,4,5,14(Ace)]
        if (uniqueRanksSorted[0] === RANKS['2'] &&
            uniqueRanksSorted[1] === RANKS['3'] &&
            uniqueRanksSorted[2] === RANKS['4'] &&
            uniqueRanksSorted[3] === RANKS['5'] &&
            uniqueRanksSorted[4] === RANKS['A']) {
            isAceLowStraight = true;
        }
    }

    let isStraight = false;
    if (uniqueRanksSorted.length === n) { // All ranks must be different
        if (!isAceLowStraight && (ranks[0] - ranks[n - 1] === n - 1)) { // ranks is sorted desc
            isStraight = true;
        } else if (isAceLowStraight) {
            isStraight = true;
        }
    }
    
    // --- Determine Hand Type ---
    // Straight Flush / Royal Flush (only for 5 cards)
    if (n === 5 && isStraight && isFlush) {
        const kickers = isAceLowStraight ? [RANKS['5']] : [ranks[0]]; // Highest card of straight
        // Check for Royal Flush (A, K, Q, J, T of same suit)
        if (ranks[0] === RANKS['A'] && ranks[1] === RANKS['K'] && !isAceLowStraight) {
             return { type: HAND_TYPES.ROYAL_FLUSH, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.ROYAL_FLUSH] };
        }
        return { type: HAND_TYPES.STRAIGHT_FLUSH, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT_FLUSH] };
    }

    // Four of a Kind (only for 5 cards)
    if (n === 5) {
        for (const rank in rankCounts) {
            if (rankCounts[rank] === 4) {
                const quadRank = parseInt(rank);
                const kicker = ranks.find(r => r !== quadRank);
                return { type: HAND_TYPES.FOUR_OF_A_KIND, kickers: [quadRank, kicker], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FOUR_OF_A_KIND] };
            }
        }
    }

    // Full House (only for 5 cards)
    if (n === 5) {
        let threeRank = null, pairRank = null;
        for (const rank in rankCounts) {
            if (rankCounts[rank] === 3) threeRank = parseInt(rank);
            if (rankCounts[rank] === 2) pairRank = parseInt(rank);
        }
        if (threeRank !== null && pairRank !== null) {
            return { type: HAND_TYPES.FULL_HOUSE, kickers: [threeRank, pairRank], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FULL_HOUSE] };
        }
    }

    // Flush (5 cards of same suit, not straight)
    if (n === 5 && isFlush) {
        return { type: HAND_TYPES.FLUSH, kickers: ranks, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.FLUSH] };
    }

    // Straight (5 cards in sequence, not flush)
    if (n === 5 && isStraight) {
        const kickers = isAceLowStraight ? [RANKS['5']] : [ranks[0]];
        return { type: HAND_TYPES.STRAIGHT, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.STRAIGHT] };
    }

    // Three of a Kind
    // For 3-card hand, this is the best normal hand.
    // For 5-card hand, it's distinct from Full House.
    let threeKindRank = null;
    for (const rank in rankCounts) {
        if (rankCounts[rank] === 3) {
            threeKindRank = parseInt(rank);
            break;
        }
    }
    if (threeKindRank !== null) {
        const kickers = [threeKindRank, ...ranks.filter(r => r !== threeKindRank).sort((a,b)=>b-a).slice(0, n === 5 ? 2 : 0)];
        return { type: HAND_TYPES.THREE_OF_A_KIND, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.THREE_OF_A_KIND] };
    }

    // Two Pair (only for 5 cards)
    if (n === 5) {
        const pairsRanks = [];
        for (const rank in rankCounts) {
            if (rankCounts[rank] === 2) pairsRanks.push(parseInt(rank));
        }
        if (pairsRanks.length === 2) {
            pairsRanks.sort((a,b) => b-a); // Higher pair first
            const kicker = ranks.find(r => !pairsRanks.includes(r));
            return { type: HAND_TYPES.TWO_PAIR, kickers: [...pairsRanks, kicker], handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.TWO_PAIR] };
        }
    }

    // One Pair
    // For 3-card hand, second best after Three of a Kind.
    let pairRank = null;
    for (const rank in rankCounts) {
        if (rankCounts[rank] === 2) {
            pairRank = parseInt(rank);
            break;
        }
    }
    if (pairRank !== null) {
        const kickers = [pairRank, ...ranks.filter(r => r !== pairRank).sort((a,b)=>b-a).slice(0, n === 5 ? 3 : 1)];
        return { type: HAND_TYPES.ONE_PAIR, kickers, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.ONE_PAIR] };
    }

    // High Card (乌龙)
    return { type: HAND_TYPES.HIGH_CARD, kickers: ranks, handCards: cards, name: HAND_TYPE_NAMES[HAND_TYPES.HIGH_CARD] };
}


/**
 * Compares two evaluated hands.
 * @param {{type: number, kickers: number[]}} handA - Evaluated hand A.
 * @param {{type: number, kickers: number[]}} handB - Evaluated hand B.
 * @returns {number} 1 if A > B, -1 if A < B, 0 if A === B.
 */
export function compareEvaluatedHands(handA, handB) {
    if (handA.type > handB.type) return 1;
    if (handA.type < handB.type) return -1;

    // Same type, compare kickers
    for (let i = 0; i < handA.kickers.length; i++) {
        if (i >= handB.kickers.length) return 1; // A has more relevant kickers (should not happen if same type of standard poker)
        if (handA.kickers[i] > handB.kickers[i]) return 1;
        if (handA.kickers[i] < handB.kickers[i]) return -1;
    }
    if (handB.kickers.length > handA.kickers.length) return -1; // B has more kickers

    return 0; // Identical
}
