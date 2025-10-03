// frontend/src/utils/aiPlayer.js
import { sortHand } from './cardUtils';
import {
  evaluate5CardHand,
  evaluate3CardHand,
  isValidHand,
} from './gameLogic';

// This is a very basic AI. It tries to find the best possible 5-card hand for the back,
// then the best possible 5-card hand for the middle from the remaining cards,
// and uses the rest for the front. This is not optimal but guarantees a valid hand.

function findBest5CardHand(cards) {
  let bestHand = null;
  let bestEval = null;
  let bestCombination = [];

  // This is computationally expensive. For a real AI, we'd use a more efficient algorithm.
  // This generates all 5-card combinations from a set of cards.
  const combinations = (arr, k) => {
    if (k > arr.length || k <= 0) return [];
    if (k === arr.length) return [arr];
    if (k === 1) return arr.map(e => [e]);

    const combs = [];
    arr.forEach((e, i) => {
      const smallerCombs = combinations(arr.slice(i + 1), k - 1);
      smallerCombs.forEach(sc => {
        combs.push([e, ...sc]);
      });
    });
    return combs;
  };

  const all5CardCombinations = combinations(cards, 5);

  for (const combo of all5CardCombinations) {
    const currentEval = evaluate5CardHand(combo);
    if (!bestEval || currentEval.type.value > bestEval.type.value) {
      bestHand = combo;
      bestEval = currentEval;
      bestCombination = combo;
    }
  }

  const remainingCards = cards.filter(card => !bestCombination.includes(card));
  return { bestHand, remainingCards };
}

export function getAIArrangedHand(hand) {
  let arrangedHand = { front: [], middle: [], back: [] };
  let remainingCards = [...hand];

  // 1. Find the best possible back hand (5 cards)
  const backResult = findBest5CardHand(remainingCards);
  arrangedHand.back = sortHand(backResult.bestHand);
  remainingCards = backResult.remainingCards;

  // 2. Find the best possible middle hand (5 cards) from the rest
  const middleResult = findBest5CardHand(remainingCards);
  arrangedHand.middle = sortHand(middleResult.bestHand);
  remainingCards = middleResult.remainingCards;

  // 3. The rest go to the front (3 cards)
  arrangedHand.front = sortHand(remainingCards);

  // Final check to ensure validity. If not, fallback to a simple valid hand.
  if (!isValidHand(arrangedHand.front, arrangedHand.middle, arrangedHand.back)) {
    console.warn("AI generated an invalid hand, falling back to simple sort.");
    // Fallback strategy: just sort by value and place them
    const sortedByValue = [...hand].sort((a, b) => a.value - b.value);
    return {
      front: [sortedByValue[12], sortedByValue[11], sortedByValue[10]],
      middle: sortedByValue.slice(5, 10),
      back: sortedByValue.slice(0, 5),
    };
  }

  return arrangedHand;
}