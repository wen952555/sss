// frontend/src/utils/smartArrange.js
import {
  evaluate5CardHand,
  evaluate3CardHand,
  compareEvaluatedHands,
  isValidHand,
} from './gameLogic';
import { sortHand } from './cardUtils';

// Helper to generate all k-combinations from a set of cards
function getCombinations(cards, k) {
  if (k > cards.length || k <= 0) return [];
  if (k === cards.length) return [cards];
  if (k === 1) return cards.map(card => [card]);

  const combs = [];
  cards.forEach((card, i) => {
    const smallerCombs = getCombinations(cards.slice(i + 1), k - 1);
    smallerCombs.forEach(smallerComb => {
      combs.push([card, ...smallerComb]);
    });
  });
  return combs;
}

// The main function to find the best arrangement
export function findBestArrangement(hand) {
  if (hand.length !== 13) return null;

  let bestArrangement = null;
  let bestEvals = null;

  const all5CardCombinations = getCombinations(hand, 5);

  // Iterate through all possible back hands
  for (const backHand of all5CardCombinations) {
    const remainingAfterBack = hand.filter(card => !backHand.includes(card));
    const middleCombinations = getCombinations(remainingAfterBack, 5);

    // Iterate through all possible middle hands from the remainder
    for (const middleHand of middleCombinations) {
      const frontHand = remainingAfterBack.filter(card => !middleHand.includes(card));

      if (isValidHand(frontHand, middleHand, backHand)) {
        const backEval = evaluate5CardHand(backHand);
        const middleEval = evaluate5CardHand(middleHand);
        const frontEval = evaluate3CardHand(frontHand);

        if (!bestArrangement) {
          // First valid arrangement found, set it as the current best
          bestArrangement = {
            front: sortHand(frontHand),
            middle: sortHand(middleHand),
            back: sortHand(backHand),
          };
          bestEvals = { back: backEval, middle: middleEval, front: frontEval };
        } else {
          // Compare the current valid arrangement with the best one found so far
          const backComparison = compareEvaluatedHands(backEval, bestEvals.back);
          if (backComparison > 0) {
            // This arrangement is better because the back hand is stronger
            bestArrangement = {
              front: sortHand(frontHand),
              middle: sortHand(middleHand),
              back: sortHand(backHand),
            };
            bestEvals = { back: backEval, middle: middleEval, front: frontEval };
          } else if (backComparison === 0) {
            // Back hands are equal, compare middle hands
            const middleComparison = compareEvaluatedHands(middleEval, bestEvals.middle);
            if (middleComparison > 0) {
              // Middle hand is stronger
              bestArrangement = {
                front: sortHand(frontHand),
                middle: sortHand(middleHand),
                back: sortHand(backHand),
              };
              bestEvals = { back: backEval, middle: middleEval, front: frontEval };
            } else if (middleComparison === 0) {
              // Middle hands are also equal, compare front hands
              const frontComparison = compareEvaluatedHands(frontEval, bestEvals.front);
              if (frontComparison > 0) {
                // Front hand is stronger
                bestArrangement = {
                  front: sortHand(frontHand),
                  middle: sortHand(middleHand),
                  back: sortHand(backHand),
                };
                bestEvals = { back: backEval, middle: middleEval, front: frontEval };
              }
            }
          }
        }
      }
    }
  }

  return bestArrangement;
}