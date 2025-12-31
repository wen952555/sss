const RANK_ORDER = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'jack':11, 'queen':12, 'king':13, 'ace':14 };

// 牌型分值定义
export const SCORES = { 
  STRAIGHT_FLUSH: 800, FOUR_OF_A_KIND: 700, FULL_HOUSE: 600, 
  FLUSH: 500, STRAIGHT: 400, THREE_OF_A_KIND: 300, 
  TWO_PAIR: 200, PAIR: 100, HIGH_CARD: 0 
};

// 提取牌的点数和花色
const parseCard = (c) => ({ rank: RANK_ORDER[c.split('_')[0]], suit: c.split('_')[2], raw: c });

// 寻找最佳5张组合 (贪心搜索)
function findBestFive(cards) {
  const parsed = cards.map(parseCard).sort((a, b) => b.rank - a.rank);
  
  // 这里简化展示核心逻辑：优先寻找顺子、同花
  const suits = {}; parsed.forEach(c => suits[c.suit] = [...(suits[c.suit] || []), c]);
  // 同花检查
  for (let s in suits) {
    if (suits[s].length >= 5) return suits[s].slice(0, 5).map(c => c.raw);
  }
  
  // 顺子检查
  const unique = []; const seen = new Set();
  parsed.forEach(c => { if(!seen.has(c.rank)) { unique.push(c); seen.add(c.rank); }});
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i].rank - unique[i+4].rank === 4) return unique.slice(i, i+5).map(c => c.raw);
  }

  // 默认返回点数最大的5张
  return cards.slice(0, 5);
}

// 最终导出：智能分牌
export const smartSort = (allCards) => {
  let remaining = [...allCards].sort((a, b) => {
    return RANK_ORDER[b.split('_')[0]] - RANK_ORDER[a.split('_')[0]];
  });

  const back = findBestFive(remaining);
  remaining = remaining.filter(c => !back.includes(c));

  const mid = findBestFive(remaining);
  remaining = remaining.filter(c => !mid.includes(c));

  const head = remaining;

  return { head, mid, back };
};

export const getPatternName = (cards) => {
  if (cards.length === 0) return "";
  const ranks = cards.map(c => RANK_ORDER[c.split('_')[0]]).sort((a,b)=>a-b);
  const counts = {}; ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);
  const v = Object.values(counts).sort((a,b)=>b-a);
  if (v[0] === 4) return "四条";
  if (v[0] === 3 && v[1] === 2) return "葫芦";
  if (v[0] === 3) return "三条";
  if (v[0] === 2 && v[1] === 2) return "两对";
  if (v[0] === 2) return "对子";
  return "散牌";
};