/**
 * 适配 rank_of_suit.png 命名的扑克牌图片路径
 * @param {Object} card - 牌对象, 例如 {suit: 'c', rank: 10} 或 {suit: 's', rank: 'A'}
 * @returns {string} 图片URL
 */
function getCardImage(card) {
  if (!card || typeof card.suit !== 'string' || typeof card.rank === 'undefined') {
    // 占位错误图
    return CONFIG.IMAGE_SERVER_BASE_URL + "placeholder_error.png";
  }

  // 花色映射
  const suitMap = {
    s: "spades",
    h: "hearts",
    d: "diamonds",
    c: "clubs"
  };
  // 点数映射
  const rankMap = {
    1: "ace",
    11: "jack",
    12: "queen",
    13: "king",
    14: "ace", // 部分后端可能14代表A
    'a': "ace", 'A': "ace",
    'k': "king", 'K': "king",
    'q': "queen", 'Q': "queen",
    'j': "jack", 'J': "jack",
    't': "10", 'T': "10"
  };

  // 支持数字、字符等多种点数输入
  let rank = card.rank;
  if (typeof rank === "number") {
    if (rankMap[rank]) rank = rankMap[rank];
    else rank = String(rank);
  } else if (typeof rank === "string") {
    if (rankMap[rank]) rank = rankMap[rank];
    else rank = rank.toLowerCase();
  }

  let suit = suitMap[String(card.suit).toLowerCase()] || String(card.suit).toLowerCase();

  return `${CONFIG.IMAGE_SERVER_BASE_URL}${rank}_of_${suit}.png`;
}

/** 获取扑克牌背面图片 */
function getBackImage() {
  return CONFIG.IMAGE_SERVER_BASE_URL + "back.png";
}
