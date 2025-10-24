import { parseCard, evaluateHand as evaluate5Cards, compareHands } from './pokerEvaluator';

const rankMap = { 'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' };

export const getCombinations = (array, k) => {
  if (k === 0) return [[]];
  if (!array || array.length < k) return [];
  const first = array[0];
  const rest = array.slice(1);
  const combsWithFirst = getCombinations(rest, k - 1).map(comb => [first, ...comb]);
  const combsWithoutFirst = getCombinations(rest, k);
  return [...combsWithFirst, ...combsWithoutFirst];
};

const evaluate3Cards = (hand) => {
  const parsedHand = hand.map(parseCard).filter(Boolean);
  if (parsedHand.length !== 3) return { rank: -1, values: [] };
  const ranks = parsedHand.map(c => c.value).sort((a, b) => b - a);
  const rankCounts = ranks.reduce((acc, rank) => ({ ...acc, [rank]: (acc[rank] || 0) + 1 }), {});
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (counts[0] === 3) return { rank: 3, values: ranks }; // Three of a Kind
  if (counts[0] === 2) return { rank: 1, values: ranks }; // One Pair
  return { rank: 0, values: ranks }; // High Card
};

export const findBestArrangement = (hand) => {
  const all5CardCombosBack = getCombinations(hand, 5);
  let bestArrangement = null;
  let bestScore = -1;

  for (const back of all5CardCombosBack) {
    const remaining8 = hand.filter(c => !back.includes(c));
    const all5CardCombosMiddle = getCombinations(remaining8, 5);

    for (const middle of all5CardCombosMiddle) {
      const front = remaining8.filter(c => !middle.includes(c));
      if (front.length !== 3) continue;

      const backEval = evaluate5Cards(back.map(parseCard));
      const middleEval = evaluate5Cards(middle.map(parseCard));
      const frontEval = evaluate3Cards(front);

      if (compareHands(middleEval, backEval) <= 0 && compareHands(frontEval, middleEval) <= 0) {
        const totalScore = backEval.rank * 10000 + middleEval.rank * 100 + frontEval.rank;
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestArrangement = { front, middle, back };
        }
      }
    }
  }

  if (!bestArrangement) {
    const sortedHand = hand.map(parseCard).filter(Boolean).sort((a, b) => b.value - a.value);
    const cardKeys = sortedHand.map(c => `${c.rank}_of_${c.suit}`);
    return {
      front: cardKeys.slice(0, 3),
      middle: cardKeys.slice(3, 8),
      back: cardKeys.slice(8, 13),
    };
  }

  return bestArrangement;
};
