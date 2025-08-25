const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];

export const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}_of_${suit}`);
    }
  }
  return deck;
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealOfflineGame = (playerCount) => {
  const deck = shuffleDeck(createDeck());
  const hands = Array(playerCount).fill(0).map(() => []);
  const cardsPerPlayer = 8;
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let j = 0; j < playerCount; j++) {
      hands[j].push(deck.pop());
    }
  }
  return {
    playerHand: hands[0],
    aiHands: hands.slice(1),
  };
};

export const calculateOfflineScores = (playerHand, aiHands) => {
  const playerBestHand = getBestHand(playerHand);
  const aiBestHands = aiHands.map(getBestHand);

  const results = [];
  let totalScore = 0;

  const hand_type_scores = {
    '高牌': 1, '对子': 2, '两对': 3, '三条': 4, '顺子': 5,
    '同花': 6, '葫芦': 7, '铁支': 8, '同花顺': 10,
  };

  aiBestHands.forEach((aiHand, index) => {
    const comparison = compareHands(playerBestHand, aiHand);
    let score = 0;
    if (comparison > 0) {
      score = hand_type_scores[playerBestHand.name] ?? 1;
    } else if (comparison < 0) {
      score = -(hand_type_scores[aiHand.name] ?? 1);
    }
    totalScore += score;
    results.push({
      opponentName: `AI ${index + 1}`,
      result: comparison > 0 ? 'win' : comparison < 0 ? 'loss' : 'tie',
      score,
      playerBestHand,
      opponentBestHand: aiHand,
    });
  });

  return { totalScore, results };
};

// --- Hand Evaluation Logic (Ported from PHP) ---

export const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

export const HAND_TYPES = {
    HIGH_CARD: { rank: 0, name: '高牌' },
    PAIR: { rank: 1, name: '对子' },
    TWO_PAIR: { rank: 2, name: '两对' },
    THREE_OF_A_KIND: { rank: 3, name: '三条' },
    STRAIGHT: { rank: 4, name: '顺子' },
    FLUSH: { rank: 5, name: '同花' },
    FULL_HOUSE: { rank: 6, name: '葫芦' },
    FOUR_OF_A_KIND: { rank: 7, name: '铁支' },
    STRAIGHT_FLUSH: { rank: 8, name: '同花顺' },
};

export const parseCard = (cardStr) => {
    if (!cardStr) return null;
    const parts = cardStr.split('_');
    return { rank: parts[0], suit: parts[2] };
};

export const evaluateHand = (cards) => {
    if (!cards || cards.length !== 5) {
        return null;
    }

    const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);

    const isFlush = new Set(suits).size === 1;

    const uniqueRanks = [...new Set(ranks)];
    const isStraight = uniqueRanks.length === 5 && (ranks[0] - ranks[4] === 4);
    const isAceLowStraight = JSON.stringify(ranks) === JSON.stringify([14, 5, 4, 3, 2]);

    if (isStraight && isFlush) return { ...HAND_TYPES.STRAIGHT_FLUSH, values: ranks };
    if (isAceLowStraight && isFlush) return { ...HAND_TYPES.STRAIGHT_FLUSH, values: [5, 4, 3, 2, 1] };

    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {});

    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const primaryRanks = Object.keys(rankCounts).sort((a, b) => rankCounts[b] - rankCounts[a] || b - a).map(Number);

    if (counts[0] === 4) return { ...HAND_TYPES.FOUR_OF_A_KIND, values: primaryRanks };
    if (counts[0] === 3 && counts[1] === 2) return { ...HAND_TYPES.FULL_HOUSE, values: primaryRanks };
    if (isFlush) return { ...HAND_TYPES.FLUSH, values: ranks };
    if (isStraight) return { ...HAND_TYPES.STRAIGHT, values: ranks };
    if (isAceLowStraight) return { ...HAND_TYPES.STRAIGHT, values: [5, 4, 3, 2, 1] };
    if (counts[0] === 3) return { ...HAND_TYPES.THREE_OF_A_KIND, values: primaryRanks };
    if (counts[0] === 2 && counts[1] === 2) return { ...HAND_TYPES.TWO_PAIR, values: primaryRanks };
    if (counts[0] === 2) return { ...HAND_TYPES.PAIR, values: primaryRanks };

    return { ...HAND_TYPES.HIGH_CARD, values: ranks };
};

export const compareHands = (handA, handB) => {
    if (!handA || !handB) return 0;
    const rankDifference = handA.rank - handB.rank;
    if (rankDifference !== 0) return rankDifference;

    const valuesA = handA.values;
    const valuesB = handB.values;
    const count = Math.min(valuesA.length, valuesB.length);
    for (let i = 0; i < count; i++) {
        const valueDifference = valuesA[i] - valuesB[i];
        if (valueDifference !== 0) return valueDifference;
    }
    return 0;
};

export const combinations = (arr, k) => {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const first = arr[0];
    const remaining = arr.slice(1);
    const combs_with_first = combinations(remaining, k - 1).map(comb => [first, ...comb]);
    const combs_without_first = combinations(remaining, k);
    return [...combs_with_first, ...combs_without_first];
};

export const getBestHand = (cards) => { // cards are strings
    if (cards.length < 5) return null;
    let bestEval = null;
    const cardCombinations = combinations(cards, 5);

    for (const handArray of cardCombinations) {
        const handObjects = handArray.map(parseCard);
        const currentEval = evaluateHand(handObjects);
        if (!bestEval || compareHands(currentEval, bestEval) > 0) {
            bestEval = currentEval;
        }
    }
    return bestEval;
};
