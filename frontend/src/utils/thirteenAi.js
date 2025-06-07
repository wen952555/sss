// frontend/src/utils/thirteenAi.js

// --- 移除或确认没有错误的 import HandArea 语句 ---
// 检查文件顶部，确保没有类似这样的错误导入：
// import HandArea from './HandArea'; // <--- 如果存在这样的语句，删除它
// 或者
// import HandArea from '../components/HandArea'; // thirteenAi.js 通常不需要直接导入UI组件

// --- 牌型代码和基础辅助函数 ---
// (这些保持不变)
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1;
// ... (其他牌型常量和 eslint-disable-next-line)

function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ } // 这个函数应该只被 evaluateHandSimple 调用
export function evaluateHandSimple(cardObjects) { /* ... */ }
export function compareHandsFrontend(eval1, eval2) { /* ... */ }

export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    const allCards = allCardsInput.map(c => ({ 
        ...c, 
        rankForSort: getRankValue(c.value) 
    }));
    allCards.sort((a, b) => b.rankForSort - a.rankForSort); 

    const sortedOriginalCards = allCards.map(c => {
        const { rankForSort, ...originalCard } = c; 
        return originalCard; 
    });

    console.log("AI分牌：使用简化的顺序分配策略。Input cards sample (original):", 
        allCardsInput[0] ? `${allCardsInput[0].value}_of_${allCardsInput[0].suit}` : "N/A"
    );
    // console.log("Sorted original cards sample:", 
    //     sortedOriginalCards[0] ? `${sortedOriginalCards[0].value}_of_${sortedOriginalCards[0].suit}` : "N/A"
    // );

    const arrangement = {
        backHand: sortedOriginalCards.slice(0, 5),
        middleHand: sortedOriginalCards.slice(5, 10),
        frontHand: sortedOriginalCards.slice(10, 13),
    };
    
    // console.log("AI Raw Arrangement (before eval):");
    // console.log("Front:", arrangement.frontHand.map(c=>`${c.value}_of_${c.suit}`));
    // console.log("Middle:", arrangement.middleHand.map(c=>`${c.value}_of_${c.suit}`));
    // console.log("Back:", arrangement.backHand.map(c=>`${c.value}_of_${c.suit}`));

    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);

    // console.log("AI Evaluated Hands:");
    // console.log("Eval Front:", JSON.parse(JSON.stringify(evalFront)));
    // console.log("Eval Middle:", JSON.parse(JSON.stringify(evalMiddle)));
    // console.log("Eval Back:", JSON.parse(JSON.stringify(evalBack)));

    const frontToMiddleComparison = compareHandsFrontend(evalFront, evalMiddle);
    const middleToBackComparison = compareHandsFrontend(evalMiddle, evalBack);

    if (!(frontToMiddleComparison <= 0 && middleToBackComparison <= 0)) {
        console.warn( 
            `AI顺序分配的牌墩不符合牌型大小规则 (这很常见，AI需改进): 
            Front (${evalFront.name}) vs Middle (${evalMiddle.name}): ${frontToMiddleComparison > 0 ? '倒水' : 'OK'}, 
            Middle (${evalMiddle.name}) vs Back (${evalBack.name}): ${middleToBackComparison > 0 ? '倒水' : 'OK'}`
        );
    } else {
        console.log("AI顺序分配的牌墩符合牌型大小规则。",
            { frontName: evalFront.name, middleName: evalMiddle.name, backName: evalBack.name }
        );
    }
    
    return arrangement; 
}
