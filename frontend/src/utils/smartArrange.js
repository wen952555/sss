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

  console.log("Starting smart arrangement calculation...");

  let bestArrangement = null;
  let bestScore = -1;

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

        // A simple scoring heuristic: sum of the hand type values.
        // A better heuristic might weigh the segments differently.
        const currentScore = backEval.type.value + middleEval.type.value + frontEval.type.value;

        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestArrangement = {
            front: sortHand(frontHand),
            middle: sortHand(middleHand),
            back: sortHand(backHand),
          };
        }
      }
    }
  }

  console.log("Found best arrangement with score:", bestScore);

  // Final validation to prevent crashes from bad arrangements
  if (bestArrangement) {
    const finalCards = [...bestArrangement.front, ...bestArrangement.middle, ...bestArrangement.back];
    if (finalCards.length !== 13) {
      console.error("Critical Error: Best arrangement does not contain 13 cards!", bestArrangement);
      return null; // Return null if the hand is incomplete
    }
  }

  return bestArrangement;
}