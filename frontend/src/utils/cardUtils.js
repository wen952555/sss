// frontend/src/utils/cardUtils.js

const SUIT_ORDER = { "spades": 4, "hearts": 3, "diamonds": 2, "clubs": 1 };
const RANK_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

/**
 * Sorts a hand of cards, typically by rank and then by suit.
 * @param {Array<Object>} hand - An array of card objects { suit, rank }.
 * @returns {Array<Object>} - The sorted hand.
 */
export const sortHand = (hand) => {
    if (!hand) return [];
    
    return [...hand].sort((a, b) => {
        const rankComparison = RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
        if (rankComparison !== 0) {
            return rankComparison;
        }
        return SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
    });
};

/**
 * Generates the image URL for a given card.
 * @param {Object} card - A card object with suit and rank.
 * @returns {string} - The path to the card image.
 */
export const getCardImageUrl = (card) => {
    if (!card) {
        // Return a path to a card back or a placeholder
        return '/cards/back.png'; 
    }
    // Note: In Vite, files in the `public` directory are served at the root.
    // So the path is relative to the public root, e.g., /cards/spades_A.png
    return `/cards/${card.suit}_${card.rank}.png`;
};
