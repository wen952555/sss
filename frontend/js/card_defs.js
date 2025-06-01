// frontend/js/card_defs.js
console.log("[CardDefs.js] Loaded");

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']; // 卡牌花色 (确保与图片文件名中的花色部分一致)
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']; // 卡牌牌面 (确保与图片文件名中的牌面部分一致)

// 用于牌力比较
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

// 用于显示 (例如 J, Q, K, A)
const RANK_DISPLAY_MAP = {
    'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
};

// 用于显示 (例如 ♥, ♦, ♣, ♠)
const SUIT_SYMBOL_MAP = {
    'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'
};

// 牌型名称 (简化)
const HAND_TYPE_NAMES = {
    HIGH_CARD: '乌龙',
    ONE_PAIR: '一对',
    TWO_PAIR: '两对',
    THREE_OF_A_KIND: '三条',
    STRAIGHT: '顺子',
    FLUSH: '同花',
    FULL_HOUSE: '葫芦',
    FOUR_OF_A_KIND: '铁支',
    STRAIGHT_FLUSH: '同花顺'
};


/**
 * 创建卡牌对象，包含所有必要信息
 * @param {string} rank - e.g., 'ace', '10', 'king' (来自 RANKS 数组)
 * @param {string} suit - e.g., 'spades', 'hearts' (来自 SUITS 数组)
 * @returns {object} 卡牌对象
 */
function createCard(rank, suit) {
    if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
        console.error(`[CardDefs.js] Invalid rank or suit for createCard: ${rank}, ${suit}`);
        return null; // 或者抛出错误
    }

    const card = {
        rank: rank,                 // 'ace'
        suit: suit,                 // 'spades'
        value: RANK_VALUES[rank],   // 14
        displayRank: RANK_DISPLAY_MAP[rank] || rank.toUpperCase(), // 'A' or '10'
        displaySuit: SUIT_SYMBOL_MAP[suit], // '♠'
        id: `${rank}_${suit}`,      // 'ace_spades' (用作 DOM 元素的 data-id)
        // 严格按照 "rank_of_suit.svg" 格式，全小写
        imageName: `${rank.toLowerCase()}_of_${suit.toLowerCase()}.svg` // 'ace_of_spades.svg'
    };
    // console.log(`[CardDefs.js] Created card: ${card.id}, imageName: ${card.imageName}`);
    return card;
}
