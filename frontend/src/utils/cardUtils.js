// frontend/src/utils/cardUtils.js

// 后端也导出了RANKS_VALUE，这里保持一致或者从后端获取
export const RANKS_VALUE = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };
export const SUITS_UNICODE = { // 可选的Unicode字符表示花色
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣'
};
export const SUIT_COLORS = {
    spades: 'black',
    hearts: 'red',
    diamonds: 'red',
    clubs: 'black'
};


// 卡牌到图片文件名的映射与后端 gameLogic.js 中的 id 一致
export function getCardImageFilename(card) {
    if (!card || !card.rank || !card.suit) {
        return 'back.svg'; // 或者一个表示未知牌的图片
    }
    // 后端 card.id 就是 "rank_of_suit"
    return `${card.id}.svg`;
}

// 卡牌显示名称
export function getCardDisplayName(card) {
    if (!card || !card.rank || !card.suit) return '';
    const rankDisplay = card.rank.length > 2 ? card.rank.charAt(0).toUpperCase() : card.rank.toUpperCase(); // 'jack' -> 'J'
    return `${SUITS_UNICODE[card.suit]}${rankDisplay}`;
}

// 对手牌进行排序（例如，按花色再按点数，或按点数再按花色）
export function sortHand(hand) {
    if (!hand || hand.length === 0) return [];
    // 示例：先按点数，再按花色 (自定义花色顺序)
    const suitOrder = { spades: 4, hearts: 3, diamonds: 2, clubs: 1 };
    return [...hand].sort((a, b) => {
        if (RANKS_VALUE[a.rank] !== RANKS_VALUE[b.rank]) {
            return RANKS_VALUE[b.rank] - RANKS_VALUE[a.rank]; // 点数大的在前
        }
        return suitOrder[b.suit] - suitOrder[a.suit]; // 花色大的在前
    });
}

// 牌型名称映射 (与后端 gameLogic.js 的 HAND_TYPES 对应)
export const HAND_TYPE_NAMES = {
    0: '乌龙 (高牌)',
    1: '一对',
    2: '两对',
    3: '三条',
    4: '顺子',
    5: '同花',
    6: '葫芦 (三带二)',
    7: '铁支 (四条)',
    8: '同花顺',
    9: '一条龙' // 示例
};

export function getHandTypeName(typeValue) {
    return HAND_TYPE_NAMES[typeValue] || '未知牌型';
}
