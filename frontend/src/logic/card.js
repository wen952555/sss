// frontend/src/logic/card.js

export const SUITS = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
export const SUIT_SYMBOLS = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };
export const SUIT_CHARS = { spades: 's', hearts: 'h', diamonds: 'd', clubs: 'c' };

export const RANKS = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
export const RANK_SYMBOLS = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const FILENAME_RANK_MAP = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '10': 'T', 'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
};
const FILENAME_SUIT_MAP = {
    'spades': 's', 'hearts': 'h', 'diamonds': 'd', 'clubs': 'c'
};
const SUIT_NAMES = { s: '黑桃', h: '红桃', d: '方块', c: '梅花' };

export class Card {
    constructor(id, rank, suit, rankSymbol, suitSymbol, name, image) {
        this.id = id;
        this.rank = rank;
        this.suit = suit;
        this.rankSymbol = rankSymbol;
        this.suitSymbol = suitSymbol; // S, H, D, C
        this.name = name;
        this.image = image; // <--- 应该是文件名，例如 'ace_of_spades.svg'
    }

    toString() {
        return this.id;
    }
}

export const getCardDataFromFilename = (filename) => {
    // filename: "ace_of_spades.svg"
    const parts = filename.replace('.svg', '').split('_of_');
    if (parts.length !== 2) return null;

    const rankFileStr = parts[0].toLowerCase();
    const suitFileStr = parts[1].toLowerCase();

    const rankSymbol = FILENAME_RANK_MAP[rankFileStr];
    const suitChar = FILENAME_SUIT_MAP[suitFileStr];

    if (!rankSymbol || !suitChar) return null;

    const rank = RANKS[rankSymbol];
    const suitSymbolDisplay = SUIT_SYMBOLS[SUITS[suitChar]];
    const id = `${rankSymbol}${suitSymbolDisplay}`;
    const name = `${SUIT_NAMES[suitChar]}${rankSymbol}`;
    
    // ##################################################################
    // 关键修改：确保 this.image 仅仅是文件名
    // ##################################################################
    const image = filename; // 例如 "ace_of_spades.svg"

    return new Card(id, rank, suitChar, rankSymbol, suitSymbolDisplay, name, image);
};

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
                console.warn("Could not parse filename in createFullDeckFromFilenames:", filename);
            }
        });
    });
    return deck;
};

export const FULL_DECK_OBJECTS = createFullDeckFromFilenames();

export const mapBackendCardsToFrontendCards = (backendCards) => {
    if (!backendCards || !Array.isArray(backendCards)) {
        console.error("mapBackendCardsToFrontendCards received invalid input:", backendCards);
        return [];
    }
    return backendCards.map(backendCard => {
        if (!backendCard || typeof backendCard.id !== 'string') {
            console.error("Invalid backendCard structure:", backendCard);
            return null;
        }
        const fullCard = FULL_DECK_OBJECTS.find(c => c.id === backendCard.id);
        if (!fullCard) {
            console.error(`Card with ID ${backendCard.id} not found in FULL_DECK_OBJECTS.`);
            // 你可以根据 backendCard 的信息尝试构建一个基础的 Card 对象，但 image 属性可能不准确
            // return new Card(backendCard.id, backendCard.rank, backendCard.suit, backendCard.rankSymbol, backendCard.suitSymbol, 'Unknown Card', 'unknown.svg');
            return null;
        }
        return fullCard;
    }).filter(card => card !== null);
};
