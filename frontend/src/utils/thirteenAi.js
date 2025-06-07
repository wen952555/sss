// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple, compareHandsFrontend) ---
// (这些与上一个版本相同，此处省略，但确保它们存在且 evaluateHandSimple 和 compareHandsFrontend 已导出)
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1; /* ... */
// ... (其他常量和辅助函数) ...
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... */ }
export function compareHandsFrontend(eval1, eval2) { /* ... */ }


export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null; // 返回null，让调用方处理
    }
    
    // --- 修改点：确保我们操作的是原始卡片对象的副本，只添加rank用于排序 ---
    // allCardsInput 应该是从 GameBoard 传来的 allPlayerCards，它们是原始对象
    const cardsWithRank = allCardsInput.map(c => ({ 
        ...c, // 保留所有原始属性
        rankForSort: getRankValue(c.value) // 使用一个不冲突的属性名进行排序
    }));
    cardsWithRank.sort((a, b) => b.rankForSort - a.rankForSort); 

    // 从排序后的数组中提取出原始卡片对象（不带临时的rankForSort）
    const sortedOriginalCards = cardsWithRank.map(c => {
        const { rankForSort, ...originalCard } = c; // 移除 rankForSort
        return originalCard; // 现在是纯净的原始卡片对象结构
    });

    console.log("AI分牌：使用简化的顺序分配策略。Input cards sample (original):", allCardsInput[0]);
    console.log("Sorted original cards sample:", sortedOriginalCards[0]);


    // 尝试按顺序分配
    let arrangement = {
        backHand: sortedOriginalCards.slice(0, 5),
        middleHand: sortedOriginalCards.slice(5, 10),
        frontHand: sortedOriginalCards.slice(10, 13),
    };
    
    console.log("AI Raw Arrangement (before eval):");
    console.log("Front:", arrangement.frontHand.map(c=>`${c.value}_of_${c.suit}`));
    console.log("Middle:", arrangement.middleHand.map(c=>`${c.value}_of_${c.suit}`));
    console.log("Back:", arrangement.backHand.map(c=>`${c.value}_of_${c.suit}`));

    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);

    console.log("AI Evaluated Hands:");
    console.log("Eval Front:", JSON.parse(JSON.stringify(evalFront)));
    console.log("Eval Middle:", JSON.parse(JSON.stringify(evalMiddle)));
    console.log("Eval Back:", JSON.parse(JSON.stringify(evalBack)));

    const frontToMiddleComparison = compareHandsFrontend(evalFront, evalMiddle);
    const middleToBackComparison = compareHandsFrontend(evalMiddle, evalBack);

    // 即使比较未通过，我们仍然返回这个顺序分配的结果，
    // 因为当前AI目标是提供一个基础的、数据结构正确的摆放。
    // “倒水”的判断和提示应该由 GameBoard 或后端来处理。
    if (!(frontToMiddleComparison <= 0 && middleToBackComparison <= 0)) {
        console.warn( // 改为 warn，因为它不是AI的致命错误，而是策略的局限
            `AI顺序分配的牌墩不符合牌型大小规则 (这很常见，AI需改进): 
            Front (${evalFront.name}) vs Middle (${evalMiddle.name}): ${frontToMiddleComparison > 0 ? '倒水' : 'OK'}, 
            Middle (${evalMiddle.name}) vs Back (${evalBack.name}): ${middleToBackComparison > 0 ? '倒水' : 'OK'}`
        );
    } else {
        console.log("AI顺序分配的牌墩符合牌型大小规则。",
            { frontName: evalFront.name, middleName: evalMiddle.name, backName: evalBack.name }
        );
    }
    
    // 确保返回的 arrangement 中的卡片对象是原始结构，不包含临时的 rankForSort
    return arrangement; 
}
