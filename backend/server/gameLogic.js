// server/gameLogic.js

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

// Hand types, from highest to lowest
const HAND_TYPES = {
    ROYAL_FLUSH: 10,
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
};

/**
 * 创建一副标准的52张扑克牌
 * @returns {Array<Object>} deck - 一副牌
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Fisher-Yates (aka Knuth) 洗牌算法
 * @param {Array<Object>} deck - 要洗的牌堆
 * @returns {Array<Object>} - 洗好的牌堆
 */
function shuffleDeck(deck) {
  let currentIndex = deck.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [deck[currentIndex], deck[randomIndex]] = [deck[randomIndex], deck[currentIndex]];
  }

  return deck;
}

/**
 * 发牌给四位玩家
 * @returns {Object} - 包含四个玩家手牌的对象
 */
function dealCards() {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);

    const players = {
        player1: shuffledDeck.slice(0, 13),
        player2: shuffledDeck.slice(13, 26),
        player3: shuffledDeck.slice(26, 39),
        player4: shuffledDeck.slice(39, 52),
    };
    return players;
}

// --- Hand Evaluation Logic ---

function getCounts(hand) {
    const counts = {};
    for (const card of hand) {
        counts[card.rank] = (counts[card.rank] || 0) + 1;
    }
    return counts;
}

function isFlush(hand) {
    const firstSuit = hand[0].suit;
    return hand.every(card => card.suit === firstSuit);
}

function isStraight(hand) {
    const sortedRanks = hand.map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);
    // Handle A-2-3-4-5 straight
    if (JSON.stringify(sortedRanks) === JSON.stringify([2, 3, 4, 5, 14])) {
        // In A-5 straight, A is low, but for ranking purposes, we use 5 as high card.
        return { isStraight: true, highCard: 5, ranks: [5, 4, 3, 2, 1] }; // Return sorted ranks for comparison
    }
    let isStraight = true;
    for (let i = 0; i < sortedRanks.length - 1; i++) {
        if (sortedRanks[i+1] - sortedRanks[i] !== 1) {
            isStraight = false;
            break;
        }
    }
    if (!isStraight) return { isStraight: false };

    return { isStraight: true, highCard: sortedRanks[sortedRanks.length - 1], ranks: sortedRanks.reverse() };
}

function evaluate5CardHand(hand) {
    if (!hand || hand.length !== 5) return null;
    const counts = getCounts(hand);
    const rankCounts = Object.values(counts).sort((a, b) => b - a);
    const flush = isFlush(hand);
    const { isStraight: straight, highCard: straightHigh, ranks: straightRanks } = isStraight(hand);
    const sortedRanks = hand.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);

    if (straight && flush) {
        if (straightHigh === 14) return { type: HAND_TYPES.ROYAL_FLUSH, ranks: straightRanks };
        return { type: HAND_TYPES.STRAIGHT_FLUSH, ranks: straightRanks };
    }
    if (rankCounts[0] === 4) {
        const fourRank = Object.keys(counts).find(rank => counts[rank] === 4);
        const kicker = Object.keys(counts).find(rank => counts[rank] === 1);
        return { type: HAND_TYPES.FOUR_OF_A_KIND, ranks: [RANK_VALUES[fourRank], RANK_VALUES[kicker]] };
    }
    if (rankCounts[0] === 3 && rankCounts[1] === 2) {
        const threeRank = Object.keys(counts).find(rank => counts[rank] === 3);
        const pairRank = Object.keys(counts).find(rank => counts[rank] === 2);
        return { type: HAND_TYPES.FULL_HOUSE, ranks: [RANK_VALUES[threeRank], RANK_VALUES[pairRank]] };
    }
    if (flush) {
        return { type: HAND_TYPES.FLUSH, ranks: sortedRanks };
    }
    if (straight) {
        return { type: HAND_TYPES.STRAIGHT, ranks: straightRanks };
    }
    if (rankCounts[0] === 3) {
        const threeRank = Object.keys(counts).find(rank => counts[rank] === 3);
        const kickers = hand.filter(c => c.rank !== threeRank).map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
        return { type: HAND_TYPES.THREE_OF_A_KIND, ranks: [RANK_VALUES[threeRank], ...kickers] };
    }
    if (rankCounts[0] === 2 && rankCounts[1] === 2) {
        const pairs = Object.keys(counts).filter(rank => counts[rank] === 2).map(r => RANK_VALUES[r]).sort((a, b) => b - a);
        const kicker = Object.keys(counts).find(rank => counts[rank] === 1);
        return { type: HAND_TYPES.TWO_PAIR, ranks: [...pairs, RANK_VALUES[kicker]] };
    }
    if (rankCounts[0] === 2) {
        const pairRank = Object.keys(counts).find(rank => counts[rank] === 2);
        const kickers = hand.filter(c => c.rank !== pairRank).map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
        return { type: HAND_TYPES.ONE_PAIR, ranks: [RANK_VALUES[pairRank], ...kickers] };
    }
    return { type: HAND_TYPES.HIGH_CARD, ranks: sortedRanks };
}

function evaluate3CardHand(hand) {
    if (!hand || hand.length !== 3) return null;
    const counts = getCounts(hand);
    const rankCounts = Object.values(counts).sort((a, b) => b - a);
    const sortedRanks = hand.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);

    if (rankCounts[0] === 3) {
        return { type: HAND_TYPES.THREE_OF_A_KIND, ranks: [sortedRanks[0]] };
    }
    if (rankCounts[0] === 2) {
        const pairRank = Object.keys(counts).find(rank => counts[rank] === 2);
        const kicker = Object.keys(counts).find(rank => counts[rank] === 1);
        return { type: HAND_TYPES.ONE_PAIR, ranks: [RANK_VALUES[pairRank], RANK_VALUES[kicker]] };
    }
    return { type: HAND_TYPES.HIGH_CARD, ranks: sortedRanks };
}

// Returns 1 if hand1 > hand2, -1 if hand2 > hand1, 0 if equal
function compareHands(hand1, hand2) {
    const eval1 = hand1.length === 5 ? evaluate5CardHand(hand1) : evaluate3CardHand(hand1);
    const eval2 = hand2.length === 5 ? evaluate5CardHand(hand2) : evaluate3CardHand(hand2);

    if (eval1.type !== eval2.type) {
        return eval1.type > eval2.type ? 1 : -1;
    }
    for (let i = 0; i < eval1.ranks.length; i++) {
        if (eval1.ranks[i] !== eval2.ranks[i]) {
            return eval1.ranks[i] > eval2.ranks[i] ? 1 : -1;
        }
    }
    return 0;
}

function isValidHand(front, middle, back) {
    const frontEval = evaluate3CardHand(front);
    const middleEval = evaluate5CardHand(middle);
    const backEval = evaluate5CardHand(back);

    const middleVsBack = compareHands(middle, back);
    const frontVsMiddle = compareHands(front, middle);

    return middleVsBack <= 0 && frontVsMiddle <= 0;
}


module.exports = { dealCards, evaluate5CardHand, evaluate3CardHand, compareHands, isValidHand };