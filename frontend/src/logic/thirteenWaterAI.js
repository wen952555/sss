// frontend/src/logic/thirteenWaterAI.js
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

// 优先冲三的AI理牌：有三条必须放头道
function findBestThirteenWaterArrangement(thirteenCards) {
    if (!thirteenCards || thirteenCards.length !== 13) {
        console.error("AI requires exactly 13 cards.");
        return null;
    }

    // 1. 找所有3张三条组合
    const allHeadTriplets = getCombinations(thirteenCards, 3)
        .filter(triplet => evaluateHand(triplet).type === 3); // HAND_TYPES.THREE_OF_A_KIND === 3

    // 按照三条的点数从大到小排序，优先大三条
    allHeadTriplets.sort((a, b) => {
        const aRank = evaluateHand(a).kickers[0];
        const bRank = evaluateHand(b).kickers[0];
        return bRank - aRank;
    });

    // 2. 用冲三方案理牌
    for (let i = 0; i < allHeadTriplets.length; i++) {
        const head = allHeadTriplets[i];
        const restLeft = thirteenCards.filter(c => !head.includes(c));
        // 剩下10张，5张中道，5张尾道，全枚举
        const allMiddle = getCombinations(restLeft, 5);
        for (const mid of allMiddle) {
            const tail = restLeft.filter(c => !mid.includes(c));
            if (tail.length !== 5) continue;
            // 田字型必须满足 头道 <= 中道 <= 尾道
            const headEval = evaluateHand(head);
            const midEval = evaluateHand(mid);
            const tailEval = evaluateHand(tail);
            if (compareEvaluatedHands(headEval, midEval) > 0) continue;
            if (compareEvaluatedHands(midEval, tailEval) > 0) continue;
            // 优先级：尾道>中道>头道，分数大为优
            const score = (tailEval.type * 10000) + (midEval.type * 100) + headEval.type;
            return {
                top: head, middle: mid, bottom: tail,
                topEval: headEval, middleEval: midEval, bottomEval: tailEval,
                score
            };
        }
    }

    // 3. 没有冲三可用，回退为一般最大分理牌
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
            if (compareEvaluatedHands(topEval, middleEval) > 0) continue;
            if (compareEvaluatedHands(middleEval, bottomEval) > 0) continue;
            const score = (bottomEval.type * 10000) + (middleEval.type * 100) + topEval.type;
            if (bestArrangement === null || score > bestScore) {
                bestScore = score;
                bestArrangement = {
                    top: topCandidateCards,
                    middle: middleCandidateCards,
                    bottom: bottomCandidateCards,
                    topEval, middleEval, bottomEval,
                    score
                };
            }
        }
    }
    return bestArrangement;
}

export { findBestThirteenWaterArrangement };
