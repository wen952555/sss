// frontend/js/card_defs.js (添加 imageName 生成日志)

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

const RANK_DISPLAY = {
    'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
};

const SUIT_SYMBOLS = {
    'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'
};

const HAND_TYPES = {
    HIGH_CARD: { score: 1, name: '乌龙' },
    ONE_PAIR: { score: 2, name: '一对' },
    TWO_PAIR: { score: 3, name: '两对' },
    THREE_OF_A_KIND: { score: 4, name: '三条' },
    STRAIGHT: { score: 5, name: '顺子' },
    FLUSH: { score: 6, name: '同花' },
    FULL_HOUSE: { score: 7, name: '葫芦' },
    FOUR_OF_A_KIND: { score: 8, name: '铁支' },
    STRAIGHT_FLUSH: { score: 9, name: '同花顺' }
};

function createCardObject(rank, suit) {
    // rank: '2', '10', 'jack', 'ace' (来自 RANKS 数组)
    // suit: 'hearts', 'diamonds', 'clubs', 'spades' (来自 SUITS 数组)

    const rankValue = RANK_VALUES[rank];
    const displayRank = RANK_DISPLAY[rank] || rank.toUpperCase(); // 'J' or '10'
    const suitSymbol = SUIT_SYMBOLS[suit];

    // --- imageName 生成 ---
    // 目标: rank_of_suit.svg (全小写, e.g., ace_of_spades.svg, 10_of_clubs.svg)
    // rank 已经是小写单词或数字了 (如 'jack', '10')
    // suit 已经是小写单词了 (如 'hearts')
    const generatedImageName = `${rank}_of_${suit}.svg`;

    // *** 添加详细日志 ***
    console.log(`[CardDefs.js] createCardObject: Input rank='${rank}', suit='${suit}' -> Generated imageName='${generatedImageName}'`);

    return {
        rank: rank,
        suit: suit,
        value: rankValue,
        displayRank: displayRank,
        suitSymbol: suitSymbol,
        id: `${rank}_${suit}`, // 例如: 'ace_spades', '10_clubs'
        imageName: generatedImageName
    };
}
