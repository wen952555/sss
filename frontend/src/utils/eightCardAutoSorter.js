import { evaluateHand, compareHands, combinations, parseCard, sortCards } from './pokerEvaluator';

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
 * Auto-sorter for the 8-card game (2-3-3 structure).
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

  const bottomCombinations = shuffle(combinations(cardObjects, 3));

  for (const bottom of bottomCombinations) {
    const bottomEval = evaluateHand(bottom);
    const remainingAfterBottom = cardObjects.filter(c => !bottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));

    const middleCombinations = shuffle(combinations(remainingAfterBottom, 3));

    for (const middle of middleCombinations) {
      const middleEval = evaluateHand(middle);

      if (compareHands(bottomEval, middleEval) >= 0) {
        const top = remainingAfterBottom.filter(c => !middle.find(mc => mc.rank === c.rank && mc.suit === c.suit));
        if (top.length !== 2) continue;

        const topEval = evaluateHand(top);

        if (compareHands(middleEval, topEval) >= 0) {
          // Found the first valid arrangement, return it.
          return {
            top: sortCards(top),
            middle: sortCards(middle),
            bottom: sortCards(bottom),
          };
        }
      }
    }
  }

  // This part should not be reached if a valid hand can always be made.
  return null;
};