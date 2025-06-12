// frontend/src/logic/thirteenWaterAI.js
// 移除了 Card 的导入
// 移除了 HAND_TYPES 的导入
import { evaluateHand, compareEvaluatedHands } from './handEvaluator';

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

export function findBestThirteenWaterArrangement(thirteenCards) {
    if (!thirteenCards || thirteenCards.length !== 13) {
        console.error("AI requires exactly 13 cards.");
        return null;
    }

    let bestArrangement = null;
    let bestScore = -1;

    const bottomCombinations = getCombinations(thirteenCards, 5);

    for (const bottomCandidateCards of bottomCombinations) {
        const remainingAfterBottom = thirteenCards.filter(c => !bottomCandidateCards.includes(c));
        
        const middleCombinations = getCombinations(remainingAfterBottom, 5);

        for (const middleCandidateCards of middleCombinations) {
            const topCandidateCards = remainingAfterBottom.filter(c => !middleCandidateCards.includes(c));

            if (topCandidateCards.length !== 3) continue;

            const bottomEval = evaluateHand(bottomCandidateCards);
            const middleEval = evaluateHand(middleCandidateCards);
            const topEval = evaluateHand(topCandidateCards);

            const topVsMiddle = compareEvaluatedHands(topEval, middleEval);
            const middleVsBottom = compareEvaluatedHands(middleEval, bottomEval);

            if (topVsMiddle <= 0 && middleVsBottom <= 0) {
                const currentScore = (bottomEval.type * 10000) + (middleEval.type * 100) + topEval.type;
                
                if (bestArrangement === null || currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = {
                        bottom: bottomEval.handCards,
                        middle: middleEval.handCards,
                        top: topEval.handCards,
                        bottomEval: bottomEval,
                        middleEval: middleEval,
                        topEval: topEval,
                    };
                }
            }
        }
    }
    return bestArrangement;
}
