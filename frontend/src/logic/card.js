// frontend/src/logic/card.js

// Constants for card ranks and suits (consistent with backend and cardUtils)
export const SUITS = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
export const SUIT_SYMBOLS = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' }; // For display or ID
export const SUIT_CHARS = { spades: 's', hearts: 'h', diamonds: 'd', clubs: 'c' }; // For internal logic

export const RANKS = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
export const RANK_SYMBOLS = { // For display or ID
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

// Map filenames to card data (from your initial request)
const FILENAME_RANK_MAP = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '10': 'T', 'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
};
const FILENAME_SUIT_MAP = {
    'spades': 's', 'hearts': 'h', 'diamonds': 'd', 'clubs': 'c'
};
const SUIT_NAMES = { s: '黑桃', h: '红桃', d: '方块', c: '梅花' };


/**
 * Represents a playing card.
 * Stores data in a format suitable for game logic and AI.
 */
export class Card {
    constructor(id, rank, suit, rankSymbol, suitSymbol, name, image) {
        this.id = id;             // Unique ID, e.g., "AS", "TC" (RankSymbol + SuitChar.toUpperCase())
        this.rank = rank;           // Numeric rank (2-14, A=14)
        this.suit = suit;           // Suit character ('s', 'h', 'd', 'c')
        this.rankSymbol = rankSymbol; // 'A', 'K', 'Q', 'J', 'T', '9', ..., '2'
        this.suitSymbol = suitSymbol; // 'S', 'H', 'D', 'C' (for display, matches backend)
        this.name = name;           // e.g., "黑桃A"
        this.image = image;         // e.g., "poker_images/ace_of_spades.svg"
    }

    toString() {
        return this.id;
    }
}

/**
 * Parses a filename like "ace_of_spades.svg" into a Card object.
 * @param {string} filename
 * @returns {Card|null}
 */
export const getCardDataFromFilename = (filename) => {
    const parts = filename.replace('.svg', '').split('_of_');
    if (parts.length !== 2) return null;

    const rankFileStr = parts[0].toLowerCase();
    const suitFileStr = parts[1].toLowerCase();

    const rankSymbol = FILENAME_RANK_MAP[rankFileStr];
    const suitChar = FILENAME_SUIT_MAP[suitFileStr];

    if (!rankSymbol || !suitChar) return null;

    const rank = RANKS[rankSymbol];
    const suitSymbolDisplay = SUIT_SYMBOLS[SUITS[suitChar]]; // S,H,D,C
    const id = `${rankSymbol}${suitSymbolDisplay}`; // AS, KH, TD (match backend Card ID format)
    const name = `${SUIT_NAMES[suitChar]}${rankSymbol}`;
    const image = `poker_images/${filename}`;

    return new Card(id, rank, suitChar, rankSymbol, suitSymbolDisplay, name, image);
};


/**
 * Creates a standard 52-card deck using Card objects.
 * Relies on the filename convention.
 * @returns {Card[]}
 */
export const createFullDeckFromFilenames = () => {
    const deck = [];
    const svgRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    const svgSuits = ['spades', 'hearts', 'diamonds', 'clubs'];

    svgSuits.forEach(svgSuit => {
        svgRanks.forEach(svgRank => {
            const filename = `${svgRank}_of_${svgSuit}.svg`;
            const cardData = getCardDataFromFilename(filename);
            if (cardData) {
                deck.push(cardData);
            } else {
                console.warn("Could not parse filename:", filename);
            }
        });
    });
    // console.log("Created deck with IDs:", deck.map(c => c.id));
    return deck;
};

// This initial deck is created once and can be used to map IDs from backend to full Card objects
export const FULL_DECK_OBJECTS = createFullDeckFromFilenames();

/**
 * Converts card data from backend (which might be minimal) to full Card objects.
 * @param {Array<{id: string, rank?: number, suit?: string}>} backendCards
 * @returns {Card[]}
 */
export const mapBackendCardsToFrontendCards = (backendCards) => {
    return backendCards.map(backendCard => {
        const fullCard = FULL_DECK_OBJECTS.find(c => c.id === backendCard.id);
        if (!fullCard) {
            console.error(`Card with ID ${backendCard.id} not found in FULL_DECK_OBJECTS.`);
            // Fallback or error handling - for now, create a basic one if backend provides enough info
            if (backendCard.rank && backendCard.suit && RANK_SYMBOLS[backendCard.rank] && SUIT_NAMES[backendCard.suit]) {
                 const rankSymbol = RANK_SYMBOLS[backendCard.rank];
                 const suitSymbolDisplay = backendCard.suit.toUpperCase();
                 const name = `${SUIT_NAMES[backendCard.suit]}${rankSymbol}`;
                 // Image path might be tricky to guess without full filename convention mapping
                 // This assumes backend ID correctly maps to a filename.
                 const filenameGuess = `${Object.keys(FILENAME_RANK_MAP).find(key => FILENAME_RANK_MAP[key] === rankSymbol)}_of_${Object.keys(FILENAME_SUIT_MAP).find(key => FILENAME_SUIT_MAP[key] === backendCard.suit)}.svg`;

                 return new Card(backendCard.id, backendCard.rank, backendCard.suit, rankSymbol, suitSymbolDisplay, name, `poker_images/${filenameGuess}`);
            }
            return null; // Or a placeholder card
        }
        return fullCard;
    }).filter(card => card !== null);
};
