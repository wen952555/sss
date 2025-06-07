// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (与上一版本相同) ---
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1; /* ... */ // (所有牌型常量)
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... (确保返回 primary_ranks, name, rank, type_code) ... */ }
export function compareHandsFrontend(eval1, eval2) { /* ... */ }

// 辅助函数：Fisher-Yates Shuffle 洗牌算法
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; // 创建副本以避免修改原数组
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}

// 主要AI逻辑 - 改进版 V2 (启发式尝试 + 有限次洗牌)
export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }

    // 确保我们操作的是原始卡片对象的副本
    const allCardsOriginal = allCardsInput.map(c => ({ ...c }));

    let bestArrangement = null;
    let bestArrangementScore = -Infinity; // 越高越好
    const MAX_ATTEMPTS = 100; // 尝试洗牌和分配的次数上限，防止无限循环或过长计算

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // 稍微打乱一下牌的顺序，或者在更高级的AI中，这里可以是有策略地选择初始牌
        const currentHandAttempt = (attempt === 0) ? 
            [...allCardsOriginal].sort((a, b) => getRankValue(b.value) - getRankValue(a.value)) // 第一次尝试仍然按大小顺序
            : shuffleArray(allCardsOriginal);

        // 尝试分配到三墩 (这里仍然使用顺序分配作为基础尝试，但因为输入被打乱了，所以结果会不同)
        const tempBack = currentHandAttempt.slice(0, 5);
        const tempMiddle = currentHandAttempt.slice(5, 10);
        const tempFront = currentHandAttempt.slice(10, 13);

        if (tempFront.length !== 3 || tempMiddle.length !== 5 || tempBack.length !== 5) {
            continue; // 以防万一slice出问题
        }

        const evalBack = evaluateHandSimple(tempBack);
        const evalMiddle = evaluateHandSimple(tempMiddle);
        const evalFront = evaluateHandSimple(tempFront);

        // 规则检查：前墩 ≤ 中墩 ≤ 后墩
        const frontOk = compareHandsFrontend(evalFront, evalMiddle) <= 0;
        const middleOk = compareHandsFrontend(evalMiddle, evalBack) <= 0;

        if (frontOk && middleOk) {
            // 这是一个合法的排列
            // 简单评分：后墩牌力 > 中墩牌力 > 前墩牌力
            // 我们希望后墩尽可能大，然后是中墩，然后是前墩
            // 这里的 rank 是 evaluateHandSimple 返回的综合评分
            const currentScore = evalBack.rank * 10000 + evalMiddle.rank * 100 + evalFront.rank;

            if (currentScore > bestArrangementScore) {
                bestArrangementScore = currentScore;
                bestArrangement = {
                    frontHand: tempFront,
                    middleHand: tempMiddle,
                    backHand: tempBack,
                };
                // console.log(`AI Attempt ${attempt}: New best score ${bestArrangementScore} - F:${evalFront.name}, M:${evalMiddle.name}, B:${evalBack.name}`);
            }
        }
    } // end of attempts loop

    if (bestArrangement) {
        console.log("AI分牌完成 (通过启发式尝试)。");
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand);
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand);
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand);
        console.log(`最终AI牌型: 前墩(${finalEvalF.name}), 中墩(${finalEvalM.name}), 后墩(${finalEvalB.name})`);
        if (!(compareHandsFrontend(finalEvalF, finalEvalM) <= 0 && compareHandsFrontend(finalEvalM, finalEvalB) <= 0)){
            console.error("警告：AI最终选择的牌型仍然倒水，计分或比较逻辑可能需要检查！", { F: finalEvalF, M: finalEvalM, B: finalEvalB});
        }
        return bestArrangement;
    } else {
        // 如果经过多次尝试仍然没有找到任何一个合法的（理论上不太可能，至少全乌龙也应该满足）
        console.warn("AI在多次尝试后未能找到任何合法解，回退到纯顺序分配。");
        const cardsWithRank = allCardsInput.map(c => ({...c, rankForSort: getRankValue(c.value) }));
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
}
