// --- START OF FILE frontend/src/utils/autoSorter.js ---

import { evaluateHand, compareHands, sortCards } from './pokerEvaluator';

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
 * @param {number} handSize - 需要几张牌组成一手 (例如 3 或 5)
 * @returns {Array<{hand: Object, combination: Array}>} 返回所有牌型组合的数组，从强到弱排序
 */
const findAllHandCombinations = (cards, handSize) => {
  const allCombinations = getCombinations(cards, handSize);
  if (allCombinations.length === 0) return [];

  const evaluatedCombinations = allCombinations.map(combination => {
    const hand = evaluateHand(combination);
    return { hand, combination };
  });

  // 按牌力从高到低排序
  return evaluatedCombinations.sort((a, b) => compareHands(b.hand, a.hand));
};


/**
 * 主函数：执行智能理牌算法
 * @param {Array<Object>} allCards - 玩家的所有13张手牌
 * @returns {{top: Array, middle: Array, bottom: Array} | null} 返回理好的三道牌，如果无解则返回null
 */
export const getSmartSortedHand = (allCards) => {
  if (allCards.length !== 13) {
    console.error("智能理牌需要13张牌");
    return null;
  }

  // 1. 找出所有可能的尾道组合，并按强度排序
  const allPossibleBottoms = findAllHandCombinations(allCards, 5);

  // 2. 遍历所有可能的尾道，尝试寻找一个合法的组合
  for (const bottom of allPossibleBottoms) {
    const remainingAfterBottom = allCards.filter(c => !bottom.combination.includes(c));
    
    // 3. 在剩下的8张牌中，找出所有可能的中道组合
    const allPossibleMiddles = findAllHandCombinations(remainingAfterBottom, 5);

    for (const middle of allPossibleMiddles) {
      // 4. 检查合法性：尾道必须 >= 中道
      if (compareHands(bottom.hand, middle.hand) >= 0) {
        const top = remainingAfterBottom.filter(c => !middle.combination.includes(c));
        const topHand = evaluateHand(top);
        
        // 5. 检查合法性：中道必须 >= 头道
        if (compareHands(middle.hand, topHand) >= 0) {
          // 找到了一个完全合法的组合，立即返回！
          return {
            top: sortCards(top),
            middle: sortCards(middle.combination),
            bottom: sortCards(bottom.combination),
          };
        }
      }
    }
  }

  // 如果遍历完所有组合都找不到解（理论上不太可能，除非规则极度苛刻），返回null
  console.warn("智能理牌未能找到任何有效组合。");
  return null;
};

// --- END OF FILE frontend/src/utils/autoSorter.js ---