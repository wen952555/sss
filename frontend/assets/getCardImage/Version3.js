/**
 * 将牌对象转换为图片文件名
 * @param {Object} card - 牌对象，如 {suit: 'c', rank: 10}
 * @returns {string} 图片URL
 */
function getCardImage(card) {
  // 花色映射
  const suitMap = {
    's': 'spades',    // 黑桃
    'h': 'hearts',    // 红桃
    'd': 'diamonds',  // 方块
    'c': 'clubs'      // 梅花
  };

  // 点数映射
  const rankMap = {
    11: 'jack',
    12: 'queen',
    13: 'king',
    14: 'ace'
  };

  let rankStr = rankMap[card.rank] || card.rank; // 2-10 直接用数字
  let suitStr = suitMap[card.suit];

  // 拼接图片文件名
  const fileName = `${rankStr}_of_${suitStr}.png`;

  // 返回图片完整URL
  return CONFIG.IMAGE_SERVER_BASE_URL + fileName;
}

// 扑克牌背面
function getBackImage() {
  return CONFIG.IMAGE_SERVER_BASE_URL + 'back.png';
}
