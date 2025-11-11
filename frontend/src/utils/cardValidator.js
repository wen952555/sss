// src/utils/cardValidator.js

// 验证单张牌代码格式
export function isValidCardCode(cardCode) {
  if (!cardCode || typeof cardCode !== 'string') return false;
  
  const suit = cardCode.charAt(0).toLowerCase();
  const rank = parseInt(cardCode.substring(1));
  
  if (!['s', 'h', 'c', 'd'].includes(suit)) return false;
  if (isNaN(rank) || rank < 1 || rank > 13) return false;
  
  return true;
}

// 验证牌数组
export function validateCards(cards) {
  if (!Array.isArray(cards)) return false;
  
  // 检查是否有重复牌
  const uniqueCards = [...new Set(cards)];
  if (uniqueCards.length !== cards.length) {
    return { valid: false, message: '有重复的牌' };
  }
  
  // 检查每张牌格式
  for (const card of cards) {
    if (!isValidCardCode(card)) {
      return { valid: false, message: `无效的牌代码: ${card}` };
    }
  }
  
  return { valid: true, message: '牌组有效' };
}

// 导出空对象以保持兼容性
export default {};