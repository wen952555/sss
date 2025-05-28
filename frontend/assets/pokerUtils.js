// === 扑克判型算法（支持3/5张） ===

// 点数与权重映射
const RANK_ORDER = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  'a': 14, 'k': 13, 'q': 12, 'j': 11, 't': 10
};
// 支持数字型 rank
function getRankValue(rank) {
  if (typeof rank === "number") return rank === 1 ? 14 : rank;
  return RANK_ORDER[String(rank).toUpperCase()] || Number(rank);
}

// 主入口：传入一组牌，返回{type, rank, values, description}
function getHandType(cards) {
  if (!Array.isArray(cards)) return {type: "不合法", rank: 0, values: []};
  if (cards.length === 3) return getThreeCardType(cards);
  if (cards.length === 5) return getFiveCardType(cards);
  return {type: "不合法", rank: 0, values: []};
}

// 3张牌型
function getThreeCardType(cards) {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = new Set(suits).size === 1;
  const isStraight = isConsecutive(values, 3);

  if (isFlush && isStraight) return {type: "顺金", rank: 6, values, description: "同花顺"};
  if (values[0] === values[2]) return {type: "三条", rank: 5, values, description: "三条"};
  if (isFlush) return {type: "同花", rank: 4, values, description: "同花"};
  if (isStraight) return {type: "顺子", rank: 3, values, description: "顺子"};
  if (values[0] === values[1] || values[1] === values[2]) return {type: "对子", rank: 2, values, description: "对子"};
  return {type: "高牌", rank: 1, values, description: "高牌"};
}

// 5张牌型
function getFiveCardType(cards) {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countArr = Object.values(counts).sort((a, b) => b - a);
  const isFlush = new Set(suits).size === 1;
  const isStraight = isConsecutive(values, 5);

  if (isFlush && isStraight) return {type: "同花顺", rank: 9, values, description: "同花顺"};
  if (countArr[0] === 4) return {type: "铁支", rank: 8, values, description: "四条"};
  if (countArr[0] === 3 && countArr[1] === 2) return {type: "葫芦", rank: 7, values, description: "葫芦"};
  if (isFlush) return {type: "同花", rank: 6, values, description: "同花"};
  if (isStraight) return {type: "顺子", rank: 5, values, description: "顺子"};
  if (countArr[0] === 3) return {type: "三条", rank: 4, values, description: "三条"};
  if (countArr[0] === 2 && countArr[1] === 2) return {type: "两对", rank: 3, values, description: "两对"};
  if (countArr[0] === 2) return {type: "一对", rank: 2, values, description: "一对"};
  return {type: "高牌", rank: 1, values, description: "高牌"};
}

// 判断是否顺子（支持A2345）
function isConsecutive(values, length) {
  // 普通顺子
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] - 1) break;
    if (i === values.length - 1) return true;
  }
  // 低A顺
  if (length === 5 && values.join(',') === [14, 5, 4, 3, 2].join(',')) return true;
  if (length === 3 && values.join(',') === [14, 3, 2].join(',')) return true;
  return false;
}

// 比较两组牌型大小，返回1(左大) 0(平) -1(右大)
function compareHandType(hand1, hand2) {
  if (hand1.rank !== hand2.rank) return hand1.rank > hand2.rank ? 1 : -1;
  for (let i = 0; i < hand1.values.length; i++) {
    if (hand1.values[i] !== hand2.values[i]) return hand1.values[i] > hand2.values[i] ? 1 : -1;
  }
  return 0;
}
