// src/utils/cardHelper.js

const suitMap = {
    s: 'spades',   // 黑桃
    h: 'hearts',   // 红桃
    c: 'clubs',    // 梅花
    d: 'diamonds'  // 方块
};

const rankMap = {
    '1': 'ace',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    '11': 'jack',
    '12': 'queen',
    '13': 'king'
};

/**
 * 根据后端牌代码获取SVG图片文件名
 * @param {string} cardCode - 例如 's1' (黑桃A), 'c10' (梅花10), 'd13' (方块K)
 * @returns {string} - SVG文件名, 例如 'ace_of_spades.svg'
 */
export function getCardImageFilename(cardCode) {
    if (!cardCode || cardCode.length < 2) {
        return 'card_back.svg'; // 返回牌背或默认图
    }

    const suitChar = cardCode.charAt(0).toLowerCase();
    const rankNum = cardCode.substring(1);

    const suit = suitMap[suitChar];
    const rank = rankMap[rankNum];

    if (!suit || !rank) {
        return 'card_back.svg';
    }

    return `${rank}_of_${suit}.svg`;
}

/**
 * 获取完整的图片URL (Vite的正确方式)
 * @param {string} cardCode 
 * @returns {string}
 */
export function getCardImageUrl(cardCode) {
    const filename = getCardImageFilename(cardCode);
    // 假设你的SVG文件都放在 /src/assets/cards/ 目录下
    // Vite在构建时会自动处理这些路径
    try {
        return new URL(`../assets/cards/${filename}`, import.meta.url).href;
    } catch (error) {
        console.error(`Card image not found for code: ${cardCode}`, error);
        // 返回一个默认的牌背图片URL
        return new URL('../assets/cards/card_back.svg', import.meta.url).href;
    }
}