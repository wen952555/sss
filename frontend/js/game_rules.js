// 牌面到数值的映射
const RANK_VALUES = {'2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'T':10, 'J':11, 'Q':12, 'K':13, 'A':14};
const SUIT_NAMES = {'S': '黑桃', 'H': '红桃', 'D': '方块', 'C': '梅花'}; // 用于显示

function getCardValue(card) { // card = {rank: 'A', suit: 'S'}
    return RANK_VALUES[card.rank.toUpperCase()];
}

// 简化版，前端主要用于显示名称，实际比较在后端
function evaluateHandDisplay(cardsSimpleArray) {
    if (!cardsSimpleArray || cardsSimpleArray.length === 0) return "";
    // TODO: 实现JS版的牌型判断逻辑，返回牌型名称
    // 例如：如果判断是三条，返回 "三条"
    // 这个函数会比较复杂，需要模拟后端GameLogic.php中的evaluateHand
    // 为简化，这里只返回牌张数
    if (cardsSimpleArray.length === 3) return "头道牌型";
    if (cardsSimpleArray.length === 5) return "中/尾道牌型";
    return "";
}

// 将后端卡牌对象 {suit: 'S', rank: 'A'} 转换为前端拖拽和显示用的唯一ID
function cardToId(card) {
    return `${card.rank}${card.suit}`;
}
// 从ID转换回卡牌对象
function idToCard(cardId) {
    const rank = cardId.slice(0, -1);
    const suit = cardId.slice(-1);
    return { rank, suit };
}
