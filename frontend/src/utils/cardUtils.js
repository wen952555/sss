// frontend/src/utils/cardUtils.js

// SUITS_DATA 和 VALUES_MAP 保持与之前“绝对干净版”一致
const SUITS_DATA = {
    spades: { name: '黑桃', symbol: '♠', id: 's', order: 4 },
    hearts: { name: '红桃', symbol: '♥', id: 'h', order: 3 },
    diamonds: { name: '方块', symbol: '♦', id: 'd', order: 2 },
    clubs: { name: '梅花', symbol: '♣', id: 'c', order: 1 },
};

const VALUES_MAP = { // 用于逻辑和显示
    'A': { name: 'A', value: 14, order: 14, filename_prefix: 'ace' },
    'K': { name: 'K', value: 13, order: 13, filename_prefix: 'king' },
    'Q': { name: 'Q', value: 12, order: 12, filename_prefix: 'queen' },
    'J': { name: 'J', value: 11, order: 11, filename_prefix: 'jack' },
    'T': { name: '10', value: 10, order: 10, filename_prefix: '10' }, // 使用 'T' 作为键，但牌面是 '10'
    '9': { name: '9', value: 9, order: 9, filename_prefix: '9' },
    '8': { name: '8', value: 8, order: 8, filename_prefix: '8' },
    '7': { name: '7', value: 7, order: 7, filename_prefix: '7' },
    '6': { name: '6', value: 6, order: 6, filename_prefix: '6' },
    '5': { name: '5', value: 5, order: 5, filename_prefix: '5' },
    '4': { name: '4', value: 4, order: 4, filename_prefix: '4' },
    '3': { name: '3', value: 3, order: 3, filename_prefix: '3' },
    '2': { name: '2', value: 2, order: 2, filename_prefix: '2' }
};
// 为了方便通过数字 value 查找，可以创建一个反向映射或直接在 VALUES_MAP 中支持数字键
// 但后端传来的 cardId 字符串是 '8d', 'Th', 'Qc' 这样的，所以主要按字符键查找

/**
 * 根据卡牌对象 { valueName: 'A', suitId: 's' } 获取卡牌图片的SVG文件名
 * @param {object} cardDetails - 卡牌详细信息对象, 包含 valueName (A,K,Q,J,T,9..2) 和 suitId (s,h,d,c)
 * @returns {string} SVG图片文件名, e.g., 'ace_of_spades.svg'
 */
export function getCardImageFilename(cardDetails) {
    if (!cardDetails || !cardDetails.valueName || !cardDetails.suitId) {
        console.error("getCardImageFilename: Invalid cardDetails object", cardDetails);
        return 'placeholder.svg';
    }

    const valueKey = cardDetails.valueName.toUpperCase(); // 确保是大写 A, K, Q, J, T, 9..2
    const suitId = cardDetails.suitId.toLowerCase();   // 确保是小写 s, h, d, c

    const valueInfo = VALUES_MAP[valueKey];
    const suitInfo = Object.values(SUITS_DATA).find(s => s.id === suitId); // 通过 id 查找 suitInfo

    if (!valueInfo || !suitInfo) {
        console.error(
            "getCardImageFilename: Could not find value or suit info for:", 
            cardDetails, 
            "Resolved valueKey:", valueKey, 
            "suitId:", suitId,
            "Found valueInfo:", valueInfo,
            "Found suitInfo:", suitInfo
        );
        return 'placeholder.svg';
    }
    
    // 使用 valueInfo.filename_prefix 和 suitInfo.id (代表spades, hearts等)
    const suitFilenamePart = Object.keys(SUITS_DATA).find(key => SUITS_DATA[key].id === suitInfo.id);

    if (!suitFilenamePart) {
        console.error("getCardImageFilename: Could not determine suit filename part for suitId:", suitInfo.id);
        return 'placeholder.svg';
    }

    return `${valueInfo.filename_prefix}_of_${suitFilenamePart}.svg`;
}

/**
 * 根据卡牌ID字符串 (例如 "As", "Td", "8d") 获取卡牌详细信息
 * @param {string} cardId - 后端/逻辑层使用的卡牌ID, e.g., "As", "Td", "2c"
 * @returns {object|null} 卡牌详细信息对象或null
 */
export function getCardDetails(cardId) {
    if (typeof cardId !== 'string' || cardId.length < 2) {
        console.warn("getCardDetails: Invalid cardId provided:", cardId);
        return null;
    }

    const suitChar = cardId.slice(-1).toLowerCase();
    let valueChar = cardId.slice(0, -1).toUpperCase(); // 值部分统一转大写，如 A, K, T, 8

    // 后端发的 "Th" 代表红桃10, "T" 是 VALUES_MAP 的键
    // 如果后端发的牌是 "8d", valueChar 是 "8"
    // 如果后端发的牌是 "Qc", valueChar 是 "Q"

    const suitObj = Object.values(SUITS_DATA).find(s => s.id === suitChar);
    const valueObj = VALUES_MAP[valueChar]; // 直接用处理过的 valueChar 作为键
        
    if (!suitObj || !valueObj) {
        console.warn("getCardDetails: Could not find suit or value for cardId:", cardId, 
                     "Parsed valueChar:", valueChar, "Parsed suitChar:", suitChar,
                     "Found valueObj:", valueObj, "Found suitObj:", suitObj);
        return null;
    }

    return {
        id: cardId,                 // 原始ID
        valueName: valueObj.char,   // 'A', 'K', 'Q', 'J', 'T', '9', ..., '2' (用于 getCardImageFilename)
        displayName: valueObj.name, // 'A', 'K', 'Q', 'J', '10', '9', ..., '2' (用于显示)
        suitName: suitObj.name,     // '黑桃', '红桃'
        suitSymbol: suitObj.symbol, // '♠', '♥'
        value: valueObj.rank,       // 14, 13, 10, 2 (用于逻辑比较)
        order: valueObj.order,      // 14, 13, 10, 2 (用于排序)
        suitOrder: suitObj.order,   // 用于花色排序
        suitId: suitObj.id,         // 's', 'h', 'd', 'c' (用于 getCardImageFilename)
    };
}

export function createDeck() { /* ... (保持不变，或确保它生成与 getCardDetails 兼容的ID) ... */ 
    const deck = [];
    for (const suit of Object.values(SUITS_DATA)) {
        for (const value of Object.values(VALUES_MAP)) {
            // 生成后端期望的ID格式，例如 "As", "Td", "2c"
            deck.push(`${value.char}${suit.id}`); 
        }
    }
    return deck;
}

export { SUITS_DATA, VALUES_MAP }; // 导出供其他模块使用
