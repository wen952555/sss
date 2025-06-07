// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (与上一版本相同) ---
// (所有牌型常量，getRankValue, prepareCardsForEval, evaluateHandSimple, compareHandsFrontend)
// ... (此处省略以保持简洁，请确保这些函数与上一版本完全一致) ...
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1; /* ... */
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... */ }
export function compareHandsFrontend(eval1, eval2, context = "") { /* ... */ }


// 辅助函数：Fisher-Yates Shuffle 洗牌算法
// --- 修改点：暂时注释掉，因为当前组合搜索AI不直接使用它 ---
/* // Line 147 (或附近)
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; 
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}
*/

// 辅助函数：生成组合 C(n,k) - 被 simpleAiArrangeCards 调用
function combinations(sourceArray, k) { /* ... (与上一版本相同) ... */ }

// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的 id) - 被 simpleAiArrangeCards 调用
function removeSelectedCards(sourceHand, selectedCards) { /* ... (与上一版本相同) ... */ }


// 主要AI逻辑 - 改进版 (基于组合搜索)
export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    const allCards = allCardsInput.map(c => ({ ...c, id: c.id || `${c.value}_of_${c.suit}` }));

    let bestArrangement = null;
    let bestArrangementOverallScore = -Infinity; 

    const possibleBackHands = combinations(allCards, 5);
    if (possibleBackHands.length === 0 && allCards.length > 0) { // 如果有牌但无法生成组合
        console.error("未能生成后墩组合，但有输入牌张。");
        return fallbackArrangement(allCardsInput); 
    } else if (possibleBackHands.length === 0 && allCards.length === 0) { // 无牌输入
        return null;
    }


    for (const currentBackTry of possibleBackHands) {
        const evalBack = evaluateHandSimple(currentBackTry);
        const remainingAfterBack = removeSelectedCards(allCards, currentBackTry);
        if (remainingAfterBack.length !== 8) continue; 
        const possibleMiddleHands = combinations(remainingAfterBack, 5);
        if (possibleMiddleHands.length === 0 && remainingAfterBack.length > 0) continue; 

        for (const currentMiddleTry of possibleMiddleHands) {
            const evalMiddle = evaluateHandSimple(currentMiddleTry);
            if (compareHandsFrontend(evalMiddle, evalBack, "AI M-B") > 0) { 
                continue; 
            }
            const currentFrontTry = removeSelectedCards(remainingAfterBack, currentMiddleTry);
            if (currentFrontTry.length !== 3) continue; 
            const evalFront = evaluateHandSimple(currentFrontTry);
            if (compareHandsFrontend(evalFront, evalMiddle, "AI F-M") > 0) { 
                continue; 
            }
            const overallScore = evalBack.rank * 1000000 + evalMiddle.rank * 1000 + evalFront.rank;
            if (overallScore > bestArrangementOverallScore) {
                bestArrangementOverallScore = overallScore;
                bestArrangement = {
                    frontHand: currentFrontTry,
                    middleHand: currentMiddleTry,
                    backHand: currentBackTry,
                };
            }
        }
    }

    if (bestArrangement) {
        console.log("AI分牌完成 (通过组合搜索)。");
        // ... (日志)
        return bestArrangement;
    } else {
        console.warn("AI未能通过组合搜索找到理想解，回退到顺序分配。");
        return fallbackArrangement(allCardsInput); // <--- 确保 fallbackArrangement 被调用
    }
}

// 回退的简单顺序分配 - 这个函数应该被 simpleAiArrangeCards 调用
function fallbackArrangement(allCardsInput) { // Line 148 (或附近)
    console.log("Executing fallbackArrangement"); // 添加日志确认执行
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
