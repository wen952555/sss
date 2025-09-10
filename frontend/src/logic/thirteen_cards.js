// thirteen_cards.js - Core game logic for Thirteen Cards

// --- Constants ---
export const SUITS = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// --- Game Logic ---

/**
 * Creates a standard 52-card deck.
 * @returns {Array<string>} An array of strings representing cards, e.g., ['H2', 'D3'].
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${suit}${rank}`);
    }
  }
  return deck;
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * @param {Array<string>} deck - The deck to shuffle.
 * @returns {Array<string>} The shuffled deck.
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards to two players (13 cards each).
 * @param {Array<string>} deck - The shuffled deck.
 * @returns {{playerHand: Array<string>, aiHand: Array<string>}}
 */
export function dealCards(deck) {
  const playerHand = deck.slice(0, 13);
  const aiHand = deck.slice(13, 26);
  return { playerHand, aiHand };
}

// --- Hand Evaluation Helpers ---

const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

/**
 * Parses a card string into its suit and rank.
 * @param {string} card - e.g., 'H2'.
 * @returns {{suit: string, rank: string}}
 */
function parseCard(card) {
  return { suit: card[0], rank: card[1] };
}

/**
 * Gets the numerical value of a card's rank.
 * @param {string} card
 * @returns {number}
 */
function getRankValue(card) {
  return RANK_VALUES[card.slice(1)];
}

/**
 * Sorts a hand of cards by rank in ascending order.
 * @param {Array<string>} hand
 * @returns {Array<string>}
 */
export function sortHand(hand) {
  return hand.sort((a, b) => getRankValue(a) - getRankValue(b));
}


// --- Hand Evaluation ---

// Hand ranks, from highest to lowest
const HAND_RANKS = {
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  PAIR: 1,
  HIGH_CARD: 0,
};

/**
 * Evaluates a 5-card hand and returns its rank and value.
 * @param {Array<string>} hand - A 5-card hand.
 * @returns {{rank: number, value: number, name: string}}
 */
export function getHandDetails(hand) {
  if (hand.length !== 5) {
    throw new Error('Hand must have 5 cards for evaluation.');
  }

  const sortedHand = sortHand(hand);
  const ranks = sortedHand.map(getRankValue);
  const suits = sortedHand.map(c => c[0]);

  const isFlush = new Set(suits).size === 1;
  const isStraight = ranks.every((rank, i) => i === 0 || rank === ranks[i - 1] + 1);

  if (isStraight && isFlush) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, value: ranks[4], name: 'Straight Flush' };
  }

  const rankCounts = ranks.reduce((acc, rank) => {
    acc[rank] = (acc[rank] || 0) + 1;
    return acc;
  }, {});

  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (counts[0] === 4) {
    const fourRank = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 4));
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, value: fourRank, name: 'Four of a Kind' };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const threeRank = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
    return { rank: HAND_RANKS.FULL_HOUSE, value: threeRank, name: 'Full House' };
  }

  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, value: ranks[4], name: 'Flush' };
  }

  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, value: ranks[4], name: 'Straight' };
  }

  if (counts[0] === 3) {
    const threeRank = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
    return { rank: HAND_RANKS.THREE_OF_A_KIND, value: threeRank, name: 'Three of a Kind' };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(p => parseInt(p));
    return { rank: HAND_RANKS.TWO_PAIR, value: Math.max(...pairs), name: 'Two Pair' };
  }

  if (counts[0] === 2) {
    const pairRank = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2));
    return { rank: HAND_RANKS.PAIR, value: pairRank, name: 'Pair' };
  }

  return { rank: HAND_RANKS.HIGH_CARD, value: ranks[4], name: 'High Card' };
}


// --- AI Logic ---

/**
 * A helper function to get all k-combinations from a set of elements.
 * @param {Array} set - The set of elements.
 * @param {number} k - The size of the combinations.
 * @returns {Array<Array>}
 */
function getCombinations(set, k) {
  if (k > set.length || k <= 0) {
    return [];
  }
  if (k === set.length) {
    return [set];
  }
  if (k === 1) {
    return set.map(e => [e]);
  }

  const combinations = [];
  for (let i = 0; i < set.length - k + 1; i++) {
    const head = set.slice(i, i + 1);
    const tailCombinations = getCombinations(set.slice(i + 1), k - 1);
    for (const tail of tailCombinations) {
      combinations.push(head.concat(tail));
    }
  }
  return combinations;
}

/**
 * Simple AI to arrange a 13-card hand.
 * This is a placeholder for a more sophisticated AI.
 * It just sorts the cards and puts the best 5 in the back, next 5 in the middle.
 * This will often result in an invalid hand, but it's a starting point.
 * @param {Array<string>} hand - A 13-card hand.
 * @returns {{front: Array<string>, middle: Array<string>, back: Array<string>}}
 */
export function arrangeAIHand(hand) {
  const sortedHand = sortHand(hand);

  // This is a very naive approach and will be improved.
  // For now, it just splits the sorted hand.
  const back = sortedHand.slice(8, 13);
  const middle = sortedHand.slice(3, 8);
  const front = sortedHand.slice(0, 3);

  return { front, middle, back };
}
