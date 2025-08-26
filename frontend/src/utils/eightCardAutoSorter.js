import { evaluateHand, compareHands, combinations, parseCard } from './pokerEvaluator';

/**
 * Auto-sorter for the 8-card game (2-3-3 structure).
 * Finds the best possible valid hand arrangement.
 * @param {Array<Object>} allCards - Player's 8 cards (as objects or strings).
 * @returns {{top: Array, middle: Array, bottom: Array} | null} A valid 3-lane hand.
 */
export const getSmartSortedHandForEight = (allCards) => {
  if (!allCards || allCards.length !== 8) {
    console.error("8-card sorting requires exactly 8 cards.");
    return null;
  }

  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  const allPossibleMiddles = combinations(cardObjects, 5);

  let bestMiddleHand = null;
  let bestTopHand = null;
  let bestMiddleEval = null;

  for (const middle of allPossibleMiddles) {
    const top = cardObjects.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
    if (top.length !== 3) continue;

    const middleEval = evaluateHand(middle);
    const topEval = evaluateHand(top);

    // Check for foul (middle must be stronger than top)
    if (compareHands(middleEval, topEval) >= 0) {
      // This is a valid hand. We want to find the one with the best middle.
      if (bestMiddleEval === null || compareHands(middleEval, bestMiddleEval) > 0) {
        bestMiddleEval = middleEval;
        bestMiddleHand = middle;
        bestTopHand = top;
      }
    }
  }

  if (bestMiddleHand && bestTopHand) {
    return {
      top: bestTopHand,
      middle: bestMiddleHand,
    };
  }

  // If no valid non-foul hand can be made, this is a "相公" (foul) hand.
  // For the AI, we can just return a default arrangement to avoid crashing.
  // A better AI might try to minimize losses.
  const sorted = cardObjects.sort((a, b) => evaluateHand([a]).values[0] - evaluateHand([b]).values[0]);
  return {
      top: sorted.slice(0, 3),
      middle: sorted.slice(3),
  };
};