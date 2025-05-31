// frontend/js/cardUtils.js
import { CARD_IMAGE_BASE_PATH, RANK_DISPLAY_MAP, SUIT_DISPLAY_MAP, CARD_RANKS_MAP, CARD_SUITS_MAP } from './constants.js';

export function createCardElement(cardData) { // **修改点：移除了 isDraggable 和 isGameOver 参数**
    const img = document.createElement('img');
    img.src = `${CARD_IMAGE_BASE_PATH}${cardData.image_file}`;
    const displayName = `${SUIT_DISPLAY_MAP[cardData.suit]}${RANK_DISPLAY_MAP[cardData.rank]}`;
    img.alt = displayName;
    img.title = displayName;
    img.classList.add('card');
    img.draggable = true; // 卡牌创建时默认可拖动，由 makeAllCardsStatic 控制最终状态
    img.dataset.cardId = cardData.id || cardData.card_id;
    img.cardData = cardData;
    img.style.cursor = 'grab'; // 默认光标，由 makeAllCardsStatic 控制最终状态
    return img;
}

export function getCardDataFromElement(cardElement) {
    return cardElement.cardData;
}

export function getCardsFromZone(zoneElement) {
    if (!zoneElement || !zoneElement.children) return [];
    return Array.from(zoneElement.children).map(getCardDataFromElement).filter(Boolean); // filter(Boolean) 移除 undefined
}

export function sortCards(cards, aceLowForStraightEval = false) {
    if (!Array.isArray(cards)) return [];
    return [...cards].sort((a, b) => {
        // 健壮性：确保 a 和 b 以及它们的属性存在
        if (!a || !b || typeof a.rankValue === 'undefined' || typeof b.rankValue === 'undefined' ||
            typeof a.suitValue === 'undefined' || typeof b.suitValue === 'undefined') {
            return 0; // 或者进行错误处理
        }

        let rankA = a.rankValue;
        let rankB = b.rankValue;
        const aceRank = CARD_RANKS_MAP.ace; // 从常量获取

        if (aceLowForStraightEval) {
            if (rankA === aceRank) rankA = 1;
            if (rankB === aceRank) rankB = 1;
        }

        if (rankB === rankA) {
            return b.suitValue - a.suitValue;
        }
        return rankB - rankA;
    });
}

export function processRawHandData(rawHand) {
    if (!Array.isArray(rawHand)) return [];
    return rawHand.map(card => {
        if (!card || !card.rank || !card.suit) return null; // 处理无效卡牌数据
        return {
            ...card,
            id: card.card_id,
            rankValue: CARD_RANKS_MAP[card.rank],
            suitValue: CARD_SUITS_MAP[card.suit]
        };
    }).filter(Boolean); // 移除null
}
