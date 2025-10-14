// frontend/src/utils/smartArrange.js
import {
  evaluate5CardHand,
  evaluate3CardHand,
  isValidHand,
  SEGMENT_SCORES,
  HAND_TYPES,
  compareEvaluatedHands,
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

// Find the key for a given hand type from the HAND_TYPES object
function getHandTypeKey(handEval) {
    if (!handEval || !handEval.type) return null;
    for (const key in HAND_TYPES) {
        if (HAND_TYPES[key].value === handEval.type.value && HAND_TYPES[key].name === handEval.type.name) {
            return key;
        }
    }
    return null;
}

// --- Special Hand Detection ---

// Detects if a "Three Flushes" special hand can be formed
function findThreeFlushes(hand) {
    const suits = {};
    hand.forEach(card => {
        if (!suits[card.suit]) suits[card.suit] = [];
        suits[card.suit].push(card);
    });

    const flushHands = Object.values(suits).filter(s => s.length >= 3);
    if (flushHands.length < 3) return null;

    // We need to find a combination of 3, 5, 5 cards that are all flushes
    const backCandidates = flushHands.filter(s => s.length >= 5);
    if (backCandidates.length === 0) return null;

    for (const back of backCandidates) {
        const remaining = hand.filter(c => !back.includes(c));
        const middleCandidates = getCombinations(remaining, 5).filter(h => new Set(h.map(c => c.suit)).size === 1);

        for (const middle of middleCandidates) {
            const front = remaining.filter(c => !middle.includes(c));
            if (front.length === 3 && new Set(front.map(c => c.suit)).size === 1) {
                const arrangement = { front: sortHand(front), middle: sortHand(middle), back: sortHand(back) };
                if (isValidHand(arrangement.front, arrangement.middle, arrangement.back)) {
                    return arrangement;
                }
            }
        }
    }
    return null;
}

// Detects if a "Three Straights" special hand can be formed
function findThreeStraights(hand) {
    // This is computationally complex. We simplify by finding all possible straights first.
    const all5CardStraights = getCombinations(hand, 5)
        .map(h => ({ hand: h, eval: evaluate5CardHand(h) }))
        .filter(res => res.eval.type.value === HAND_TYPES.STRAIGHT.value);

    const all3CardStraights = getCombinations(hand, 3)
        .map(h => {
             const ranks = [...new Set(h.map(c => c.value))].sort((a,b) => a-b);
             const isStraight = ranks.length === 3 && ranks[2] - ranks[0] === 2;
             return { hand: h, isStraight: isStraight };
        })
        .filter(res => res.isStraight);


    for (const back of all5CardStraights) {
        const remaining = hand.filter(c => !back.hand.includes(c));
        for (const middle of getCombinations(remaining, 5)) {
            const middleEval = evaluate5CardHand(middle);
            if (middleEval.type.value !== HAND_TYPES.STRAIGHT.value) continue;

            const front = remaining.filter(c => !middle.includes(c));
            if (front.length !== 3) continue;

            const frontIsStraight = all3CardStraights.some(s => s.hand.every(c => front.includes(c)));
            if (frontIsStraight) {
                 const arrangement = { front: sortHand(front), middle: sortHand(middle), back: sortHand(back.hand) };
                 if (isValidHand(arrangement.front, arrangement.middle, arrangement.back)) {
                    return arrangement;
                 }
            }
        }
    }
    return null;
}


// The main function to find the best arrangement
export function findBestArrangement(hand) {
    if (hand.length !== 13) return null;

    console.log("Starting optimized smart arrangement calculation...");

    // Check for special hands first
    const threeFlushes = findThreeFlushes(hand);
    if (threeFlushes) {
        console.log("Found Three Flushes special hand.");
        return threeFlushes;
    }
    const threeStraights = findThreeStraights(hand);
    if (threeStraights) {
        console.log("Found Three Straights special hand.");
        return threeStraights;
    }


    let bestArrangement = null;
    let bestScore = -1;

    // 1. Generate all possible 5-card hands and evaluate them
    const all5CardHands = getCombinations(hand, 5).map(h => ({
        hand: h,
        eval: evaluate5CardHand(h),
    }));

    // 2. Sort them by strength to prioritize better hands
    all5CardHands.sort((a, b) => compareEvaluatedHands(b.eval, a.eval));

    // 3. Iterate through potential back hands (strongest first)
    for (let i = 0; i < all5CardHands.length; i++) {
        const back = all5CardHands[i];
        const remainingAfterBack = hand.filter(card => !back.hand.includes(card));

        // 4. Generate and evaluate 5-card hands from the remainder
        const middleCandidates = getCombinations(remainingAfterBack, 5).map(h => ({
            hand: h,
            eval: evaluate5CardHand(h),
        }));
        middleCandidates.sort((a, b) => compareEvaluatedHands(b.eval, a.eval));

        // 5. Iterate through potential middle hands
        for (let j = 0; j < middleCandidates.length; j++) {
            const middle = middleCandidates[j];

            if (compareEvaluatedHands(middle.eval, back.eval) > 0) {
                continue;
            }

            const frontHand = remainingAfterBack.filter(card => !middle.hand.includes(card));
            if (frontHand.length !== 3) continue;

            const frontEval = evaluate3CardHand(frontHand);

            if (compareEvaluatedHands(frontEval, middle.eval) > 0) {
                continue;
            }

            let currentScore = back.eval.type.value + middle.eval.type.value + frontEval.type.value;

            const backHandKey = getHandTypeKey(back.eval);
            if (backHandKey && SEGMENT_SCORES.back[backHandKey]) {
                currentScore += SEGMENT_SCORES.back[backHandKey];
            }

            const middleHandKey = getHandTypeKey(middle.eval);
            if (middleHandKey && SEGMENT_SCORES.middle[middleHandKey]) {
                currentScore += SEGMENT_SCORES.middle[middleHandKey];
            }

            const frontHandKey = getHandTypeKey(frontEval);
            if (frontHandKey && SEGMENT_SCORES.front[frontHandKey]) {
                currentScore += SEGMENT_SCORES.front[frontHandKey];
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestArrangement = {
                    front: sortHand(frontHand),
                    middle: sortHand(middle.hand),
                    back: sortHand(back.hand),
                };
            }
        }
    }

    console.log("Found best arrangement with score:", bestScore, bestArrangement);

    return bestArrangement;
}