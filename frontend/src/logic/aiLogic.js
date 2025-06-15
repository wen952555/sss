// frontend_react/src/logic/aiLogic.js
import { evaluateHand, isValidArrangement, compareCards } from './cardUtils';

// 这是一个非常基础的AI分牌逻辑
// 目标：找到一个合法的分牌方式
// 策略：
// 1. 生成所有可能的5-5-3组合 (计算量巨大，不可行)
// 2. 启发式搜索：
//    a. 尝试构建最强的尾墩
//    b. 用剩余牌构建最强的中墩
//    c. 剩余牌做头墩
//    d. 检查合法性，如果不合法，尝试次强组合
// 简化版AI: 随机打乱，然后尝试组合，或者固定一种简单策略
export const arrangeCardsAI = (hand) => { // hand是13张牌
  if (hand.length !== 13) return null;

  const allCards = [...hand].sort(compareCards); // 从小到大排序

  // 尝试找到最佳排列 (这是一个NP难题，这里用简化贪心策略)
  // 策略1: 优先凑大牌放尾墩，然后中墩，最后头墩

  let bestArrangement = null;
  let bestScoreSum = -1; // 用于评估排列的好坏（墩牌rank之和，非实际得分）

  // 生成所有13张牌中取5张的组合 (C(13,5) = 1287)
  const combinations = (arr, k) => {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const first = arr[0];
    const withoutFirst = combinations(arr.slice(1), k - 1).map(c => [first, ...c]);
    const withFirst = combinations(arr.slice(1), k);
    return [...withoutFirst, ...withFirst];
  };
  
  const fiveCardCombinations = combinations(allCards, 5);

  for (const wei of fiveCardCombinations) {
    const remainingAfterWei = allCards.filter(card => !wei.includes(card));
    if (remainingAfterWei.length !== 8) continue;

    const zhongCombinations = combinations(remainingAfterWei, 5);
    for (const zhong of zhongCombinations) {
      const tou = remainingAfterWei.filter(card => !zhong.includes(card));
      if (tou.length !== 3) continue;

      if (isValidArrangement(tou, zhong, wei)) {
        const evalTou = evaluateHand(tou);
        const evalZhong = evaluateHand(zhong);
        const evalWei = evaluateHand(wei);
        const currentScoreSum = evalTou.rank + evalZhong.rank + evalWei.rank;

        if (currentScoreSum > bestScoreSum) {
          bestScoreSum = currentScoreSum;
          bestArrangement = { tou, zhong, wei };
        }
      }
    }
  }
  
  // 如果实在找不到（理论上总能找到，除非isValidArrangement有bug或牌型判断不全）
  // 可以采用一个保底策略：随便分，然后调整至合法。
  // 但对于13张牌，以上遍历应该能找到至少一种合法解。
  if (!bestArrangement) {
      // 降级策略：按点数排序，直接分
      console.warn("AI could not find optimal, using fallback basic arrangement");
      const sortedHand = [...hand].sort((a,b) => a.rankValue - b.rankValue); // 从小到大
      let tou = sortedHand.slice(0,3);
      let zhong = sortedHand.slice(3,8);
      let wei = sortedHand.slice(8,13);

      // 简单调整，确保尽可能合法 (这部分需要更智能的调整逻辑)
      // 例如，如果tou > zhong，尝试从zhong拿一张最小的给tou，从tou拿张最大的给zhong
      // 这里仅作示例，实际调整逻辑复杂
      if (!isValidArrangement(tou, zhong, wei)) {
        // 再次尝试打乱顺序分配，取第一个合法的
        for(let i=0; i<10; i++) { //尝试10次随机
            let tempHand = [...hand].sort(() => 0.5 - Math.random());
            tou = tempHand.slice(0,3);
            zhong = tempHand.slice(3,8);
            wei = tempHand.slice(8,13);
            if(isValidArrangement(tou,zhong,wei)) {
                bestArrangement = {tou, zhong, wei};
                break;
            }
        }
        if(!bestArrangement) { //如果还是不行，就用排序后不一定合法的
             bestArrangement = {
                tou: sortedHand.slice(0,3),
                zhong: sortedHand.slice(3,8),
                wei: sortedHand.slice(8,13),
            };
            console.error("AI FALLBACK FAILED TO MAKE VALID HAND, RETURNING ANYWAY");
        }
      } else {
        bestArrangement = { tou, zhong, wei };
      }
  }

  return bestArrangement;
};
