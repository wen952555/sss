import { evaluateHand, compareHands, sortCards, combinations, parseCard } from '../utils';

/**
 * A faster, non-blocking version of the 13-card smart sort algorithm.
 * It finds the FIRST valid hand arrangement instead of the absolute best one.
 * This prevents the browser from freezing on expensive calculations.
 * @param {Array<Object>} allCards - Player's 13 cards.
 * @returns {{top: Array, middle: Array, bottom: Array} | null} A valid 3-lane hand.
 */
export const getSmartSortedHand = (allCards) => {
  if (!allCards || allCards.length !== 13) {
    return null;
  }
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  // Get all 5-card combinations for the bottom lane. No need to pre-sort them.
  const bottomCombinations = combinations(cardObjects, 5);

  for (const bottom of bottomCombinations) {
    const bottomEval = evaluateHand(bottom);
    const remainingAfterBottom = cardObjects.filter(c => !bottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));
    
    // Get all 5-card combinations for the middle lane.
    const middleCombinations = combinations(remainingAfterBottom, 5);

    for (const middle of middleCombinations) {
      const middleEval = evaluateHand(middle);

      // Check for foul early: bottom must be >= middle.
      if (compareHands(bottomEval, middleEval) >= 0) {
        const top = remainingAfterBottom.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
        if (top.length !== 3) continue;
        
        const topEval = evaluateHand(top);

        // Check for foul early: middle must be >= top.
        if (compareHands(middleEval, topEval) >= 0) {
          // Found the FIRST valid combination. Return it immediately.
          return {
            top: sortCards(top),
            middle: sortCards(middle),
            bottom: sortCards(bottom),
          };
        }
      }
    }
  }

  // This part should theoretically never be reached in a standard game.
  return null;
};