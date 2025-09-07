import { evaluateHand, compareHands, sortCards, combinations, parseCard } from './pokerEvaluator.js';
import { getAreaType, areaTypeRank, getAreaScore, isFoul } from './sssScorer.js';

function calculateHandStrategicScore(hand, strategy = 'bottom') {
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

    let rankScore;
    switch (strategy) {
        case 'top':
            rankScore = (handRanks.top * 10000) + (handRanks.middle * 100) + handRanks.bottom;
            break;
        case 'middle':
            rankScore = (handRanks.middle * 10000) + (handRanks.bottom * 100) + handRanks.top;
            break;
        case 'bottom':
        default:
            rankScore = (handRanks.bottom * 10000) + (handRanks.middle * 100) + handRanks.top;
            break;
    }

    // Secondary score is based on the actual point value of the lanes.
    const pointsScore = laneScores.bottom + laneScores.middle + laneScores.top;

    // Combine them, giving overwhelming priority to the rank score.
    return rankScore * 100 + pointsScore;
}

function findBestSubHand(cards, num) {
    if (!cards || cards.length < num) return null;
    let bestHand = null;
    // Initialize with a "worst possible hand" object that matches the evaluator's output structure.
    let bestEval = { rank: -1, values: [0] };
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

const runExhaustiveSearch = (cardObjects, strategy) => {
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

            const currentScore = calculateHandStrategicScore(hand, strategy);
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

export const getSmartSortedHand = (allCards, strategy) => {
  if (!allCards || allCards.length !== 13) return null;
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));

  const ranks = new Set(cardObjects.map(c => c.rank));
  if (ranks.size === 13) {
    const sorted = sortCards(cardObjects);
    return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
  }

  // --- Directly use the robust exhaustive search ---
  const bestHand = runExhaustiveSearch(cardObjects, strategy);
  if (bestHand) {
      return {
          top: sortCards(bestHand.top),
          middle: sortCards(bestHand.middle),
          bottom: sortCards(bestHand.bottom),
      };
  }

  return null; // Should not be reached if cards are valid
};