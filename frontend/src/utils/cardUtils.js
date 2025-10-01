// client/src/utils/cardUtils.js

const RANK_MAP_IMAGES = {
  'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', '10': '10', '9': '9',
  '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2',
};

export const RANK_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

const SUIT_VALUES = {
    "spades": 4,
    "hearts": 3,
    "diamonds": 2,
    "clubs": 1
};

/**
 * 根据卡片对象获取对应的图片 URL
 * @param {Object} card - 例如 { suit: 'spades', rank: 'A' }
 * @returns {string} - 图片的路径, e.g., "/cards/ace_of_spades.svg"
 */
export const getCardImageUrl = (card) => {
  if (!card || !card.suit || !card.rank) {
    return '/cards/back.svg';
  }
  const rankStr = RANK_MAP_IMAGES[card.rank];
  const suitStr = card.suit;
  return `/cards/${rankStr}_of_${suitStr}.svg`;
};

/**
 * Sorts a hand of cards, first by rank, then by suit.
 * @param {Array<Object>} hand - Array of card objects.
 * @returns {Array<Object>} - The sorted hand.
 */
export const sortHand = (hand) => {
    if (!hand) return [];
    return hand.sort((a, b) => {
        const rankComparison = RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
        if (rankComparison !== 0) {
            return rankComparison;
        }
        return SUIT_VALUES[b.suit] - SUIT_VALUES[a.suit]; // Sort by suit if ranks are equal
    });
};