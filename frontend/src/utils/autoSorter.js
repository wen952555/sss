import { evaluateHand, compareHands, sortCards, combinations, parseCard } from './pokerEvaluator.js';
import { getAreaType, areaTypeRank, getAreaScore, isFoul } from './sssScorer.js';

function calculateHandStrategicScore(hand, strategy = 'bottom') {
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

    const pointsScore = laneScores.bottom + laneScores.middle + laneScores.top;
    return rankScore * 100 + pointsScore;
}

function findBestSubHand(cards, num) {
    if (!cards || cards.length < num) return null;
    let bestHand = null;
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

const runGreedySearch = (cardObjects) => {
    // Greedy approach: find the best bottom, then best middle from remaining, then top.
    const bottom = findBestSubHand(cardObjects, 5);
    if (!bottom) return null;

    const remainingAfterBottom = cardObjects.filter(c => !bottom.some(bc => bc.key === c.key));
    const middle = findBestSubHand(remainingAfterBottom, 5);
    if (!middle) return null;

    const top = remainingAfterBottom.filter(c => !middle.some(mc => mc.key === c.key));
    if (top.length !== 3) return null;

    const hand = { top, middle, bottom };
    const handStrings = {
        top: top.map(c => c.key),
        middle: middle.map(c => c.key),
        bottom: bottom.map(c => c.key),
    };

    if (isFoul(handStrings.top, handStrings.middle, handStrings.bottom)) {
        // If the greedy approach results in a foul, fall back to a simpler sort
        const sorted = sortCards(cardObjects);
        return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
    }

    return hand;
};

export const getSmartSortedHand = (allCards, strategy) => {
  if (!allCards || allCards.length !== 13) return null;
  const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c)).map(c => ({...c, key: `${c.rank}_of_${c.suit}`}));

  // Use the much faster greedy search
  const bestHand = runGreedySearch(cardObjects);

  if (bestHand) {
      return {
          top: sortCards(bestHand.top),
          middle: sortCards(bestHand.middle),
          bottom: sortCards(bestHand.bottom),
      };
  }

  // Fallback for any unexpected issues
  const sorted = sortCards(cardObjects);
  return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
};