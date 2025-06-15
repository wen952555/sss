// frontend_react/src/logic/aiLogic.js
import { evaluateHand, isValidArrangement, compareCards } from './cardUtils'; // Removed createDeck

/**
 * 生成数组的所有K元子集 (组合)
 * @param {Array} arr - 输入数组
 * @param {number} k - 子集大小
 * @returns {Array<Array>} - 所有k元子集
 */
const combinations = (arr, k) => {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (arr.length === k) return [[...arr]];

  const first = arr[0];
  const withoutFirst = combinations(arr.slice(1), k);
  const withFirst = combinations(arr.slice(1), k - 1).map(c => [first, ...c]);

  return [...withoutFirst, ...withFirst];
};

/**
 * 简单的启发式AI分牌逻辑 (更快，但不一定最优)
 */
export const arrangeCardsAI = (hand) => {
  if (!hand || hand.length !== 13) return null;

  const allCards = [...hand].sort((a,b) => b.rankValue - a.rankValue || b.suitRank - a.suitRank);

  let bestArrangement = null;
  let highestScoreSum = -Infinity; 

  const fiveCardCombos = combinations(allCards, 5);
  if (!fiveCardCombos || fiveCardCombos.length === 0) return null;

  for (const weiCandidate of fiveCardCombos) {
    const evalWei = evaluateHand(weiCandidate);
    const remainingAfterWei = allCards.filter(card => !weiCandidate.some(wc => wc.id === card.id));

    if (remainingAfterWei.length !== 8) continue;

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
  
  if (!bestArrangement) {
    console.warn("AI: Exhaustive combination search did not yield a best valid hand. Using basic sort fallback.");
    const sortedHand = [...hand].sort(compareCards);
    const tou_fb = sortedHand.slice(0, 3);
    const zhong_fb = sortedHand.slice(3, 8);
    const wei_fb = sortedHand.slice(8, 13);

    if (isValidArrangement(tou_fb, zhong_fb, wei_fb)) {
        bestArrangement = { tou: tou_fb, zhong: zhong_fb, wei: wei_fb };
    } else {
        console.error("AI: Basic sort fallback was invalid. Trying random shuffles (max 100 attempts).");
        for (let i = 0; i < 100; i++) {
            let tempHand = [...hand].sort(() => 0.5 - Math.random());
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
             bestArrangement = { tou: sortedHand.slice(0,3), zhong: sortedHand.slice(3,8), wei: sortedHand.slice(8,13) };
        }
    }
  }
  return bestArrangement;
};
