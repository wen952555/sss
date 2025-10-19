/**
 * @fileoverview Constants for the SSS game logic.
 */

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const RANK_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

const HAND_TYPES = {
    // 5-Card Hands
    ROYAL_FLUSH: { value: 10, name: '同花大顺' },
    STRAIGHT_FLUSH: { value: 9, name: '同花顺' },
    FOUR_OF_A_KIND: { value: 8, name: '铁支' },
    FULL_HOUSE: { value: 7, name: '葫芦' },
    FLUSH: { value: 6, name: '同花' },
    STRAIGHT: { value: 5, name: '顺子' },
    // 3-Card Hands
    THREE_OF_A_KIND: { value: 4, name: '三条' },
    // Universal Hand Types
    TWO_PAIR: { value: 3, name: '两对' },
    ONE_PAIR: { value: 2, name: '对子' },
    HIGH_CARD: { value: 1, name: '高牌' }
};

const SPECIAL_HAND_TYPES = {
    DRAGON: { value: 13, name: '一条龙', score: 13 },
    THIRTEEN_ORPHANS: { value: 12, name: '十三幺', score: 13}, // Example, not standard
    ALL_SUITS: { value: 11, name: '全花色', score: 10}, // J,Q,K,A in various suits
    THREE_FLUSHES: { value: 5, name: '三同花', score: 5 },
    THREE_STRAIGHTS: { value: 4, name: '三顺子', score: 4 },
    SIX_PAIRS: { value: 3, name: '六对半', score: 3 },
    NONE: { value: 0, name: '无特殊牌', score: 0 }
};

const SEGMENT_SCORES = {
    front: {
        [HAND_TYPES.THREE_OF_A_KIND.name]: 3 // 冲三
    },
    middle: {
        [HAND_TYPES.FULL_HOUSE.name]: 2, // 中墩葫芦
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 8, // 中墩铁支
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 10 // 中墩同花顺
    },
    back: {
        [HAND_TYPES.FOUR_OF_A_KIND.name]: 4, // 后墩铁支
        [HAND_TYPES.STRAIGHT_FLUSH.name]: 5, // 后墩同花顺
        [HAND_TYPES.ROYAL_FLUSH.name]: 10 // 后墩同花大顺
    }
};

module.exports = {
    SUITS,
    RANKS,
    RANK_VALUES,
    HAND_TYPES,
    SPECIAL_HAND_TYPES,
    SEGMENT_SCORES
};