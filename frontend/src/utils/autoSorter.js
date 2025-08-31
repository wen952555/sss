import { evaluateHand, compareHands, sortCards, combinations, parseCard } from './pokerEvaluator';
import { getAreaType, areaTypeRank, getAreaScore, isFoul } from './sssScorer';

function calculateHandStrategicScore(hand) {
    // This evaluation function uses a hybrid model to find the best arrangement.
    const handStrings = {
        top: hand.top.map(c => `${c.rank}_of_${c.suit}`),
        middle: hand.middle.map(c => `${c.rank}_of_${c.suit}`),
        bottom: hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
    };

    const handRanks = {
        top: areaTypeRank(getAreaType(handStrings.top, 'head'), 'head'),
        middle: areaTypeRank(getAreaType(handStrings.middle, 'middle'), 'middle'),
        bottom: areaTypeRank(getAreaType(handStrings.bottom, 'tail'), 'tail'),
    };

    const laneScores = {
        top: getAreaScore(handStrings.top, 'head'),
        middle: getAreaScore(handStrings.middle, 'middle'),
        bottom: getAreaScore(handStrings.bottom, 'tail'),
    };

    // Primary score is based on the weighted rank of hand types.
    const rankScore = (handRanks.bottom * 1000) + (handRanks.middle * 100) + handRanks.top;

    // Secondary score is based on the actual point value of the lanes.
    const pointsScore = laneScores.bottom + laneScores.middle + laneScores.top;

    // Combine them, giving overwhelming priority to the rank score.
    return rankScore * 100 + pointsScore;
}

function findBestSubHand(cards, num) {
    if (!cards || cards.length < num) return null;
    let bestHand = null;
    let bestEval = { value: -1 };
    const possibleHands = combinations(cards, num);
    for (const hand of possibleHands) {
        const currentEval = evaluateHand(hand);
        if (compareHands(currentEval, bestEval) > 0) {
            bestEval = currentEval;
            bestHand = hand;
        }
    }
    return bestHand;
}

const runExhaustiveSearch = (cardObjects) => {
    let bestHands = [];
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
                top: top.map(c => `${c.rank}_of_${c.suit}`),
                middle: middle.map(c => `${c.rank}_of_${c.suit}`),
                bottom: bottom.map(c => `${c.rank}_of_${c.suit}`),
            };

            if (isFoul(handStrings.top, handStrings.middle, handStrings.bottom)) {
                continue;
            }

            const currentScore = calculateHandStrategicScore(hand);
            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestHands = [hand];
            } else if (currentScore === bestScore) {
                bestHands.push(hand);
            }
        }
    }
    if (bestHands.length > 0) {
        const randomIndex = Math.floor(Math.random() * bestHands.length);
        return bestHands[randomIndex];
    }
    return null;
};

export const getSmartSortedHand = (allCards) => {
  if (!allCards || allCards.length !== 13) return null;
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  const ranks = new Set(cardObjects.map(c => c.rank));
  if (ranks.size === 13) {
    const sorted = sortCards(cardObjects);
    return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
  }

  // --- Try Aggressive Greedy Strategy First ---
  const greedyBottom = findBestSubHand(cardObjects, 5);
  const remainingAfterGreedyBottom = cardObjects.filter(c => !greedyBottom.find(bc => bc.rank === c.rank && bc.suit === c.suit));
  const greedyMiddle = findBestSubHand(remainingAfterGreedyBottom, 5);
  const greedyTop = remainingAfterGreedyBottom.filter(c => !greedyMiddle.find(mc => mc.rank === c.rank && mc.suit === c.suit));

  const greedyHandStrings = {
      top: greedyTop.map(c => `${c.rank}_of_${c.suit}`),
      middle: greedyMiddle.map(c => `${c.rank}_of_${c.suit}`),
      bottom: greedyBottom.map(c => `${c.rank}_of_${c.suit}`),
  };

  if (!isFoul(greedyHandStrings.top, greedyHandStrings.middle, greedyHandStrings.bottom)) {
      // If the greedy approach is valid, use it.
      return { top: sortCards(greedyTop), middle: sortCards(greedyMiddle), bottom: sortCards(greedyBottom) };
  }

  // --- If Greedy fails (foul), fall back to robust exhaustive search ---
  const bestHand = runExhaustiveSearch(cardObjects);
  if (bestHand) {
      return {
          top: sortCards(bestHand.top),
          middle: sortCards(bestHand.middle),
          bottom: sortCards(bestHand.bottom),
      };
  }

  return null; // Should not be reached if cards are valid
};