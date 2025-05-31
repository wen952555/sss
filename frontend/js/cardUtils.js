// frontend/js/cardUtils.js
import { CARD_IMAGE_BASE_PATH, RANK_DISPLAY_MAP, SUIT_DISPLAY_MAP, CARD_RANKS_MAP, CARD_SUITS_MAP } from './constants.js';

export function createCardElement(cardData, isDraggable = true, isGameOver = false) {
    const img = document.createElement('img');
    img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
    const displayName = `${SUIT_DISPLAY_MAP[cardData.suit]}${RANK_DISPLAY_MAP[cardData.rank]}`;
    img.alt = displayName;
    img.title = displayName;
    img.classList.add('card');
    img.draggable = isDraggable && !isGameOver;
    img.dataset.cardId = cardData.id || cardData.card_id; // 确保有id
    img.cardData = cardData; // 附加完整数据
    img.style.cursor = (isDraggable && !isGameOver) ? 'grab' : 'default';
    return img;
}

export function getCardDataFromElement(cardElement) {
    return cardElement.cardData;
}

export function getCardsFromZone(zoneElement) {
    return Array.from(zoneElement.children).map(getCardDataFromElement);
}

// 卡牌排序函数
// aceLowForStraightEval: 在判断A2345顺子时，A作为1来比较大小，但在牌面值中A依然是14
export function sortCards(cards, aceLowForStraightEval = false) {
    return [...cards].sort((a, b) => {
        let rankA = a.rankValue;
        let rankB = b.rankValue;

        // 为了A2345顺子判断，将A的点数临时视为1
        if (aceLowForStraightEval) {
            if (rankA === CARD_RANKS_MAP.ace) rankA = 1; // ace的值为14，临时变成1
            if (rankB === CARD_RANKS_MAP.ace) rankB = 1;
        }

        if (rankB === rankA) {
            return b.suitValue - a.suitValue; // 花色大优先 (黑桃4 > 红桃3 > 梅花2 > 方块1)
        }
        return rankB - rankA; // 点数大优先
    });
}

// 将从后端获取的原始牌数据转换为包含 rankValue 和 suitValue 的格式
export function processRawHandData(rawHand) {
    return rawHand.map(card => ({
        ...card,
        id: card.card_id, // 统一使用id
        rankValue: CARD_RANKS_MAP[card.rank],
        suitValue: CARD_SUITS_MAP[card.suit]
    }));
}
