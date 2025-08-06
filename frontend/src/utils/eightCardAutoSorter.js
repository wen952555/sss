// --- START OF FILE frontend/src/utils/eightCardAutoSorter.js ---

/**
 * eightCardAutoSorter.js - 八张游戏专用智能理牌模块
 * 使用 eightCardScorer.js 中的比较逻辑
 */

import { compareLanes, getHandType } from './eightCardScorer';

/**
 * 辅助函数：从一个数组中获取所有指定大小的组合
 * @param {Array} array - 原始数组
 * @param {number} size - 组合的大小
 * @returns {Array<Array>} 所有可能的组合
 */
const getCombinations = (array, size) => {
  if (size === 0) return [[]];
  if (!array || array.length < size) return [];
  const first = array[0];
  const rest = array.slice(1);
  const combsWithFirst = getCombinations(rest, size - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = getCombinations(rest, size);
  return [...combsWithFirst, ...combsWithoutFirst];
};

/**
 * 辅助函数：在一组牌中找到所有能组成的牌型组合，并按强度排序
 * @param {Array} cards - 卡牌数组
 * @param {number} handSize - 需要几张牌组成一手
 * @returns {Array<Array>} 返回所有牌型组合的数组，从强到弱排序
 */
const findAllHandCombinations = (cards, handSize) => {
  const allCombinations = getCombinations(cards, handSize);
  if (allCombinations.length === 0) return [];

  // 使用八张的比较逻辑进行排序
  return allCombinations.sort((a, b) => compareLanes(b, a));
};

/**
 * 主函数：执行八张游戏的智能理牌算法
 * @param {Array<Object>} allCards - 玩家的所有8张手牌
 * @returns {{top: Array, middle: Array, bottom: Array} | null} 返回理好的三道牌，如果无解则返回null
 */
export const getSmartSortedHandForEight = (allCards) => {
  if (allCards.length !== 8) {
    console.error("八张智能理牌需要8张牌");
    return null;
  }

  // 1. 找出所有可能的尾道组合 (3张)，并按强度排序
  const allPossibleBottoms = findAllHandCombinations(allCards, 3);

  // 2. 遍历所有可能的尾道，尝试寻找一个合法的组合
  for (const bottom of allPossibleBottoms) {
    const remainingAfterBottom = allCards.filter(c => !bottom.some(bc => bc.rank === c.rank && bc.suit === c.suit));
    
    // 3. 在剩下的5张牌中，找出所有可能的中道组合 (3张)
    const allPossibleMiddles = findAllHandCombinations(remainingAfterBottom, 3);

    for (const middle of allPossibleMiddles) {
      // 4. 检查合法性：尾道必须 >= 中道
      if (compareLanes(bottom, middle) >= 0) {
        const top = remainingAfterBottom.filter(c => !middle.some(mc => mc.rank === c.rank && mc.suit === c.suit));
        
        // 5. 检查合法性：中道必须 >= 头道 (头道是2张)
        if (compareLanes(middle, top) >= 0) {
          // 找到了一个完全合法的组合，立即返回！
          // 八张不需要对内部进行排序，保持组合即可
          return {
            top: top,
            middle: middle,
            bottom: bottom,
          };
        }
      }
    }
  }

  // 如果找不到解，返回null
  console.warn("八张智能理牌未能找到任何有效组合。");
  return null;
};

// --- END OF FILE frontend/src/utils/eightCardAutoSorter.js ---