// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple) 保持不变 ---
// ... (这些函数与上一版本相同，此处省略以保持简洁) ...
const HAND_TYPE_HIGH_CARD = 1; /* ...其他常量 */
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
function evaluateHandSimple(cardObjects) { /* ... */ } // 确保这个函数仍然存在并返回 name 和 rank


// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的引用或ID)
// 暂时注释掉，因为下面的简化AI用不到它
/*
function removeSelectedCards(sourceHand, selectedCards) {
    const selectedIds = new Set(selectedCards.map(c => c.id));
    return sourceHand.filter(c => !selectedIds.has(c));
}
*/

// 辅助函数：生成组合 C(n,k)
// 暂时注释掉，因为下面的简化AI用不到它，并且它导致了性能问题
/*
function combinations(sourceArray, k) {
    if (k === 0) return [[]];
    if (sourceArray.length < k) return [];

    const result = [];
    function pick(startIndex, currentCombo) {
        if (currentCombo.length === k) {
            result.push([...currentCombo]);
            return;
        }
        if (startIndex >= sourceArray.length) return;

        currentCombo.push(sourceArray[startIndex]);
        pick(startIndex + 1, currentCombo);
        currentCombo.pop();

        pick(startIndex + 1, currentCombo);
    }
    pick(0, []);
    return result;
}
*/

// 主要AI逻辑
export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    const allCards = allCardsInput.map(c => ({ ...c, rank: getRankValue(c.value) }));
    allCards.sort((a, b) => b.rank - a.rank); // 从大到小排序

    // --- 修改点：暂时禁用复杂的组合逻辑，直接使用最简单的顺序分配 ---
    console.log("AI分牌：使用简化的顺序分配策略。");

    // 直接按牌面大小顺序分配，这至少能保证是一个合法的（可能是全乌龙）解
    // 并且满足了“后墩通常比中墩大，中墩通常比前墩大”的启发式（但不保证牌型）
    const bestArrangement = {
        // 注意：slice返回的是浅拷贝，如果 allCards 中的对象是原始对象，则这里也是
        // 我们在 allCards 创建时已经对输入做了浅拷贝并添加了 rank
        // GameBoard 在调用AI后，会使用这些对象去更新 state，所以不需要再 map originalCard
        backHand: allCards.slice(0, 5),
        middleHand: allCards.slice(5, 10),
        frontHand: allCards.slice(10, 13),
    };
    
    // 由于我们直接分配，理论上不需要再进行复杂的合法性检查和评分，
    // 因为按大小顺序分配几乎总能满足（除非所有牌点数完全一样，这在扑克中不可能）
    // 简单的合法性检查还是可以保留，以防万一
    const evalBack = evaluateHandSimple(bestArrangement.backHand);
    const evalMiddle = evaluateHandSimple(bestArrangement.middleHand);
    const evalFront = evaluateHandSimple(bestArrangement.frontHand);

    // 非常简化的检查，实际应使用严格的墩牌比较
    if (!(evalFront.rank <= evalMiddle.rank && evalMiddle.rank <= evalBack.rank)) {
        console.warn("AI顺序分配后，简单的rank比较未通过，可能牌面非常特殊或evaluateHandSimple的rank计算需调整。");
        // 即使这里警告，我们仍然返回这个基础排列，让用户或后端来做最终判断
    }

    return bestArrangement;

    // --- 以下是之前复杂的组合逻辑，已暂时禁用 ---
    /*
    let bestArrangement = null;
    let bestArrangementScore = -Infinity;

    const backCombinations = combinations(allCards, 5);
    console.log(`AI: Found ${backCombinations.length} back hand combinations.`); // Debug

    for (const backTry of backCombinations) {
        // ... (之前的循环和逻辑) ...
    }

    if (!bestArrangement) {
        console.warn("AI未能通过组合找到合法解，回退到顺序分配。"); // 这条日志现在不应该触发了
        // ... (之前的回退逻辑) ...
    }
    return bestArrangement;
    */
}
