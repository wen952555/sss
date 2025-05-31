// frontend/js/constants.js
export const BACKEND_API_URL = 'https://9525.ip-ddns.com/backend/api.php';
export const CARD_IMAGE_BASE_PATH = './cards/';

export const CARD_RANKS_MAP = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14 };
export const CARD_SUITS_MAP = { 'spades': 4, 'hearts': 3, 'clubs': 2, 'diamonds': 1 };
export const RANK_DISPLAY_MAP = {'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'};
export const SUIT_DISPLAY_MAP = {'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣'};

export const HAND_TYPES = {
    INVALID:            { id: 'INVALID', value: -1, name: '无效牌型', score: 0, isSpecial: false },
    HIGH_CARD:          { id: 'HIGH_CARD', value: 0, name: '乌龙', score: 0, isSpecial: false },
    ONE_PAIR:           { id: 'ONE_PAIR', value: 1, name: '一对', score: 0, isSpecial: false },
    TWO_PAIR:           { id: 'TWO_PAIR', value: 2, name: '两对', score: 0, isSpecial: false },
    THREE_OF_A_KIND:    { id: 'THREE_OF_A_KIND', value: 3, name: '三条', score: 0, isSpecial: false },
    STRAIGHT:           { id: 'STRAIGHT', value: 4, name: '顺子', score: 0, isSpecial: false },
    FLUSH:              { id: 'FLUSH', value: 5, name: '同花', score: 0, isSpecial: false }, // 同花基础分可以设高一点，比如1
    FULL_HOUSE:         { id: 'FULL_HOUSE', value: 6, name: '葫芦', score: 0, isSpecial: false }, // 中墩葫芦2分，尾墩葫芦1分
    FOUR_OF_A_KIND:     { id: 'FOUR_OF_A_KIND', value: 7, name: '铁支', score: 0, isSpecial: false }, // 中墩铁支7分，尾墩铁支4分
    STRAIGHT_FLUSH:     { id: 'STRAIGHT_FLUSH', value: 8, name: '同花顺', score: 0, isSpecial: false }, // 中墩同花顺10分，尾墩同花顺5分

    CHONG_SAN:              { id: 'CHONG_SAN', value: 3.1, name: '冲三', score: 3, baseType: 'THREE_OF_A_KIND', isSpecial: true },
    // 调整墩位特殊牌型的基础分，使其更有意义
    ZHONG_DUN_HU_LU:        { id: 'ZHONG_DUN_HU_LU', value: 6.1, name: '中墩葫芦', score: 2, baseType: 'FULL_HOUSE', isSpecial: true },
    ZHONG_DUN_TIE_ZHI:      { id: 'ZHONG_DUN_TIE_ZHI', value: 7.1, name: '中墩铁支', score: 8, baseType: 'FOUR_OF_A_KIND', isSpecial: true }, // 调整分数
    ZHONG_DUN_TONG_HUA_SHUN:{ id: 'ZHONG_DUN_TONG_HUA_SHUN', value: 8.1, name: '中墩同花顺', score: 10, baseType: 'STRAIGHT_FLUSH', isSpecial: true },
    WEI_DUN_TIE_ZHI:        { id: 'WEI_DUN_TIE_ZHI', value: 7.2, name: '尾墩铁支', score: 4, baseType: 'FOUR_OF_A_KIND', isSpecial: true },
    WEI_DUN_TONG_HUA_SHUN:  { id: 'WEI_DUN_TONG_HUA_SHUN', value: 8.2, name: '尾墩同花顺', score: 5, baseType: 'STRAIGHT_FLUSH', isSpecial: true },
    
    // 整手牌的特殊牌型 (value 设得很高)
    SAN_TONG_HUA:       { id: 'SAN_TONG_HUA', value: 10, name: '三同花', score: 3, isSpecial: true, isOverallSpecial: true }, // 三同花通常3-4道水
    SAN_SHUN_ZI:        { id: 'SAN_SHUN_ZI', value: 11, name: '三顺子', score: 4, isSpecial: true, isOverallSpecial: true }, // 三顺子通常4-5道水
    LIU_DUI_BAN:        { id: 'LIU_DUI_BAN', value: 12, name: '六对半', score: 3, isSpecial: true, isOverallSpecial: true }, // 六对半通常3-4道水
    YI_TIAO_LONG:       { id: 'YI_TIAO_LONG', value: 15, name: '一条龙', score: 13, isSpecial: true, isOverallSpecial: true }, // 一条龙通常13道水或直接赢
    ZHI_ZUN_QING_LONG:  { id: 'ZHI_ZUN_QING_LONG', value: 20, name: '至尊清龙', score: 26, isSpecial: true, isOverallSpecial: true }, // 同花一条龙，最高

    DAO_SHUI:           { id: 'DAO_SHUI', value: -100, name: '倒水', score: -10, isSpecial: false }
};

export const DUN_IDS = {
    FRONT: 'frontHand',
    MIDDLE: 'middleHand',
    BACK: 'backHand'
};

// 用于模拟打枪的基准 (非常简化)
// 假设如果玩家三墩都大于这些类型，就算“打枪空气对手”
export const SHOOTING_BENCHMARK = {
    [DUN_IDS.FRONT]: HAND_TYPES.HIGH_CARD.value, // 头墩大于乌龙
    [DUN_IDS.MIDDLE]: HAND_TYPES.ONE_PAIR.value,  // 中墩大于一对
    [DUN_IDS.BACK]: HAND_TYPES.TWO_PAIR.value   // 尾墩大于两对
};
