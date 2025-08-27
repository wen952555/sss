import { evaluateHand, compareHands, sortCards, combinations, parseCard } from './pokerEvaluator';
import { getAreaScore, getAreaType, isFoul } from './sssScorer';

/**
 * Calculates the base score of a 3-lane hand arrangement.
 * @param {Object} hand - A hand object with top, middle, and bottom lanes.
 * @returns {number} The total base score.
 */
function calculateHandBaseScore(hand) {
    const handStrings = {
        head: hand.top.map(c => `${c.rank}_of_${c.suit}`),
        middle: hand.middle.map(c => `${c.rank}_of_${c.suit}`),
        tail: hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    };
    return getAreaScore(handStrings.head, 'head') + getAreaScore(handStrings.middle, 'middle') + getAreaScore(handStrings.tail, 'tail');
}


/**
 * A comprehensive 13-card smart sort algorithm.
 * It finds the BEST valid hand arrangement by checking all combinations.
 * @param {Array<Object>} allCards - Player's 13 cards.
 * @returns {{top: Array, middle: Array, bottom: Array} | null} The best valid 3-lane hand.
 */
export const getSmartSortedHand = (allCards) => {
  if (!allCards || allCards.length !== 13) {
    return null;
  }
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  let bestHand = null;
  let bestScore = -1;

  const bottomCombinations = combinations(cardObjects, 5);

  for (const bottom of bottomCombinations) {
    const remainingAfterBottom = cardObjects.filter(c => !bottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));
    const middleCombinations = combinations(remainingAfterBottom, 5);

    for (const middle of middleCombinations) {
      const top = remainingAfterBottom.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
      if (top.length !== 3) continue;

      const hand = { top, middle, bottom };
      const handStrings = {
        head: top.map(c => `${c.rank}_of_${c.suit}`),
        middle: middle.map(c => `${c.rank}_of_${c.suit}`),
        tail: bottom.map(c => `${c.rank}_of_${c.suit}`),
      };

      if (!isFoul(handStrings.head, handStrings.middle, handStrings.tail)) {
        const currentScore = calculateHandBaseScore(hand);
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestHand = hand;
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

  // Fallback if no valid hand is found (should be impossible)
  return null;
};