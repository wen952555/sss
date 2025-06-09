// frontend/src/utils/cardUtils.js
const SUITS_DATA = { // Renamed from SUITS to avoid conflict if SUITS is also a component or const
    spades: { name: '黑桃', symbol: '♠', id: 's', order: 4 }, // Added order for sorting suits
    hearts: { name: '红桃', symbol: '♥', id: 'h', order: 3 },
    diamonds: { name: '方块', symbol: '♦', id: 'd', order: 2 },
    clubs: { name: '梅花', symbol: '♣', id: 'c', order: 1 },
};

const VALUES_MAP = {
    '2': { name: '2', value: 2, order: 2 },
    '3': { name: '3', value: 3, order: 3 },
    '4': { name: '4', value: 4, order: 4 },
    '5': { name: '5', value: 5, order: 5 },
    '6': { name: '6', value: 6, order: 6 },
    '7': { name: '7', value: 7, order: 7 },
    '8': { name: '8', value: 8, order: 8 },
    '9': { name: '9', value: 9, order: 9 },
    '10': { name: '10', value: 10, order: 10 }, // Can also use 'T' for 10 if backend uses that
    'jack': { name: 'J', value: 11, order: 11 },
    'queen': { name: 'Q', value: 12, order: 12 },
    'king': { name: 'K', value: 13, order: 13 },
    'ace': { name: 'A', value: 14, order: 14 }, // A usually highest in thirteen water comparisons
};

/**
 * 根据卡牌对象或字符串获取卡牌图片的SVG文件名
 * @param {object|string} card - 卡牌对象 { value: 'ace', suit: 'spades' } 或字符串 "as", "10c"
 * @returns {string} SVG图片文件名, e.g., 'ace_of_spades.svg'
 */
export function getCardImageFilename(card) {
    let valueKey, suitKey;

    if (typeof card === 'string') {
        // 解析 "as" (ace of spades), "kc" (king of clubs), "10d" (10 of diamonds)
        const suitChar = card.slice(-1).toLowerCase();
        const valueChars = card.slice(0, -1).toLowerCase();

        suitKey = Object.keys(SUITS_DATA).find(key => SUITS_DATA[key].id === suitChar);
        
        if (valueChars === 'a') valueKey = 'ace';
        else if (valueChars === 'k') valueKey = 'king';
        else if (valueChars === 'q') valueKey = 'queen';
        else if (valueChars === 'j') valueKey = 'jack';
        else if (valueChars === 't' || valueChars === '10') valueKey = '10'; // Allow 't' or '10' for Ten
        else valueKey = valueChars; // For 2-9

    } else if (typeof card === 'object' && card !== null && card.value && card.suit) {
        valueKey = String(card.value).toLowerCase(); // 'ace', 'king', '10', '2'
        suitKey = String(card.suit).toLowerCase();   // 'spades', 'hearts'
    }

    // 确保 valueKey 在 VALUES_MAP 中存在 (例如将 'a' 映射到 'ace')
    if (valueKey && !VALUES_MAP[valueKey] && VALUES_MAP[valueKey.replace('10', '10')]) { // Handle '10' if stored as numeric
         valueKey = Object.keys(VALUES_MAP).find(k => VALUES_MAP[k].name.toLowerCase() === valueKey || String(VALUES_MAP[k].value) === valueKey);
    }
     if (valueKey && VALUES_MAP[valueKey] && VALUES_MAP[valueKey].name === '10' && valueKey !== '10') {
         valueKey = '10'; // Normalize to '10' for filename if input was numeric 10
     }


    if (!valueKey || !suitKey || !VALUES_MAP[valueKey] || !SUITS_DATA[suitKey]) {
        console.error("Invalid card for image generation:", card, "Resolved valueKey:", valueKey, "suitKey:", suitKey);
        return 'placeholder.svg'; // Fallback image
    }
    
    // 通常文件名用 '10' 而不是数字 10
    const valueForFilename = VALUES_MAP[valueKey].name === '10' ? '10' : valueKey;

    return `${valueForFilename}_of_${suitKey}.svg`;
}

/**
 * 根据卡牌ID字符串 (例如 "14s", "2c", "Td") 获取卡牌详细信息
 * @param {string} cardString - 后端/逻辑层使用的卡牌ID, e.g., "As", "Td", "2c"
 *                               或者 "14s", "10d", "2c" (数值表示)
 * @returns {object|null} 卡牌详细信息对象或null
 */
export function getCardDetails(cardString) {
    if (typeof cardString !== 'string' || cardString.length < 2) return null;

    const suitChar = cardString.slice(-1).toLowerCase();
    let valuePart = cardString.slice(0, -1); // Can be 'A', 'K', 'Q', 'J', 'T', '10', '2'-'9' or numeric 14, 13 etc.

    const suitObj = Object.values(SUITS_DATA).find(s => s.id === suitChar);
    if (!suitObj) return null;

    let valueObj;
    // Check if valuePart is numeric (like "14", "10", "2")
    if (!isNaN(parseInt(valuePart, 10))) {
        const numericValue = parseInt(valuePart, 10);
        valueObj = Object.values(VALUES_MAP).find(v => v.value === numericValue);
    } else { // Check for 'A', 'K', 'T' etc.
        valuePart = valuePart.toUpperCase();
        if (valuePart === 'T') valuePart = '10'; // Normalize T to 10
        valueObj = Object.values(VALUES_MAP).find(v => v.name === valuePart);
    }
    
    if (!valueObj) return null;

    return {
        id: cardString, // 原始ID
        name: valueObj.name, // 'A', 'K', '10', '2'
        suitName: suitObj.name,   // '黑桃', '红桃'
        suitSymbol: suitObj.symbol, // '♠', '♥'
        value: valueObj.value,     // 14, 13, 10, 2 (用于逻辑比较)
        order: valueObj.order,     // 14, 13, 10, 2 (用于排序)
        suitOrder: suitObj.order,  // 用于花色排序
        suitId: suitObj.id,        // 's', 'h', 'd', 'c'
        image: getCardImageFilename({ value: valueObj.name.toLowerCase(), suit: suitObj.id }) // 生成图片文件名
    };
}

/**
 * 创建一副标准52张牌的牌堆 (使用后端/逻辑层惯用的ID格式)
 * @returns {string[]} 返回卡牌ID字符串数组, e.g., ["As", "Ks", ..., "2c"] or ["14s", "13s", ..., "2c"]
 */
export function createDeck(useNumericValueId = true) { // true: "14s", false: "As"
    const deck = [];
    for (const suit of Object.values(SUITS_DATA)) {
        for (const value of Object.values(VALUES_MAP)) {
            if (useNumericValueId) {
                deck.push(`${value.value}${suit.id}`); // e.g., "14s", "2c"
            } else {
                let valueChar = value.name;
                if (value.name === '10') valueChar = 'T'; // Use T for Ten if not using numeric
                deck.push(`${valueChar}${suit.id}`); // e.g., "As", "Tc"
            }
        }
    }
    return deck;
}

// 示例：比较两张牌的函数（基于 getCardDetails 返回的 order 和 suitOrder）
// card1, card2 是通过 getCardDetails 解析后的对象
export function compareCards(card1Details, card2Details) {
    if (!card1Details || !card2Details) return 0; // Or throw error

    // 先比较点数大小
    if (card1Details.order > card2Details.order) return -1; // card1 大
    if (card1Details.order < card2Details.order) return 1;  // card2 大
    
    // 点数相同，比较花色 (十三水中特定情况下才比花色，这里提供一个通用比较)
    if (card1Details.suitOrder > card2Details.suitOrder) return -1; // card1 花色大
    if (card1Details.suitOrder < card2Details.suitOrder) return 1;  // card2 花色大
    
    return 0; // 完全相同 (理论上不可能在一副牌里)
}

// 导出 SUITS_DATA 和 VALUES_MAP 供其他模块使用 (如果需要)
export { SUITS_DATA, VALUES_MAP };
