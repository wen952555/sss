// frontend_react/src/logic/aiLogic.js
import { evaluateHand, isValidArrangement, compareCards } from './cardUtils';

/**
 * 生成数组的所有K元子集 (组合)
 */
const combinations = (arr, k) => {
  if (k < 0 || k > arr.length) return []; // Added boundary check
  if (k === 0) return [[]];
  if (arr.length === k) return [[...arr]];
  if (k === 1) return arr.map(item => [item]); // Optimization for k=1

  const first = arr[0];
  // Combinations that include the first element
  const withFirst = combinations(arr.slice(1), k - 1).map(c => [first, ...c]);
  // Combinations that don't include the first element
  const withoutFirst = combinations(arr.slice(1), k);

  return [...withFirst, ...withoutFirst];
};

export const arrangeCardsAI = (hand) => {
  if (!hand || hand.length !== 13) {
    console.error("AI Arrange: Invalid hand provided.", hand);
    return null;
  }

  // Sort cards once initially for consistency if needed, though combinations will explore orders.
  // For deterministic behavior in tie-breaking or combo generation, an initial sort can be useful.
  const allCardsInitiallySorted = [...hand].sort(compareCards); // Ascending sort

  let bestArrangement = null;
  let highestScoreSum = -Infinity;

  // C(13,5) = 1287 for wei_candidates
  const weiCandidates = combinations(allCardsInitiallySorted, 5);

  for (const wei_cand of weiCandidates) {
    const remainingAfterWei = allCardsInitiallySorted.filter(c1 => !wei_cand.some(c2 => c2.id === c1.id));
    if (remainingAfterWei.length !== 8) continue;

    // C(8,5) = 56 for zhong_candidates
    const zhongCandidates = combinations(remainingAfterWei, 5);

    for (const zhong_cand of zhongCandidates) {
      const tou_cand = remainingAfterWei.filter(c1 => !zhong_cand.some(c2 => c2.id === c1.id));
      if (tou_cand.length !== 3) continue;

      // Crucially, check for validity (no "倒水") BEFORE evaluating ranks for sum
      if (isValidArrangement(tou_cand, zhong_cand, wei_cand)) {
        const evalTou = evaluateHand(tou_cand);
        const evalZhong = evaluateHand(zhong_cand);
        const evalWei = evaluateHand(wei_cand);
        
        // Simple sum of ranks. More sophisticated scoring could be used.
        const currentScoreSum = (evalTou.rank || 0) + (evalZhong.rank || 0) + (evalWei.rank || 0);

        if (currentScoreSum > highestScoreSum) {
          highestScoreSum = currentScoreSum;
          bestArrangement = {
            tou: [...tou_cand].sort(compareCards), // Ensure duns are sorted for consistent display/comparison
            zhong: [...zhong_cand].sort(compareCards),
            wei: [...wei_cand].sort(compareCards),
          };
        }
      }
    }
  }

  // If the above loop (which should find a valid one if one exists) fails,
  // or if for some reason bestArrangement is still null.
  if (!bestArrangement) {
    console.warn("AI: Primary arrangement logic did not find an optimal valid hand. Attempting fallback strategies.");
    
    // Fallback 1: Simple sorted split, then check validity
    const sortedHandAsc = [...hand].sort(compareCards);
    let fb_tou = sortedHandAsc.slice(0, 3);
    let fb_zhong = sortedHandAsc.slice(3, 8);
    let fb_wei = sortedHandAsc.slice(8, 13);

    if (isValidArrangement(fb_tou, fb_zhong, fb_wei)) {
      bestArrangement = { tou: fb_tou, zhong: fb_zhong, wei: fb_wei };
      console.log("AI: Used simple sorted split fallback.");
    } else {
      // Fallback 2: Try a few permutations of the sorted split to find a valid one
      // This is still a bit naive but tries to avoid full random shuffles immediately
      const permutations = [
        // Example: try swapping smallest from mid with largest from head if head > mid
        // This is where more intelligent adjustment logic would go.
        // For now, let's stick to a limited random search if the simple sort fails.
      ];
      // If intelligent permutations don't work, resort to limited random shuffles.

      console.error("AI: Simple sorted split was invalid. Trying limited random shuffles (max 200 attempts).");
      for (let i = 0; i < 200; i++) { // Increased attempts, but this is still a sign of a weak primary algo
          let tempHand = [...hand].sort(() => 0.5 - Math.random()); // Shuffle
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
           // As a last resort, return the slices even if invalid, so the game doesn't crash.
           // The UI or game logic should ideally handle displaying an error for this AI.
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
