// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple) ---
// (这些与上一个版本相同，此处省略，但请确保它们存在且 evaluateHandSimple 已导出并返回 primary_ranks)
const HAND_TYPE_HIGH_CARD = 1; /* ... */
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... (确保返回 type_code, cards, name, primary_ranks) ... */ }


export function compareHandsFrontend(eval1, eval2) {
    if (!eval1 || !eval2) {
        // console.log("Compare Error: One or both evals are undefined");
        return 0; 
    }

    // console.log("Comparing Hand 1:", JSON.parse(JSON.stringify(eval1)));
    // console.log("Comparing Hand 2:", JSON.parse(JSON.stringify(eval2)));


    if (eval1.type_code > eval2.type_code) {
        // console.log("Result: Hand 1 wins by type_code");
        return 1;
    }
    if (eval1.type_code < eval2.type_code) {
        // console.log("Result: Hand 2 wins by type_code");
        return -1;
    }

    if (eval1.primary_ranks && eval2.primary_ranks) {
        for (let i = 0; i < Math.min(eval1.primary_ranks.length, eval2.primary_ranks.length); i++) {
            if (eval1.primary_ranks[i] > eval2.primary_ranks[i]) {
                // console.log(`Result: Hand 1 wins at primary_ranks[${i}]`);
                return 1;
            }
            if (eval1.primary_ranks[i] < eval2.primary_ranks[i]) {
                // console.log(`Result: Hand 2 wins at primary_ranks[${i}]`);
                return -1;
            }
        }
    }
    // console.log("Result: Hands are equal");
    return 0; 
}


export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    // 确保 allCards 中的对象是包含所有原始属性的副本，并添加 rank
    const allCards = allCardsInput.map(c => ({ 
        ...c, // 展开原始卡片所有属性
        rank: getRankValue(c.value) 
    }));
    allCards.sort((a, b) => b.rank - a.rank); 

    console.log("AI分牌：使用简化的顺序分配策略。Input cards sample:", allCardsInput[0]);

    const arrangement = {
        backHand: allCards.slice(0, 5).map(c => ({...c})), // 创建新对象副本
        middleHand: allCards.slice(5, 10).map(c => ({...c})),
        frontHand: allCards.slice(10, 13).map(c => ({...c})),
    };
    
    // --- 修改点：打印详细的牌墩信息，便于分析 ---
    console.log("AI Raw Arrangement (before eval):");
    console.log("Front:", JSON.parse(JSON.stringify(arrangement.frontHand.map(c=>`${c.value}_of_${c.suit}`))));
    console.log("Middle:", JSON.parse(JSON.stringify(arrangement.middleHand.map(c=>`${c.value}_of_${c.suit}`))));
    console.log("Back:", JSON.parse(JSON.stringify(arrangement.backHand.map(c=>`${c.value}_of_${c.suit}`))));


    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);

    console.log("AI Evaluated Hands:");
    console.log("Eval Front:", JSON.parse(JSON.stringify(evalFront)));
    console.log("Eval Middle:", JSON.parse(JSON.stringify(evalMiddle)));
    console.log("Eval Back:", JSON.parse(JSON.stringify(evalBack)));

    const frontToMiddleComparison = compareHandsFrontend(evalFront, evalMiddle);
    const middleToBackComparison = compareHandsFrontend(evalMiddle, evalBack);

    if (!(frontToMiddleComparison <= 0 && middleToBackComparison <= 0)) {
        console.error(
            `AI顺序分配后，compareHandsFrontend 比较未通过: 
            Front vs Middle: ${frontToMiddleComparison > 0 ? 'FAIL (Front > Middle)' : 'OK'}, 
            Middle vs Back: ${middleToBackComparison > 0 ? 'FAIL (Middle > Back)' : 'OK'}`,
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    } else {
        console.log(
            `AI顺序分配后，compareHandsFrontend 比较通过:
            Front vs Middle: OK, 
            Middle vs Back: OK`,
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    }
    
    // --- 修改点：打印返回给GameBoard的结构，确认卡片对象是否完整 ---
    // console.log("AI is returning arrangement for GameBoard (sample card from backHand):", 
    //             arrangement.backHand[0] ? JSON.parse(JSON.stringify(arrangement.backHand[0])) : "N/A");

    return arrangement; // arrangement 中的卡片现在是新创建的副本对象
}
