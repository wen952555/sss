import { evaluateHand, compareHands, sortCards, combinations, parseCard } from './pokerEvaluator';
import { getAreaScore, isFoul } from './sssScorer';

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
 * It finds the BEST valid hand arrangement, prioritizing special hands.
 * @param {Array<Object>} allCards - Player's 13 cards.
 * @returns {{top: Array, middle: Array, bottom: Array} | null} The best valid 3-lane hand.
 */
export const getSmartSortedHand = (allCards) => {
  if (!allCards || allCards.length !== 13) {
    return null;
  }
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  // --- Check for Dragon (一条龙) Special Hand ---
  const ranks = new Set(cardObjects.map(c => c.rank));
  if (ranks.size === 13) {
    const sorted = sortCards(cardObjects);
    return {
      top: sorted.slice(0, 3),
      middle: sorted.slice(3, 8),
      bottom: sorted.slice(8, 13),
    };
  }

  // --- Find Best Normal Hand ---
  let bestHand = null;
  let bestScore = -1;

  const bottomCombinations = combinations(cardObjects, 5);

  for (const bottom of bottomCombinations) {
    const bottomEval = evaluateHand(bottom);
    const remainingAfterBottom = cardObjects.filter(c => !bottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));
    const middleCombinations = combinations(remainingAfterBottom, 5);

    for (const middle of middleCombinations) {
      const middleEval = evaluateHand(middle);

      // Pruning: if middle is stronger than bottom, it's a foul. Skip.
      if (compareHands(bottomEval, middleEval) < 0) {
        continue;
      }

      const top = remainingAfterBottom.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
      if (top.length !== 3) continue;

      const topEval = evaluateHand(top);

      // Pruning: if top is stronger than middle, it's a foul. Skip.
      if (compareHands(middleEval, topEval) < 0) {
        continue;
      }

      // This hand is valid, now score it.
      const hand = { top, middle, bottom };
      const currentScore = calculateHandBaseScore(hand);
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestHand = hand;
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