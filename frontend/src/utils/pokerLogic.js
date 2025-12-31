const RANK_ORDER = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'jack':11, 'queen':12, 'king':13, 'ace':14 };
const PATTERN_NAMES = ["散牌", "对子", "两对", "三条", "顺子", "同花", "葫芦", "四条", "同花顺"];

export const getHandDetails = (cards) => {
  if (cards.length === 0) return { score: 0, name: "" };
  
  const ranks = cards.map(c => RANK_ORDER[c.split('_')[0]]).sort((a, b) => a - b);
  const suits = cards.map(c => c.split('_')[2]);
  
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const valCounts = Object.values(counts).sort((a, b) => b - a);
  
  const isFlush = new Set(suits).size === 1 && cards.length === 5;
  let isStraight = false;
  if (cards.length === 5) {
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length === 5 && (ranks[4] - ranks[0] === 4)) isStraight = true;
    if (ranks.join(',') === '2,3,4,5,14') isStraight = true; // A2345 顺子
  }

  let type = 0; // 0: 散牌
  if (isFlush && isStraight) type = 8;
  else if (valCounts[0] === 4) type = 7;
  else if (valCounts[0] === 3 && valCounts[1] === 2) type = 6;
  else if (isFlush) type = 5;
  else if (isStraight) type = 4;
  else if (valCounts[0] === 3) type = 3;
  else if (valCounts[0] === 2 && valCounts[1] === 2) type = 2;
  else if (valCounts[0] === 2) type = 1;

  // 计算一个用于比较的绝对分值: 类型权重 + 最大牌权重
  const score = type * 1000000 + ranks[ranks.length-1];
  return { type, score, name: PATTERN_NAMES[type] };
};