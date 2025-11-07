// cardMapper.js

const SUITS = { 's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs' };
const VALUES = {
    '1': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', 
    '8': '8', '9': '9', '10': '10', '11': 'jack', '12': 'queen', '13': 'king'
};

/**
 * 将内部卡牌代码转换为SVG文件名
 * @param {string} cardCode - 例如 's1' 代表黑桃A, 'c10' 代表梅花10
 * @returns {string} SVG文件名，例如 'ace_of_spades.svg'
 */
export const getCardImageFilename = (cardCode) => {
    if (!cardCode || cardCode.length < 2) return 'card_back.svg'; // 返回牌背图片

    const suitChar = cardCode.charAt(0).toLowerCase();
    const valueStr = cardCode.substring(1);

    const suit = SUITS[suitChar];
    const value = VALUES[valueStr];

    if (!suit || !value) {
        console.warn(`Invalid card code: ${cardCode}`);
        return 'card_back.svg';
    }

    return `${value}_of_${suit}.svg`;
};

/**
 * 获取卡牌图片的完整路径
 * @param {string} cardCode 
 * @returns {string} 完整的图片URL
 */
export const getCardImageUrl = (cardCode) => {
    const filename = getCardImageFilename(cardCode);
    return `/cards/${filename}`;
};