import { parseCard, evaluateHand as evaluate5Cards, compareHands } from './pokerEvaluator';

const rankMap = { 'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2' };

const check_for_dragon = (hand) => {
    const parsedHand = hand.map(parseCard).filter(Boolean);
    if (parsedHand.length !== 13) return null;

    const unique_ranks = [...new Set(parsedHand.map(c => c.value))];
    if (unique_ranks.length === 13) {
        unique_ranks.sort((a, b) => a - b);
        if (unique_ranks[12] - unique_ranks[0] === 12) {
            const sortedHand = parsedHand.sort((a, b) => a.value - b.value).map(c => `${c.rank}_of_${c.suit}`);
            return { top: sortedHand.slice(0, 3), middle: sortedHand.slice(3, 8), bottom: sortedHand.slice(8, 13) };
        }
    }
    return null;
}

const check_for_three_flushes = (hand) => {
    const parsedHand = hand.map(parseCard).filter(Boolean);
    if (parsedHand.length !== 13) return null;

    const suits = parsedHand.map(c => c.suit);
    const suitCounts = suits.reduce((acc, suit) => ({ ...acc, [suit]: (acc[suit] || 0) + 1 }), {});

    const counts = Object.values(suitCounts).sort((a, b) => a - b);

    if (JSON.stringify(counts) === JSON.stringify([3, 5, 5])) {
        const flush3Suit = Object.keys(suitCounts).find(suit => suitCounts[suit] === 3);
        const flush5Suits = Object.keys(suitCounts).filter(suit => suitCounts[suit] === 5);

        const frontCards = parsedHand.filter(c => c.suit === flush3Suit).sort((a,b) => a.value - b.value);
        let middleCards = parsedHand.filter(c => c.suit === flush5Suits[0]).sort((a,b) => a.value - b.value);
        let backCards = parsedHand.filter(c => c.suit === flush5Suits[1]).sort((a,b) => a.value - b.value);

        // Ensure middle is higher than back by poker hand rules
        const middleEval = evaluate5Cards(middleCards);
        const backEval = evaluate5Cards(backCards);

        if (compareHands(middleEval, backEval) < 0) {
            [middleCards, backCards] = [backCards, middleCards]; // Swap
        }

        return {
            top: frontCards.map(c => `${c.rank}_of_${c.suit}`),
            middle: middleCards.map(c => `${c.rank}_of_${c.suit}`),
            bottom: backCards.map(c => `${c.rank}_of_${c.suit}`)
        };
    }
    return null;
}

const check_for_six_and_a_half_pairs = (hand) => {
    const parsedHand = hand.map(parseCard).filter(Boolean);
    if (parsedHand.length !== 13) return null;

    const ranks = parsedHand.map(c => c.value);
    const counts = ranks.reduce((acc, rank) => ({ ...acc, [rank]: (acc[rank] || 0) + 1 }), {});

    const pairs = Object.values(counts).filter(count => count === 2).length;

    if (pairs === 6) {
        const singleRank = parseInt(Object.keys(counts).find(rank => counts[rank] === 1));
        const single = parsedHand.find(c => c.value === singleRank);
        const pairCards = parsedHand.filter(c => c.value !== singleRank);

        pairCards.sort((a, b) => a.value - b.value);

        const sortedHand = [single, ...pairCards].map(c => `${c.rank}_of_${c.suit}`);

        return {
          top: sortedHand.slice(0, 3),
          middle: sortedHand.slice(3, 8),
          bottom: sortedHand.slice(8, 13)
        };
    }
    return null;
}

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

export const findBestArrangement = (hand, count = 1) => {
    const dragon = check_for_dragon(hand);
    if (dragon) return [{ score: 100000, arrangement: dragon }];

    const six_and_a_half_pairs = check_for_six_and_a_half_pairs(hand);
    if (six_and_a_half_pairs) return [{ score: 50000, arrangement: six_and_a_half_pairs }];

    const three_flushes = check_for_three_flushes(hand);
    if (three_flushes) return [{ score: 75000, arrangement: three_flushes }];

    const all5CardCombosBack = getCombinations(hand, 5);
    const arrangements = [];

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
                arrangements.push({ score: totalScore, arrangement: { top: front, middle, bottom: back } });
            }
        }
    }

    arrangements.sort((a, b) => b.score - a.score);

    const unique_arrangements = [];
    const seen = new Set();
    for (const item of arrangements) {
        const key = JSON.stringify(item.arrangement);
        if (!seen.has(key)) {
            unique_arrangements.push(item);
            seen.add(key);
        }
    }

    if (unique_arrangements.length === 0) {
        const sortedHand = hand.map(parseCard).filter(Boolean).sort((a, b) => b.value - a.value);
        const cardKeys = sortedHand.map(c => `${c.rank}_of_${c.suit}`);
        return [{
          score: 0,
          arrangement: {
            top: cardKeys.slice(0, 3),
            middle: cardKeys.slice(3, 8),
            bottom: cardKeys.slice(8, 13),
          }
        }];
    }

    return unique_arrangements.slice(0, count);
};
