// frontend/js/card_defs.js
console.log("[CardDefs.js] Loaded and script executing.");

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

const RANK_DISPLAY_MAP = { 'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A' };
const SUIT_SYMBOL_MAP = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };

const HAND_TYPE_NAMES = {
    HIGH_CARD: '乌龙', ONE_PAIR: '一对', TWO_PAIR: '两对', THREE_OF_A_KIND: '三条',
    STRAIGHT: '顺子', FLUSH: '同花', FULL_HOUSE: '葫芦', FOUR_OF_A_KIND: '铁支',
    STRAIGHT_FLUSH: '同花顺'
};
// 为HAND_TYPE_NAMES添加score属性，方便牌型判断时直接引用
const HAND_TYPES = {
    HIGH_CARD: { score: 1, name: HAND_TYPE_NAMES.HIGH_CARD },
    ONE_PAIR: { score: 2, name: HAND_TYPE_NAMES.ONE_PAIR },
    TWO_PAIR: { score: 3, name: HAND_TYPE_NAMES.TWO_PAIR },
    THREE_OF_A_KIND: { score: 4, name: HAND_TYPE_NAMES.THREE_OF_A_KIND },
    STRAIGHT: { score: 5, name: HAND_TYPE_NAMES.STRAIGHT },
    FLUSH: { score: 6, name: HAND_TYPE_NAMES.FLUSH },
    FULL_HOUSE: { score: 7, name: HAND_TYPE_NAMES.FULL_HOUSE },
    FOUR_OF_A_KIND: { score: 8, name: HAND_TYPE_NAMES.FOUR_OF_A_KIND },
    STRAIGHT_FLUSH: { score: 9, name: HAND_TYPE_NAMES.STRAIGHT_FLUSH }
};


function createCard(rank, suit) {
    if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
        console.error(`[CardDefs.js] Invalid rank or suit for createCard: ${rank}, ${suit}`);
        return null;
    }
    const card = {
        rank: rank,
        suit: suit,
        value: RANK_VALUES[rank],
        displayRank: RANK_DISPLAY_MAP[rank] || rank.toUpperCase(),
        displaySuit: SUIT_SYMBOL_MAP[suit],
        id: `${rank}_${suit}`,
        imageName: `${rank.toLowerCase()}_of_${suit.toLowerCase()}.svg`
    };
    // console.log(`[CardDefs.js] Created card: id='${card.id}', imageName='${card.imageName}'`);
    return card;
}
console.log("[CardDefs.js] All definitions processed.");
