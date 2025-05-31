// frontend/js/constants.js
export const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php'; // 您的后端API
export const CARD_IMAGE_BASE_PATH = './cards/';

export const CARD_RANKS_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };
export const CARD_SUITS_MAP = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 }; // 黑桃>红桃>梅花>方块
export const RANK_DISPLAY_MAP = {'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'};
export const SUIT_DISPLAY_MAP = {'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣'};

// 牌型定义 (value越大，牌型越大)
// score 是基础墩分，特殊牌型可能还有额外加分
export const HAND_TYPES = {
    // 普通牌型
    INVALID:            { id: 'INVALID', value: -1, name: '无效牌型', score: 0, isSpecial: false },
    HIGH_CARD:          { id: 'HIGH_CARD', value: 0, name: '乌龙', score: 0, isSpecial: false },
    ONE_PAIR:           { id: 'ONE_PAIR', value: 1, name: '一对', score: 0, isSpecial: false },
    TWO_PAIR:           { id: 'TWO_PAIR', value: 2, name: '两对', score: 0, isSpecial: false },
    THREE_OF_A_KIND:    { id: 'THREE_OF_A_KIND', value: 3, name: '三条', score: 0, isSpecial: false }, // 普通三条
    STRAIGHT:           { id: 'STRAIGHT', value: 4, name: '顺子', score: 0, isSpecial: false },
    FLUSH:              { id: 'FLUSH', value: 5, name: '同花', score: 0, isSpecial: false },
    FULL_HOUSE:         { id: 'FULL_HOUSE', value: 6, name: '葫芦', score: 0, isSpecial: false }, // 普通葫芦
    FOUR_OF_A_KIND:     { id: 'FOUR_OF_A_KIND', value: 7, name: '铁支', score: 0, isSpecial: false }, // 普通铁支
    STRAIGHT_FLUSH:     { id: 'STRAIGHT_FLUSH', value: 8, name: '同花顺', score: 0, isSpecial: false }, // 普通同花顺

    // 特殊墩位加分 (这些value值需要高于对应的普通牌型，低于更高一级的普通牌型)
    CHONG_SAN:              { id: 'CHONG_SAN', value: 3.1, name: '冲三', score: 3, baseType: 'THREE_OF_A_KIND', isSpecial: true }, // 头墩三条
    ZHONG_DUN_HU_LU:        { id: 'ZHONG_DUN_HU_LU', value: 6.1, name: '中墩葫芦', score: 2, baseType: 'FULL_HOUSE', isSpecial: true },
    ZHONG_DUN_TIE_ZHI:      { id: 'ZHONG_DUN_TIE_ZHI', value: 7.1, name: '中墩铁支', score: 7, baseType: 'FOUR_OF_A_KIND', isSpecial: true },
    ZHONG_DUN_TONG_HUA_SHUN:{ id: 'ZHONG_DUN_TONG_HUA_SHUN', value: 8.1, name: '中墩同花顺', score: 10, baseType: 'STRAIGHT_FLUSH', isSpecial: true },
    WEI_DUN_TIE_ZHI:        { id: 'WEI_DUN_TIE_ZHI', value: 7.2, name: '尾墩铁支', score: 4, baseType: 'FOUR_OF_A_KIND', isSpecial: true },
    WEI_DUN_TONG_HUA_SHUN:  { id: 'WEI_DUN_TONG_HUA_SHUN', value: 8.2, name: '尾墩同花顺', score: 5, baseType: 'STRAIGHT_FLUSH', isSpecial: true },
    
    // 整手牌的特殊牌型 (value 设得很高)
    SAN_TONG_HUA:       { id: 'SAN_TONG_HUA', value: 10, name: '三同花', score: 3, isSpecial: true, isOverallSpecial: true },
    SAN_SHUN_ZI:        { id: 'SAN_SHUN_ZI', value: 11, name: '三顺子', score: 4, isSpecial: true, isOverallSpecial: true },
    LIU_DUI_BAN:        { id: 'LIU_DUI_BAN', value: 12, name: '六对半', score: 5, isSpecial: true, isOverallSpecial: true },
    // WU_DUI_SAN_TIAO: { id: 'WU_DUI_SAN_TIAO', value: 13, name: '五对三条', score: 6, isSpecial: true, isOverallSpecial: true }, // 较少见
    // SI_TAO_SAN_TIAO: { id: 'SI_TAO_SAN_TIAO', value: 14, name: '四套三条', score: 10, isSpecial: true, isOverallSpecial: true }, // 较少见
    YI_TIAO_LONG:       { id: 'YI_TIAO_LONG', value: 15, name: '一条龙', score: 13, isSpecial: true, isOverallSpecial: true }, // A-K 不同花
    ZHI_ZUN_QING_LONG:  { id: 'ZHI_ZUN_QING_LONG', value: 20, name: '至尊清龙', score: 26, isSpecial: true, isOverallSpecial: true }, // A-K 同花顺 (理论上不可能是一手牌，除非规则变体)

    // 倒水惩罚
    DAO_SHUI:           { id: 'DAO_SHUI', value: -100, name: '倒水', score: -10, isSpecial: false } // 用作标记
};

export const DUN_IDS = {
    FRONT: 'frontHand',
    MIDDLE: 'middleHand',
    BACK: 'backHand'
};
