// frontend/src/utils/pokerEvaluator.js

// 定义卡牌的点数，用于计算和比较大小
// 特殊处理 A, 2, 3, 4, 5 最小的顺子
export const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 
  'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

// 定义牌型和它们的强弱等级，等级越高牌型越大
export const HAND_TYPES = {
  HIGH_CARD: { rank: 0, name: '高牌' },
  PAIR: { rank: 1, name: '对子' },
  TWO_PAIR: { rank: 2, name: '两对' },
  THREE_OF_A_KIND: { rank: 3, name: '三条' },
  STRAIGHT: { rank: 4, name: '顺子' },
  FLUSH: { rank: 5, name: '同花' },
  FULL_HOUSE: { rank: 6, name: '葫芦' },
  FOUR_OF_A_KIND: { rank: 7, name: '铁支' },
  STRAIGHT_FLUSH: { rank: 8, name: '同花顺' },
};

/**
 * 评估一手牌（3张或5张）的牌型和大小
 * @param {Array} cards - 卡牌对象的数组
 * @returns {Object} 一个包含牌型等级、名称和用于比较大小的值的对象
 */
export function evaluateHand(cards) {
  if (!cards || cards.length === 0) {
    return { ...HAND_TYPES.HIGH_CARD, values: [0] };
  }

  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = new Set(suits).size === 1;
  
  // 检查是否为顺子
  const rankSet = new Set(ranks);
  const isStraight = rankSet.size === cards.length && (ranks[0] - ranks[ranks.length - 1] === cards.length - 1);
  // 特殊处理 A-2-3-4-5 的情况
  const isAceLowStraight = JSON.stringify(ranks) === JSON.stringify([14, 5, 4, 3, 2]);

  if (isStraight && isFlush) {
    return { ...HAND_TYPES.STRAIGHT_FLUSH, values: ranks };
  }
  if (isAceLowStraight && isFlush) {
    // A-5同花顺，A作为5来比较
    return { ...HAND_TYPES.STRAIGHT_FLUSH, values: [5, 4, 3, 2, 1] };
  }

  const rankCounts = ranks.reduce((acc, rank) => {
    acc[rank] = (acc[rank] || 0) + 1;
    return acc;
  }, {});

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const primaryRanks = Object.keys(rankCounts).map(Number).sort((a, b) => {
      if (rankCounts[a] !== rankCounts[b]) {
          return rankCounts[b] - rankCounts[a];
      }
      return b - a;
  });

  if (counts[0] === 4) {
    return { ...HAND_TYPES.FOUR_OF_A_KIND, values: primaryRanks };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    return { ...HAND_TYPES.FULL_HOUSE, values: primaryRanks };
  }

  if (isFlush) {
    return { ...HAND_TYPES.FLUSH, values: ranks };
  }

  if (isStraight) {
    return { ...HAND_TYPES.STRAIGHT, values: ranks };
  }
  if (isAceLowStraight) {
    return { ...HAND_TYPES.STRAIGHT, values: [5, 4, 3, 2, 1] };
  }

  if (counts[0] === 3) {
    return { ...HAND_TYPES.THREE_OF_A_KIND, values: primaryRanks };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return { ...HAND_TYPES.TWO_PAIR, values: primaryRanks };
  }

  if (counts[0] === 2) {
    return { ...HAND_TYPES.PAIR, values: primaryRanks };
  }

  return { ...HAND_TYPES.HIGH_CARD, values: ranks };
}

/**
 * 比较两手牌的大小
 * @param {Object} handA - evaluateHand返回的结果
 * @param {Object} handB - evaluateHand返回的结果
 * @returns {number} > 0 如果 A > B, < 0 如果 A < B, 0 如果相等
 */
export function compareHands(handA, handB) {
  // 首先比较牌型等级
  const rankDifference = handA.rank - handB.rank;
  if (rankDifference !== 0) {
    return rankDifference;
  }
  
  // 如果牌型相同，则依次比较关键牌的大小
  for (let i = 0; i < handA.values.length; i++) {
    const valueDifference = handA.values[i] - handB.values[i];
    if (valueDifference !== 0) {
      return valueDifference;
    }
  }

  return 0; // 两手牌完全相同
}
