// 卡牌处理模块
import { CARD_IMAGE_PATH } from './config.js';

const SUIT_NAMES_CN = {
    clubs: "梅花",
    diamonds: "方块",
    hearts: "红桃",
    spades: "黑桃"
};

const RANK_NAMES_CN = {
    'ace': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
    'jack': 'J', 'queen': 'Q', 'king': 'K'
};

/**
 * 从文件名解析卡牌信息
 * @param {string} filename - 例如 "10_of_clubs.svg"
 * @returns {object|null} - { rank: '10', suit: 'clubs', rank_cn: '10', suit_cn: '梅花' } 或 null
 */
export function parseCardFilename(filename) {
    if (!filename || !filename.endsWith('.svg')) return null;
    const nameOnly = filename.slice(0, -4); // 移除 .svg
    const parts = nameOnly.split('_of_');
    if (parts.length !== 2) return null;

    const rank = parts[0];
    const suit = parts[1];

    return {
        rank: rank,
        suit: suit,
        rank_cn: RANK_NAMES_CN[rank] || rank.toUpperCase(),
        suit_cn: SUIT_NAMES_CN[suit] || suit
    };
}

/**
 * 创建卡牌的 HTML 图像元素
 * @param {object} cardData - 卡牌数据，至少包含 rank 和 suit (英文)
 * @returns {HTMLImageElement} - <img> 元素
 */
export function createCardImageElement(cardData) {
    const img = document.createElement('img');
    const filename = `${cardData.rank.toLowerCase()}_of_${cardData.suit.toLowerCase()}.svg`;
    img.src = `${CARD_IMAGE_PATH}${filename}`;

    const cardInfo = parseCardFilename(filename);
    if (cardInfo) {
        img.alt = `${cardInfo.suit_cn} ${cardInfo.rank_cn}`;
    } else {
        img.alt = `${cardData.suit} ${cardData.rank}`;
    }
    img.classList.add('card-image');
    // 可以添加 data-* 属性来存储卡牌信息，方便后续操作
    img.dataset.rank = cardData.rank;
    img.dataset.suit = cardData.suit;
    return img;
}

// 示例：将牌面转换为用于排序的值 (十三水 A 最大)
export function getCardSortValue(card) { // card = { rank: 'ace', suit: 'spades' }
    const rankValues = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
    };
    const suitValues = { 'spades': 4, 'hearts': 3, 'diamonds': 2, 'clubs': 1 }; // 黑桃>红桃>方块>梅花

    return rankValues[card.rank.toLowerCase()] * 10 + suitValues[card.suit.toLowerCase()];
}
