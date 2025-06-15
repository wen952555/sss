// frontend_react/src/logic/aiLogic.js
import { evaluateHand, isValidArrangement, compareCards, createDeck } from './cardUtils'; // Assuming createDeck is not needed here, but compareCards might be

/**
 * 生成数组的所有K元子集 (组合)
 * @param {Array} arr - 输入数组
 * @param {number} k - 子集大小
 * @returns {Array<Array>} - 所有k元子集
 */
const combinations = (arr, k) => {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (arr.length === k) return [[...arr]]; // Optimization: if arr.length === k, return arr itself as the only combo

  const first = arr[0];
  const withoutFirst = combinations(arr.slice(1), k); // Combinations without the first element
  const withFirst = combinations(arr.slice(1), k - 1).map(c => [first, ...c]); // Combinations with the first element

  return [...withoutFirst, ...withFirst];
};

/**
 * 简单的启发式AI分牌逻辑 (更快，但不一定最优)
 * 1. 优先找最好的尾墩 (5张)
 * 2. 在剩下牌中找最好的中墩 (5张)
 * 3. 剩下的是头墩 (3张)
 * 4. 如果不合法，尝试降级策略或随机找一个合法的
 */
export const arrangeCardsAI = (hand) => {
  if (!hand || hand.length !== 13) return null;

  const allCards = [...hand].sort((a,b) => b.rankValue - a.rankValue || b.suitRank - a.suitRank); // Sort descending for easier greedy choices

  let bestArrangement = null;
  let highestScoreSum = -Infinity; // We want to maximize sum of dun ranks

  // Generate all 5-card combinations for potential尾墩
  const fiveCardCombos = combinations(allCards, 5);
  if (!fiveCardCombos || fiveCardCombos.length === 0) return null; // Should not happen with 13 cards

  for (const weiCandidate of fiveCardCombos) {
    const evalWei = evaluateHand(weiCandidate);
    const remainingAfterWei = allCards.filter(card => !weiCandidate.some(wc => wc.id === card.id));

    if (remainingAfterWei.length !== 8) continue;

    // Generate all 5-card combinations from remaining for中墩
    const zhongCombos = combinations(remainingAfterWei, 5);
    if (!zhongCombos || zhongCombos.length === 0) continue;

    for (const zhongCandidate of zhongCombos) {
      const evalZhong = evaluateHand(zhongCandidate);
      const touCandidate = remainingAfterWei.filter(card => !zhongCandidate.some(zc => zc.id === card.id));

      if (touCandidate.length !== 3) continue;
      const evalTou = evaluateHand(touCandidate);

      if (isValidArrangement(touCandidate, zhongCandidate, weiCandidate)) {
        const currentScoreSum = (evalTou.rank || 0) + (evalZhong.rank || 0) + (evalWei.rank || 0);
        if (currentScoreSum > highestScoreSum) {
          highestScoreSum = currentScoreSum;
          bestArrangement = {
            tou: [...touCandidate].sort(compareCards),
            zhong: [...zhongCandidate].sort(compareCards),
            wei: [...weiCandidate].sort(compareCards),
          };
        }
      }
    }
  }
  
  // If after all iterations, no valid arrangement was found (highly unlikely with this exhaustive search for valid)
  // or if we want a quicker fallback for extremely slow cases (though the current approach is already better than full permutation)
  if (!bestArrangement) {
    console.warn("AI: Exhaustive combination search did not yield a best valid hand (or was skipped). Using basic sort fallback.");
    // Basic fallback: sort all cards and split them 0-2, 3-7, 8-12
    // This is a very naive fallback and might not be valid, so we must check
    const sortedHand = [...hand].sort(compareCards); // Sort ascending for simple split
    const tou_fb = sortedHand.slice(0, 3);
    const zhong_fb = sortedHand.slice(3, 8);
    const wei_fb = sortedHand.slice(8, 13);

    if (isValidArrangement(tou_fb, zhong_fb, wei_fb)) {
        bestArrangement = { tou: tou_fb, zhong: zhong_fb, wei: wei_fb };
    } else {
        // Last resort: try to find *any* valid arrangement quickly by shuffling and taking first valid
        // This is computationally intensive if run many times, but as a last resort...
        console.error("AI: Basic sort fallback was invalid. Trying random shuffles (max 100 attempts).");
        for (let i = 0; i < 100; i++) { // Limit attempts
            let tempHand = [...hand].sort(() => 0.5 - Math.random()); // Shuffle
            const t = tempHand.slice(0,3);
            const m = tempHand.slice(3,8);
            const b = tempHand.slice(8,13);
            if (isValidArrangement(t,m,b)) {
                bestArrangement = { tou: t.sort(compareCards), zhong: m.sort(compareCards), wei: b.sort(compareCards) };
                break;
            }
        }
        if (!bestArrangement) {
             console.error("AI: CRITICAL - Could not find any valid arrangement even after random shuffles.");
             // Return a non-null but empty arrangement so game doesn't crash, AI will lose badly.
             bestArrangement = { tou: sortedHand.slice(0,3), zhong: sortedHand.slice(3,8), wei: sortedHand.slice(8,13) }; //Potentially invalid
        }
    }
  }
  return bestArrangement;
};
