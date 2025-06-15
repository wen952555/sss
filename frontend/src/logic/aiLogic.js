// frontend_react/src/logic/aiLogic.js
import { evaluateHand, isValidArrangement, compareCards } from './cardUtils';

/**
 * 生成数组的所有K元子集 (组合)
 */
const combinations = (arr, k) => {
  if (k < 0 || k > arr.length) return [];
  if (k === 0) return [[]];
  if (arr.length === k) return [[...arr]];
  if (k === 1) return arr.map(item => [item]);

  const first = arr[0];
  const withFirst = combinations(arr.slice(1), k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(arr.slice(1), k);

  return [...withFirst, ...withoutFirst];
};

export const arrangeCardsAI = (hand) => {
  if (!hand || hand.length !== 13) {
    console.error("AI Arrange: Invalid hand provided.", hand);
    return null;
  }

  const allCardsInitiallySorted = [...hand].sort(compareCards);

  let bestArrangement = null;
  let highestScoreSum = -Infinity;

  const weiCandidates = combinations(allCardsInitiallySorted, 5);

  for (const wei_cand of weiCandidates) {
    const remainingAfterWei = allCardsInitiallySorted.filter(c1 => !wei_cand.some(c2 => c2.id === c1.id));
    if (remainingAfterWei.length !== 8) continue;

    const zhongCandidates = combinations(remainingAfterWei, 5);

    for (const zhong_cand of zhongCandidates) {
      const tou_cand = remainingAfterWei.filter(c1 => !zhong_cand.some(c2 => c2.id === c1.id));
      if (tou_cand.length !== 3) continue;

      if (isValidArrangement(tou_cand, zhong_cand, wei_cand)) {
        const evalTou = evaluateHand(tou_cand);
        const evalZhong = evaluateHand(zhong_cand);
        const evalWei = evaluateHand(wei_cand);
        
        const currentScoreSum = (evalTou.rank || 0) + (evalZhong.rank || 0) + (evalWei.rank || 0);

        if (currentScoreSum > highestScoreSum) {
          highestScoreSum = currentScoreSum;
          bestArrangement = {
            tou: [...tou_cand].sort(compareCards),
            zhong: [...zhong_cand].sort(compareCards),
            wei: [...wei_cand].sort(compareCards),
          };
        }
      }
    }
  }

  if (!bestArrangement) {
    console.warn("AI: Primary arrangement logic did not find an optimal valid hand. Attempting fallback strategies.");
    
    const sortedHandAsc = [...hand].sort(compareCards);
    let fb_tou = sortedHandAsc.slice(0, 3);
    let fb_zhong = sortedHandAsc.slice(3, 8);
    let fb_wei = sortedHandAsc.slice(8, 13);

    if (isValidArrangement(fb_tou, fb_zhong, fb_wei)) {
      bestArrangement = { tou: fb_tou, zhong: fb_zhong, wei: fb_wei };
      console.log("AI: Used simple sorted split fallback.");
    } else {
      // const permutations = []; // This line caused the error, it was defined but never used.
      // Commenting it out or removing it. If it was intended for later use, it should be completed.
      // For now, to fix the build, we remove it.
      console.error("AI: Simple sorted split was invalid. Trying limited random shuffles (max 200 attempts).");
      for (let i = 0; i < 200; i++) {
          let tempHand = [...hand].sort(() => 0.5 - Math.random());
          const t = tempHand.slice(0,3).sort(compareCards);
          const m = tempHand.slice(3,8).sort(compareCards);
          const b = tempHand.slice(8,13).sort(compareCards);
          if (isValidArrangement(t,m,b)) {
              bestArrangement = { tou: t, zhong: m, wei: b };
              console.log("AI: Used random shuffle fallback after attempt: ", i + 1);
              break;
          }
      }
      
      if (!bestArrangement) {
           console.error("AI: CRITICAL - Could not find any valid arrangement even after random shuffles. Returning potentially invalid raw slice.");
           bestArrangement = { 
             tou: sortedHandAsc.slice(0,3).sort(compareCards), 
             zhong: sortedHandAsc.slice(3,8).sort(compareCards), 
             wei: sortedHandAsc.slice(8,13).sort(compareCards) 
           };
      }
    }
  }
  return bestArrangement;
};
