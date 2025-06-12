// frontend/src/logic/thirteenWaterAI.js
import { Card } from './card';
import { evaluateHand, compareEvaluatedHands, HAND_TYPES } from './handEvaluator';

/**
 * Generates all k-combinations from a set of elements.
 * @param {Array<Card>} elements - The array of Card objects.
 * @param {number} k - The size of combinations to generate.
 * @returns {Array<Array<Card>>} An array of k-combinations.
 */
function getCombinations(elements, k) {
    if (k === 0) return [[]];
    if (elements.length < k) return [];
    if (elements.length === k) return [elements];

    const first = elements[0];
    const rest = elements.slice(1);

    const combsWithoutFirst = getCombinations(rest, k);
    const combsWithFirst = getCombinations(rest, k - 1).map(comb => [first, ...comb]);

    return [...combsWithFirst, ...combsWithoutFirst];
}

/**
 * Finds the best thirteen water arrangement for a given 13-card hand.
 * @param {Card[]} thirteenCards - An array of 13 Card objects.
 * @returns {{top: Card[], middle: Card[], bottom: Card[], topEval: object, middleEval: object, bottomEval: object} | null}
 * Returns the best arrangement or null if none found (should always find one).
 */
export function findBestThirteenWaterArrangement(thirteenCards) {
    if (!thirteenCards || thirteenCards.length !== 13) {
        console.error("AI requires exactly 13 cards.");
        return null;
    }

    let bestArrangement = null;
    let bestScore = -1; // Higher is better (based on hand types)

    // TODO: Implement detection for special 13-card hands first (e.g., Dragon, Three Flushes, etc.)
    // If a special hand is found, that's often the best arrangement.

    // Brute-force approach: (13 C 5 for bottom) * (8 C 5 for middle) * (3 C 3 for top)
    // 1287 * 56 * 1 = 72072 combinations. Manageable for modern JS.

    const bottomCombinations = getCombinations(thirteenCards, 5);

    for (const bottomCandidateCards of bottomCombinations) {
        const remainingAfterBottom = thirteenCards.filter(c => !bottomCandidateCards.includes(c));
        
        const middleCombinations = getCombinations(remainingAfterBottom, 5);

        for (const middleCandidateCards of middleCombinations) {
            const topCandidateCards = remainingAfterBottom.filter(c => !middleCandidateCards.includes(c));

            if (topCandidateCards.length !== 3) continue; // Should always be 3 here

            const bottomEval = evaluateHand(bottomCandidateCards);
            const middleEval = evaluateHand(middleCandidateCards);
            const topEval = evaluateHand(topCandidateCards);

            // Validate "no misarrangement" (头道 <= 中道 <= 尾道)
            const topVsMiddle = compareEvaluatedHands(topEval, middleEval);
            const middleVsBottom = compareEvaluatedHands(middleEval, bottomEval);

            if (topVsMiddle <= 0 && middleVsBottom <= 0) {
                // Valid arrangement
                // Define a scoring system. Simple one: sum of type values, weighted.
                // Or prioritize stronger bottom, then middle, then top.
                // Example: BottomType * 10000 + MiddleType * 100 + TopType
                // This simple score prioritizes stronger individual hands.
                // A more advanced score might consider "打枪" potential or special points.
                const currentScore = (bottomEval.type * 10000) + (middleEval.type * 100) + topEval.type;
                // Add kickers for tie-breaking scores if types are identical
                // For simplicity, we'll just use type score for now.

                if (bestArrangement === null || currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = {
                        bottom: bottomEval.handCards, // Use sorted cards from evaluation
                        middle: middleEval.handCards,
                        top: topEval.handCards,
                        bottomEval: bottomEval, // Store full evaluation result
                        middleEval: middleEval,
                        topEval: topEval,
                    };
                }
            }
        }
    }
    // console.log("AI Best Arrangement:", bestArrangement, "Score:", bestScore);
    return bestArrangement;
}
