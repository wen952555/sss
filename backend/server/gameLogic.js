// server/gameLogic.js

// --- Constants ---
const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

// --- Hand Type Definitions ---
const HAND_TYPES = {
    // 5-Card Hands
    ROYAL_FLUSH: { value: 10, name: '同花大顺' },
    STRAIGHT_FLUSH: { value: 9, name: '同花顺' },
    FOUR_OF_A_KIND: { value: 8, name: '铁支' },
    FULL_HOUSE: { value: 7, name: '葫芦' },
    FLUSH: { value: 6, name: '同花' },
    STRAIGHT: { value: 5, name: '顺子' },
    // 3-Card Hands
    THREE_OF_A_KIND: { value: 4, name: '三条' },
    // Universal Hand Types
    TWO_PAIR: { value: 3, name: '两对' },
    ONE_PAIR: { value: 2, name: '对子' },
    HIGH_CARD: { value: 1, name: '高牌' }
};

// Special 13-Card hands, ordered by rank
const SPECIAL_HAND_TYPES = {
    DRAGON: { value: 13, name: '一条龙', score: 13 },
    THIRTEEN_ORPHANS: { value: 12, name: '十三幺', score: 13}, // Example, not standard
    ALL_SUITS: { value: 11, name: '全花色', score: 10}, // J,Q,K,A in various suits
    THREE_FLUSHES: { value: 5, name: '三同花', score: 5 },
    THREE_STRAIGHTS: { value: 4, name: '三顺子', score: 4 },
    SIX_PAIRS: { value: 3, name: '六对半', score: 3 },
    // No special hand
    NONE: { value: 0, name: '无特殊牌', score: 0 }
};

// Scores for specific hand types in specific segments
const SEGMENT_SCORES = {
    front: {
        '三条': 3 // 冲三
    },
    middle: {
        '葫芦': 2, // 中墩葫芦
        '铁支': 8, // 中墩铁支
        '同花顺': 10 // 中墩同花顺
    },
    back: {
        '铁支': 4, // 后墩铁支
        '同花顺': 5, // 后墩同花顺
        '同花大顺': 10 // 后墩同花大顺
    }
};

// --- Deck Operations ---
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank, value: RANK_VALUES[rank] });
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

function dealCards() {
    const deck = shuffleDeck(createDeck());
    return {
        player1: deck.slice(0, 13),
        player2: deck.slice(13, 26),
        player3: deck.slice(26, 39),
        player4: deck.slice(39, 52),
    };
}

// --- Hand Evaluation ---

function getCounts(hand) {
    const rankCounts = hand.reduce((acc, card) => {
        acc[card.rank] = (acc[card.rank] || 0) + 1;
        return acc;
    }, {});
    const suitCounts = hand.reduce((acc, card) => {
        acc[card.suit] = (acc[card.suit] || 0) + 1;
        return acc;
    }, {});
    return { rankCounts, suitCounts };
}

function isFlush(hand) {
    return new Set(hand.map(c => c.suit)).size === 1;
}

function isStraight(hand) {
    if (!hand || hand.length < 3) return { isStraight: false };
    const sortedRanks = [...new Set(hand.map(c => c.value))].sort((a, b) => a - b);
    if (sortedRanks.length !== hand.length) return { isStraight: false };

    const isAceLow = (hand.length === 5 && JSON.stringify(sortedRanks) === JSON.stringify([2, 3, 4, 5, 14])) ||
                     (hand.length === 3 && JSON.stringify(sortedRanks) === JSON.stringify([2, 3, 14]));

    if (isAceLow) {
        const ranks = hand.length === 5 ? [5, 4, 3, 2, 1] : [3, 2, 1];
        return { isStraight: true, highCard: ranks[0], ranks };
    }

    for (let i = 0; i < sortedRanks.length - 1; i++) {
        if (sortedRanks[i + 1] - sortedRanks[i] !== 1) {
            return { isStraight: false };
        }
    }
    return { isStraight: true, highCard: sortedRanks[sortedRanks.length - 1], ranks: sortedRanks.slice().reverse() };
}

// --- 13-Card Special Hand Evaluation ---
function evaluate13CardHand(hand) {
    if (hand.length !== 13) return SPECIAL_HAND_TYPES.NONE;

    const ranks = hand.map(c => c.value).sort((a, b) => a - b);
    const uniqueRanks = [...new Set(ranks)];
    const { rankCounts } = getCounts(hand);

    // 一条龙: A to K straight
    if (uniqueRanks.length === 13) {
        return SPECIAL_HAND_TYPES.DRAGON;
    }

    // 六对半: 6 pairs and one kicker
    const pairCount = Object.values(rankCounts).filter(count => count === 2).length;
    if (pairCount === 6) {
        return SPECIAL_HAND_TYPES.SIX_PAIRS;
    }
    
    return SPECIAL_HAND_TYPES.NONE;
}

function evaluateArrangedSpecialHand(front, middle, back) {
    const isFrontFlush = isFlush(front);
    const isMiddleFlush = isFlush(middle);
    const isBackFlush = isFlush(back);

    if (isFrontFlush && isMiddleFlush && isBackFlush) {
        return SPECIAL_HAND_TYPES.THREE_FLUSHES;
    }

    const isFrontStraight = isStraight(front).isStraight;
    const isMiddleStraight = isStraight(middle).isStraight;
    const isBackStraight = isStraight(back).isStraight;

    if (isFrontStraight && isMiddleStraight && isBackStraight) {
        return SPECIAL_HAND_TYPES.THREE_STRAIGHTS;
    }

    return SPECIAL_HAND_TYPES.NONE;
}


// --- 3-Card Hand Evaluation ---
function evaluate3CardHand(hand) {
    if (!hand || hand.length !== 3) return null;
    const { rankCounts } = getCounts(hand);
    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const ranks = sortedHand.map(c => c.value);

    const counts = Object.values(rankCounts);
    if (counts.includes(3)) {
        const rank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        return { type: HAND_TYPES.THREE_OF_A_KIND, ranks: [RANK_VALUES[rank]], hand: sortedHand };
    }
    if (counts.includes(2)) {
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
        return { type: HAND_TYPES.ONE_PAIR, ranks: [RANK_VALUES[pairRank], RANK_VALUES[kickerRank]], hand: sortedHand };
    }
    return { type: HAND_TYPES.HIGH_CARD, ranks, hand: sortedHand };
}

// --- 5-Card Hand Evaluation ---
function evaluate5CardHand(hand) {
    if (!hand || hand.length !== 5) return null;
    const { rankCounts } = getCounts(hand);
    const sortedHand = [...hand].sort((a, b) => b.value - a.value);
    const ranks = sortedHand.map(c => c.value);

    const flush = isFlush(hand);
    const straight = isStraight(hand);
    
    // Straight Flush / Royal Flush
    if (straight.isStraight && flush) {
        if (straight.highCard === 14) return { type: HAND_TYPES.ROYAL_FLUSH, ranks: straight.ranks, hand: sortedHand };
        return { type: HAND_TYPES.STRAIGHT_FLUSH, ranks: straight.ranks, hand: sortedHand };
    }

    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Four of a Kind
    if (counts[0] === 4) {
        const fourRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
        const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
        return { type: HAND_TYPES.FOUR_OF_A_KIND, ranks: [RANK_VALUES[fourRank], RANK_VALUES[kickerRank]], hand: sortedHand };
    }

    // Full House
    if (counts[0] === 3 && counts[1] === 2) {
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        return { type: HAND_TYPES.FULL_HOUSE, ranks: [RANK_VALUES[threeRank], RANK_VALUES[pairRank]], hand: sortedHand };
    }

    // Flush
    if (flush) {
        return { type: HAND_TYPES.FLUSH, ranks, hand: sortedHand };
    }

    // Straight
    if (straight.isStraight) {
        return { type: HAND_TYPES.STRAIGHT, ranks: straight.ranks, hand: sortedHand };
    }

    // Three of a Kind
    if (counts[0] === 3) {
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        const kickers = Object.keys(rankCounts).filter(r => rankCounts[r] === 1).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        return { type: HAND_TYPES.THREE_OF_A_KIND, ranks: [RANK_VALUES[threeRank], ...kickers], hand: sortedHand };
    }

    // Two Pair
    if (counts[0] === 2 && counts[1] === 2) {
        const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] === 2).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        const kickerRank = Object.keys(rankCounts).find(r => rankCounts[r] === 1);
        return { type: HAND_TYPES.TWO_PAIR, ranks: [...pairRanks, RANK_VALUES[kickerRank]], hand: sortedHand };
    }

    // One Pair
    if (counts[0] === 2) {
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        const kickers = Object.keys(rankCounts).filter(r => rankCounts[r] === 1).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        return { type: HAND_TYPES.ONE_PAIR, ranks: [RANK_VALUES[pairRank], ...kickers], hand: sortedHand };
    }
    
    // High Card
    return { type: HAND_TYPES.HIGH_CARD, ranks, hand: sortedHand };
}

// --- Comparison and Validation ---

function compareEvaluatedHands(eval1, eval2) {
    if (eval1.type.value !== eval2.type.value) {
        return eval1.type.value > eval2.type.value ? 1 : -1;
    }
    for (let i = 0; i < eval1.ranks.length; i++) {
        if (eval1.ranks[i] !== eval2.ranks[i]) {
            return eval1.ranks[i] > eval2.ranks[i] ? 1 : -1;
        }
    }
    return 0; // Hands are identical
}


function isValidHand(front, middle, back) {
    if (front.length !== 3 || middle.length !== 5 || back.length !== 5) {
        return false;
    }

    const frontEval = evaluate3CardHand(front);
    const middleEval = evaluate5CardHand(middle);
    const backEval = evaluate5CardHand(back);

    if (!frontEval || !middleEval || !backEval) return false;

    // Compare back vs middle
    if (compareEvaluatedHands(middleEval, backEval) > 0) {
        return false; // Middle cannot be stronger than back
    }

    // Compare middle vs front
    if (compareEvaluatedHands(frontEval, middleEval) > 0) {
        return false; // Front cannot be stronger than middle
    }

    return true;
}

// --- Player vs. Player Comparison ---

function comparePlayerHands(p1_eval, p2_eval) {
    const results = {
        front: compareEvaluatedHands(p1_eval.front, p2_eval.front),
        middle: compareEvaluatedHands(p1_eval.middle, p2_eval.middle),
        back: compareEvaluatedHands(p1_eval.back, p2_eval.back),
    };

    let p1_score = 0;
    let p2_score = 0;
    let p1_wins = 0;
    let p2_wins = 0;

    // Calculate score for each segment
    Object.entries(results).forEach(([segment, result]) => {
        let segment_score = 1; // Default score for winning a segment

        // Check for special segment bonuses
        if (result > 0) { // Player 1 wins segment
            const p1_hand_type = p1_eval[segment].type.name;
            const bonus = SEGMENT_SCORES[segment]?.[p1_hand_type] || 1;
            segment_score = bonus;
            p1_score += segment_score;
            p1_wins++;
        } else if (result < 0) { // Player 2 wins segment
            const p2_hand_type = p2_eval[segment].type.name;
            const bonus = SEGMENT_SCORES[segment]?.[p2_hand_type] || 1;
            segment_score = bonus;
            p2_score += segment_score;
            p2_wins++;
        }
    });

    // Apply "scoop" (打枪) bonus if one player wins all three segments
    if (p1_wins === 3) {
        p1_score *= 2;
    } else if (p2_wins === 3) {
        p2_score *= 2;
    }

    // The final score is the difference
    const final_p1_score = p1_score - p2_score;
    const final_p2_score = p2_score - p1_score;


    return { p1_score: final_p1_score, p2_score: final_p2_score };
}


module.exports = {
    dealCards,
    comparePlayerHands,
    evaluate13CardHand,
    evaluateArrangedSpecialHand,
    evaluate5CardHand,
    evaluate3CardHand,
    isValidHand,
    compareEvaluatedHands,
    SEGMENT_SCORES,
    SPECIAL_HAND_TYPES
};
