// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// (这些常量定义与上一版本一致，包含 eslint-disable-next-line no-unused-vars 注释)
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_PAIR = 2;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_TWO_PAIR = 3;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_THREE_OF_A_KIND = 4;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_STRAIGHT = 5;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FLUSH = 6;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FULL_HOUSE = 7;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FOUR_OF_A_KIND = 8;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_STRAIGHT_FLUSH = 9;

// --- 基础辅助函数 ---
function getRankValue(value) {
    if (!isNaN(parseInt(value))) return parseInt(value);
    if (value === 'jack') return 11;
    if (value === 'queen') return 12;
    if (value === 'king') return 13;
    if (value === 'ace') return 14;
    return 0;
}

function prepareCardsForEval(cardObjects) {
    if (!cardObjects || cardObjects.length === 0) return [];
    const cards = cardObjects.map(c => ({
        ...c,
        rank: getRankValue(c.value),
    }));
    cards.sort((a, b) => b.rank - a.rank);
    return cards;
}

export function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] };
    }
    const preparedCards = prepareCardsForEval(cardObjects);
    if (!preparedCards || preparedCards.length === 0) {
         return { type_code: 0, cards: cardObjects, rank: 0, name: "预处理失败", primary_ranks: [] };
    }
    // (以下 evaluateHandSimple 的完整牌型判断逻辑与上一个版本一致，此处省略以保持简洁)
    // ... (确保所有牌型判断和 return 语句都在这里) ...
    const ranks = preparedCards.map(c => c.rank); const suits = preparedCards.map(c => c.suit); const rankCounts = {}; ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1); const isFlush = new Set(suits).size === 1; let isStraight = false; const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b); let primaryRanksForCompare = [...ranks]; const typeWeights = { [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000, [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000, [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000, [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000, [HAND_TYPE_HIGH_CARD]: 10000, 0: 0 }; let straightHighRank = Math.max(...ranks); if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { const oR = ranks.filter(r=>r!==14&&r!==2).sort((a,b)=>a-b); if (oR.length===3&&oR[0]===3&&oR[1]===4&&oR[2]===5){ straightHighRank = 5;}} if (uniqueRanksSortedAsc.length >= cardObjects.length) { if (cardObjects.length === 5) { if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}} else if (cardObjects.length === 3) { if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}}}
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare }; const cV = Object.values(rankCounts); if (cV.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; } if (cV.includes(3) && cV.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; } if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; if (cV.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; } const nPs=cV.filter(c=>c===2).length; if (nPs===2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; } if (nPs===1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; } return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2, context = "") {
    if (!eval1 || !eval2) {
        console.error(`Compare Error in ${context}: One or both evals are undefined. Eval1:`, eval1, "Eval2:", eval2);
        return 0;
    }
    if (eval1.type_code > eval2.type_code) return 1;
    if (eval1.type_code < eval2.type_code) return -1;
    if (eval1.primary_ranks && eval2.primary_ranks) {
        for (let i = 0; i < Math.min(eval1.primary_ranks.length, eval2.primary_ranks.length); i++) {
            if (eval1.primary_ranks[i] > eval2.primary_ranks[i]) return 1;
            if (eval1.primary_ranks[i] < eval2.primary_ranks[i]) return -1;
        }
    }
    return 0;
}

// 辅助函数：生成组合 C(n,k) - 被 simpleAiArrangeCards 调用 (如果使用组合搜索版本)
// (这个函数定义与上一版本相同，此处省略)
function combinations(sourceArray, k) { /* ... */ }

// 辅助函数：从手牌中移除已选的牌 - 被 simpleAiArrangeCards 调用 (如果使用组合搜索版本)
// (这个函数定义与上一版本相同，此处省略)
function removeSelectedCards(sourceHand, selectedCards) { /* ... */ }

// 回退的简单顺序分配
function fallbackArrangement(allCardsInput) {
    console.log("Executing fallbackArrangement due to AI failure or no better solution found.");
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
// shuffleArray 保持注释，因为它未被当前AI策略使用
/* function shuffleArray(array) { ... } */


export function simpleAiArrangeCards(allCardsInput) {
    // --- 修改点：在函数最开始处进行严格的输入参数校验 ---
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) {
        console.error("AI分牌错误：simpleAiArrangeCards收到的输入牌数据无效或数量不为13。Input:", allCardsInput);
        return null; // 直接返回 null，避免后续错误
    }

    // 确保 allCards 中的对象是包含所有原始属性的副本，并添加一个临时的、不冲突的排序键
    const allCards = allCardsInput.map(c => {
        if (!c || typeof c !== 'object' || !c.value || !c.suit) { // 进一步检查单个卡片对象
            console.error("AI分牌错误：手牌中包含无效的卡片对象:", c, "in allCardsInput:", allCardsInput);
            // 这种情况很严重，可能应该抛出错误或返回null
            // 为了让函数能继续（如果只有少数坏数据），可以过滤掉它，但更好的做法是确保输入数据质量
            // 这里我们假设如果有一个坏卡片，整个AI就失败
            throw new Error("AI收到无效卡片对象"); 
        }
        return { 
            ...c, // 保留所有原始属性
            id: c.id || `${c.value}_of_${c.suit}`, // 确保有id
            rankForSortInternal: getRankValue(c.value) // 使用一个内部排序键
        };
    });
    // 使用内部排序键排序，不修改原始rank (如果原始对象有rank属性)
    allCards.sort((a, b) => b.rankForSortInternal - a.rankForSortInternal); 

    // 从排序后的数组中提取出原始卡片对象（移除临时的 rankForSortInternal）
    const sortedOriginalCards = allCards.map(c => {
        const { rankForSortInternal, ...originalCard } = c; 
        return originalCard; 
    });

    console.log("AI分牌：使用简化的顺序分配策略。Input cards sample (original):", 
        allCardsInput[0] ? `${allCardsInput[0].value}_of_${allCardsInput[0].suit}` : "N/A"
    );

    // --- 使用之前被认为是性能瓶颈但逻辑上更可能产生合法解的组合搜索 ---
    // --- 如果这个版本仍然导致 stadium.js 错误，我们将再次简化回纯顺序分配来定位 ---
    let bestArrangement = null;
    let bestArrangementOverallScore = -Infinity; 

    const possibleBackHands = combinations(sortedOriginalCards, 5); // 使用已排序的原始结构卡片
    if (possibleBackHands.length === 0 && sortedOriginalCards.length > 0) { 
        console.error("未能生成后墩组合");
        return fallbackArrangement(allCardsInput); 
    } else if (possibleBackHands.length === 0 && sortedOriginalCards.length === 0) { 
        return null; 
    }

    for (const currentBackTry of possibleBackHands) {
        const evalBack = evaluateHandSimple(currentBackTry);
        const remainingAfterBack = removeSelectedCards(sortedOriginalCards, currentBackTry);
        if (remainingAfterBack.length !== 8) continue; 
        const possibleMiddleHands = combinations(remainingAfterBack, 5);
        if (possibleMiddleHands.length === 0 && remainingAfterBack.length > 0) continue; 

        for (const currentMiddleTry of possibleMiddleHands) {
            const evalMiddle = evaluateHandSimple(currentMiddleTry);
            if (compareHandsFrontend(evalMiddle, evalBack, "AI M-B") > 0) { continue; }
            const currentFrontTry = removeSelectedCards(remainingAfterBack, currentMiddleTry);
            if (currentFrontTry.length !== 3) continue; 
            const evalFront = evaluateHandSimple(currentFrontTry);
            if (compareHandsFrontend(evalFront, evalMiddle, "AI F-M") > 0) { continue; }
            
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
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand);
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand);
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand);
        console.log(`最终AI牌型: 前墩(${finalEvalF.name}), 中墩(${finalEvalM.name}), 后墩(${finalEvalB.name})`);
        if (!(compareHandsFrontend(finalEvalF, finalEvalM) <= 0 && compareHandsFrontend(finalEvalM, finalEvalB) <= 0)){
            console.error("警告：AI最终选择的牌型仍然倒水，将回退。", { F: finalEvalF, M: finalEvalM, B: finalEvalB});
            return fallbackArrangement(allCardsInput); // 如果最好的组合还是倒水，则回退
        }
        return bestArrangement;
    } else {
        console.warn("AI未能通过组合搜索找到理想解，回退到顺序分配。");
        return fallbackArrangement(allCardsInput); 
    }
}
