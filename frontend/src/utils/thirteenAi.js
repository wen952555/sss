// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple, compareHandsFrontend) ---
// (这些与上一个版本相同，确保它们存在且已正确导出。evaluateHandSimple 应返回 type_code, cards, name, primary_ranks, rank)
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1; /* ... */
// ... (其他常量和辅助函数，与上一版本一致)
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... (确保返回 primary_ranks) ... */ }
export function compareHandsFrontend(eval1, eval2) { /* ... */ }


// 辅助函数：生成组合 C(n,k) - 性能警告！
function combinations(sourceArray, k) {
    if (k < 0 || k > sourceArray.length) {
        return [];
    }
    if (k === 0) {
        return [[]];
    }
    if (k === sourceArray.length) {
        return [sourceArray];
    }
    if (k === 1) {
        return sourceArray.map(element => [element]);
    }
    const combs = [];
    if (sourceArray.length > 0) { // 确保 sourceArray 不是空的
        const head = sourceArray[0];
        const tail = sourceArray.slice(1);
        // Combs with head
        combinations(tail, k - 1).forEach(smallerComb => {
            combs.push([head, ...smallerComb]);
        });
        // Combs without head
        combinations(tail, k).forEach(smallerComb => {
            combs.push(smallerComb);
        });
    }
    return combs;
}

// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的 id)
function removeSelectedCards(sourceHand, selectedCards) {
    const selectedIds = new Set(selectedCards.map(c => c.id));
    return sourceHand.filter(c => !selectedIds.has(c));
}


// 主要AI逻辑 - 改进版
export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }

    // 确保我们操作的是包含所有必要信息的卡片对象副本
    const allCards = allCardsInput.map(c => ({ ...c, id: c.id || `${c.value}_of_${c.suit}` })); // 确保每张牌有唯一ID

    let bestArrangement = null;
    let bestArrangementOverallScore = -Infinity; // 用于比较不同合法组合的“总牌力”

    // 1. 生成所有可能的后墩 (5张牌)
    const possibleBackHands = combinations(allCards, 5);
    if (possibleBackHands.length === 0) { // 安全检查
        console.error("未能生成后墩组合");
        return fallbackArrangement(allCardsInput);
    }


    for (const currentBackTry of possibleBackHands) {
        const evalBack = evaluateHandSimple(currentBackTry);
        const remainingAfterBack = removeSelectedCards(allCards, currentBackTry);

        if (remainingAfterBack.length !== 8) continue; // 安全检查

        // 2. 生成所有可能的中墩 (从剩余8张中选5张)
        const possibleMiddleHands = combinations(remainingAfterBack, 5);
        if (possibleMiddleHands.length === 0) continue;


        for (const currentMiddleTry of possibleMiddleHands) {
            const evalMiddle = evaluateHandSimple(currentMiddleTry);

            // 规则检查：中墩 ≤ 后墩
            if (compareHandsFrontend(evalMiddle, evalBack) > 0) {
                continue; // 这个中墩比后墩大，不合法
            }

            const currentFrontTry = removeSelectedCards(remainingAfterBack, currentMiddleTry);
            if (currentFrontTry.length !== 3) continue; // 确保前墩是3张

            const evalFront = evaluateHandSimple(currentFrontTry);

            // 规则检查：前墩 ≤ 中墩
            if (compareHandsFrontend(evalFront, evalMiddle) > 0) {
                continue; // 这个前墩比中墩大，不合法
            }

            // 如果到这里，说明找到了一个合法的排列 (前≤中≤后)
            // 现在我们需要一个评分机制来选择“最好”的合法排列
            // 简单评分：后墩牌力优先，然后是中墩，然后是前墩
            // 更大的 rank 代表更好的牌型 (基于 evaluateHandSimple 的 rank 计算)
            const overallScore = evalBack.rank * 1000000 + evalMiddle.rank * 1000 + evalFront.rank;

            if (overallScore > bestArrangementOverallScore) {
                bestArrangementOverallScore = overallScore;
                bestArrangement = {
                    frontHand: currentFrontTry,
                    middleHand: currentMiddleTry,
                    backHand: currentBackTry,
                };
                // console.log("AI: Found new best arrangement score:", overallScore, {f:evalFront.name, m:evalMiddle.name, b:evalBack.name});
            }
        }
    }

    if (bestArrangement) {
        console.log("AI分牌完成 (通过组合搜索)。");
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand);
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand);
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand);
        console.log(`最终AI牌型: 前墩(${finalEvalF.name}), 中墩(${finalEvalM.name}), 后墩(${finalEvalB.name})`);
        return bestArrangement;
    } else {
        // 如果遍历了所有组合都找不到一个完全合法的（理论上不太可能，除非比较函数有问题）
        // 或者为了性能考虑，在一定尝试次数后没找到，则回退
        console.warn("AI未能通过组合搜索找到理想解，回退到顺序分配。");
        return fallbackArrangement(allCardsInput);
    }
}

// 回退的简单顺序分配
function fallbackArrangement(allCardsInput) {
    const cardsWithRank = allCardsInput.map(c => ({
        ...c,
        rankForSort: getRankValue(c.value)
    }));
    cardsWithRank.sort((a, b) => b.rankForSort - a.rankForSort);
    const sortedOriginalCards = cardsWithRank.map(c => {
        const { rankForSort, ...originalCard } = c;
        return originalCard;
    });
    return {
        backHand: sortedOriginalCards.slice(0, 5),
        middleHand: sortedOriginalCards.slice(5, 10),
        frontHand: sortedOriginalCards.slice(10, 13),
    };
}
