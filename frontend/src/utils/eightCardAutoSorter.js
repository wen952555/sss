import { evaluateHand, compareHands, combinations, parseCard } from './pokerEvaluator';

// Fisher-Yates (aka Knuth) Shuffle
const shuffle = (array) => {
  let currentIndex = array.length,  randomIndex;

  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}


/**
 * Auto-sorter for the 8-card game (3-5 structure).
 * Finds a random valid hand arrangement.
 * @param {Array<Object>} allCards - Player's 8 cards (as objects or strings).
 * @returns {{top: Array, middle: Array, bottom: Array} | null} A valid 3-lane hand.
 */
export const getSmartSortedHandForEight = (allCards) => {
  if (!allCards || allCards.length !== 8) {
    console.error("8-card sorting requires exactly 8 cards.");
    return null;
  }

  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  // Shuffle the combinations to get a random valid hand
  const allPossibleMiddles = shuffle(combinations(cardObjects, 5));

  for (const middle of allPossibleMiddles) {
    const top = cardObjects.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
    if (top.length !== 3) continue;

    const middleEval = evaluateHand(middle);
    const topEval = evaluateHand(top);

    // Check for foul (middle must be stronger than top)
    if (compareHands(middleEval, topEval) >= 0) {
      // Found a valid hand, return it immediately.
      return {
        top: top,
        middle: middle,
        bottom: [], // 8-card game has no bottom lane
      };
    }
  }

  // This part should not be reached if a valid hand is always possible.
  // Fallback for the "相公" (foul) case.
  const sorted = cardObjects.sort((a, b) => evaluateHand([a]).values[0] - evaluateHand([b]).values[0]);
  return {
      top: sorted.slice(0, 3),
      middle: sorted.slice(3),
      bottom: [],
  };
};