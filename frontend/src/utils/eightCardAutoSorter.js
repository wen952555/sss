import { evaluateHand, compareHands, combinations, parseCard, sortCards } from './pokerEvaluator';
import { getLaneScore } from './eightCardScorer';

/**
 * Calculates the base score of an 8-card hand arrangement.
 * @param {Object} hand - A hand object with top, middle, and bottom lanes.
 * @returns {number} The total base score.
 */
function calculateHandBaseScore(hand) {
    // Note: eightCardScorer expects card objects, not strings.
    return getLaneScore(hand.top, 'top') + getLaneScore(hand.middle, 'middle') + getLaneScore(hand.bottom, 'bottom');
}

/**
 * Auto-sorter for the 8-card game (2-3-3 structure).
 * Finds the BEST valid hand arrangement.
 * @param {Array<Object>} allCards - Player's 8 cards (as objects or strings).
 * @returns {{top: Array, middle: Array, bottom: Array} | null} A valid 3-lane hand.
 */
export const getSmartSortedHandForEight = (allCards) => {
  if (!allCards || allCards.length !== 8) {
    console.error("8-card sorting requires exactly 8 cards.");
    return null;
  }

  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  let bestHand = null;
  let bestScore = -1;

  const bottomCombinations = combinations(cardObjects, 3);

  for (const bottom of bottomCombinations) {
    const bottomEval = evaluateHand(bottom);
    const remainingAfterBottom = cardObjects.filter(c => !bottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));

    const middleCombinations = combinations(remainingAfterBottom, 3);

    for (const middle of middleCombinations) {
      const middleEval = evaluateHand(middle);

      if (compareHands(bottomEval, middleEval) >= 0) {
        const top = remainingAfterBottom.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
        if (top.length !== 2) continue;

        const topEval = evaluateHand(top);

        if (compareHands(middleEval, topEval) >= 0) {
          const hand = { top, middle, bottom };
          const currentScore = calculateHandBaseScore(hand);
          if (currentScore > bestScore) {
            bestScore = currentScore;
            bestHand = hand;
          }
        }
      }
    }
  }

  if (bestHand) {
    return {
      top: sortCards(bestHand.top),
      middle: sortCards(bestHand.middle),
      bottom: sortCards(bestHand.bottom),
    };
  }

  return null;
};