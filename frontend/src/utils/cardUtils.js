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
 * Generates the image URL for a given card based on the asset naming convention.
 * e.g., { suit: 'spades', rank: 'A' } -> '/cards/ace_of_spades.svg'
 * @param {Object} card - A card object with suit and rank.
 * @returns {string} - The path to the card image asset.
 */
export const getCardImageUrl = (card) => {
    if (!card || (!card.rank && !card.suit)) {
        return '/cards/back.svg'; // Default to card back
    }

    // Handle special cards like Jokers
    if (card.rank === 'red_joker' || card.rank === 'black_joker') {
        return `/cards/${card.rank}.svg`;
    }

    const rankMap = {
        'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
        '10': '10', '9': '9', '8': '8', '7': '7', '6': '6',
        '5': '5', '4': '4', '3': '3', '2': '2',
    };

    const rankName = rankMap[card.rank];
    const suitName = card.suit?.toLowerCase();

    if (!rankName || !suitName) {
        return '/cards/back.svg'; // Fallback for any unexpected card data
    }

    return `/cards/${rankName}_of_${suitName}.svg`;
};
