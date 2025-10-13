// frontend/src/utils/pokerEvaluator.js

// Defines the order and value of card ranks in one structure.
export const RANKS = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

// Defines hand types and their strength hierarchy.
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

/**
 * Parses a card string (e.g., 'ace_of_spades') into an object.
 * @param {string} cardStr The card string.
 * @returns {{rank: string, suit: string, value: number}}
 */
export const parseCard = (cardStr) => {
    if (!cardStr) return null;
    const parts = cardStr.split('_');
    if (parts.length < 3) return null;
    return { rank: parts[0], suit: parts[2], value: RANKS[parts[0]] };
};

/**
 * Sorts an array of card objects based on their rank and suit.
 * @param {Array} cards - An array of card objects.
 * @returns {Array} A new, sorted array of card objects.
 */
export const sortCards = (cards) => {
  if (!cards) return [];
  // Sort by rank first, then by suit as a tie-breaker.
  return [...cards].sort((a, b) => {
    const rankComparison = a.value - b.value;
    if (rankComparison !== 0) return rankComparison;
    const suitOrder = ['diamonds', 'clubs', 'hearts', 'spades'];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
};

/**
 * Generates all combinations of a certain size from an array.
 * @param {Array} array The source array.
 * @param {number} size The size of the combinations.
 * @returns {Array<Array>} An array of all combinations.
 */
export const combinations = (array, size) => {
  if (size === 0) return [[]];
  if (!array || array.length < size) return [];
  const first = array[0];
  const rest = array.slice(1);
  const combsWithFirst = combinations(rest, size - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = combinations(rest, size);
  return [...combsWithFirst, ...combsWithoutFirst];
};

/**
 * Evaluates a hand of 3 or 5 cards to determine its rank and value.
 * @param {Array} cards - An array of card objects.
 * @returns {Object} An object containing the hand's type, rank, and values for comparison.
 */
export function evaluateHand(cards) {
  if (!cards || cards.length === 0) {
    return { ...HAND_TYPES.HIGH_CARD, values: [0] };
  }

  const ranks = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = new Set(suits).size === 1;
  const rankSet = new Set(ranks);

  // A-2-3-4-5 is the lowest straight (wheel).
  const isAceLowStraight = rankSet.size === 5 && ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;
  // Any other sequence of 5 unique ranks is a straight.
  const isStraight = rankSet.size === cards.length && (ranks[0] - ranks[ranks.length - 1] === cards.length - 1);

  if (isStraight && isFlush) {
    return { ...HAND_TYPES.STRAIGHT_FLUSH, values: ranks };
  }
  if (isAceLowStraight && isFlush) {
    // Ace is treated as low card for comparison.
    return { ...HAND_TYPES.STRAIGHT_FLUSH, values: [5, 4, 3, 2, 1] };
  }

  const rankCounts = ranks.reduce((acc, rank) => {
    acc[rank] = (acc[rank] || 0) + 1;
    return acc;
  }, {});

  // Sort ranks by their frequency, then by their value.
  const primaryRanks = Object.keys(rankCounts).map(Number).sort((a, b) => {
      return (rankCounts[b] - rankCounts[a]) || (b - a);
  });

  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (counts[0] === 4) {
    return { ...HAND_TYPES.FOUR_OF_A_KIND, values: primaryRanks };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    return { ...HAND_TYPES.FULL_HOUSE, values: primaryRanks };
  }

  if (isFlush) {
    return { ...HAND_TYPES.FLUSH, values: ranks };
  }

  if (isStraight) {
    return { ...HAND_TYPES.STRAIGHT, values: ranks };
  }
  if (isAceLowStraight) {
    return { ...HAND_TYPES.STRAIGHT, values: [5, 4, 3, 2, 1] };
  }

  if (counts[0] === 3) {
    return { ...HAND_TYPES.THREE_OF_A_KIND, values: primaryRanks };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return { ...HAND_TYPES.TWO_PAIR, values: primaryRanks };
  }

  if (counts[0] === 2) {
    return { ...HAND_TYPES.PAIR, values: primaryRanks };
  }

  return { ...HAND_TYPES.HIGH_CARD, values: ranks };
}

/**
 * Compares two evaluated hands to determine the winner.
 * @param {Object} handA - The result from evaluateHand.
 * @param {Object} handB - The result from evaluateHand.
 * @returns {number} > 0 if A > B, < 0 if A < B, 0 if they are equal.
 */
export function compareHands(handA, handB) {
  const rankDifference = handA.rank - handB.rank;
  if (rankDifference !== 0) {
    return rankDifference;
  }
  
  // If ranks are the same, compare the significant card values.
  for (let i = 0; i < handA.values.length; i++) {
    const valueDifference = handA.values[i] - handB.values[i];
    if (valueDifference !== 0) {
      return valueDifference;
    }
  }

  return 0; // Hands are identical.
}