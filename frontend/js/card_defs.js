// frontend/js/card_defs.js

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

// 用于牌力比较和牌型判断
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

// 用于显示
const RANK_DISPLAY = {
    'jack': 'J', 'queen': 'Q', 'king': 'K', 'ace': 'A'
    // 数字牌面直接用数字
};

const SUIT_SYMBOLS = {
    'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'
};

// 牌型定义 (用于前端显示和简单AI逻辑)
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
    // 十三水特殊牌型前端可以不严格判断，主要依赖后端（如果以后接后端）
    // 对于纯前端AI试玩，我们可以简化或只判断基础牌型
};

// 生成卡牌对象的辅助函数
function createCardObject(rank, suit) {
    const rankValue = RANK_VALUES[rank];
    const displayRank = RANK_DISPLAY[rank] || rank.toUpperCase();
    const suitSymbol = SUIT_SYMBOLS[suit];
    // 图片文件名约定: rank_of_suit.svg (e.g., ace_of_spades.svg, 10_of_clubs.svg)
    // 注意：J, Q, K, A 需要转换为 jack, queen, king, ace 用于文件名
    let rankForImage = rank;
    if (rank === 'jack' || rank === 'queen' || rank === 'king' || rank === 'ace') {
        // 已经是小写全名了
    } else if (rank.toUpperCase() === 'A') rankForImage = 'ace';
    else if (rank.toUpperCase() === 'K') rankForImage = 'king';
    else if (rank.toUpperCase() === 'Q') rankForImage = 'queen';
    else if (rank.toUpperCase() === 'J') rankForImage = 'jack';


    return {
        rank: rank,         // '2', 'ace'
        suit: suit,         // 'hearts', 'spades'
        value: rankValue,   // 2, 14
        displayRank: displayRank, // '2', 'A'
        suitSymbol: suitSymbol, // '♥', '♠'
        id: `${rank}_${suit}`, // 唯一ID，例如 'ace_spades'
        imageName: `${rankForImage}_of_${suit}.svg`
    };
}
