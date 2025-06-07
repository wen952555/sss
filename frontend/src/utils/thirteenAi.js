// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
const HAND_TYPE_HIGH_CARD = 1;
const HAND_TYPE_PAIR = 2;
const HAND_TYPE_TWO_PAIR = 3;
const HAND_TYPE_THREE_OF_A_KIND = 4;
const HAND_TYPE_STRAIGHT = 5;
const HAND_TYPE_FLUSH = 6;
const HAND_TYPE_FULL_HOUSE = 7;
const HAND_TYPE_FOUR_OF_A_KIND = 8;
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

// evaluateHandSimple (确保这个函数被正确导出并在 GameBoard.js 中作为 evaluateHandSimpleFrontend 使用)
export function evaluateHandSimple(cardObjects) {
    // (与上一个无 ESLint 错误版本完全一致，包含所有牌型判断和返回 primary_ranks)
    // ... (为简洁，此处省略其完整实现，请使用您已有的正确版本)
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) { return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] }; }
    const preparedCards = prepareCardsForEval(cardObjects); 
    if (!preparedCards || preparedCards.length === 0) { return { type_code: 0, cards: cardObjects, rank: 0, name: "预处理失败", primary_ranks: [] };}
    const ranks = preparedCards.map(c => c.rank); const suits = preparedCards.map(c => c.suit); const rankCounts = {}; ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1); const isFlush = new Set(suits).size === 1; let isStraight = false; const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b); let primaryRanksForCompare = [...ranks]; const typeWeights = { [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000, [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000, [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000, [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000, [HAND_TYPE_HIGH_CARD]: 10000, 0: 0 }; let straightHighRank = Math.max(...ranks); if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { const oR = ranks.filter(r=>r!==14&&r!==2).sort((a,b)=>a-b); if (oR.length===3&&oR[0]===3&&oR[1]===4&&oR[2]===5){ straightHighRank = 5;}} if (uniqueRanksSortedAsc.length >= cardObjects.length) { if (cardObjects.length === 5) { if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}} else if (cardObjects.length === 3) { if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}}}
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare }; const cV = Object.values(rankCounts); if (cV.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; } if (cV.includes(3) && cV.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; } if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; if (cV.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; } const nPs=cV.filter(c=>c===2).length; if (nPs===2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; } if (nPs===1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; } return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

// compareHandsFrontend (确保这个函数被正确导出并在 GameBoard.js 中使用)
export function compareHandsFrontend(eval1, eval2, context = "") {
    if (!eval1 || !eval2) { return 0; }
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

// --- 粘贴您提供的所有 smartAiArrangeCards 的辅助函数到这里 ---
// 例如：combinations, removeSelectedCards, findStraightFlushes, findFourOfAKind, 
// findFullHouses, findFlushes, findStraights, findSimilarTypeHands, 
// groupByRank, checkStraight, calculateArrangementScore, fallbackArrangement
// ... (确保这些函数定义都在这里，并且它们之间互相调用是正确的)

// 示例：确保这些函数都被定义了
function combinations(sourceArray, k) { /* ... (您的实现) ... */ return []; } // 必须有实现
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的实现) ... */ return sourceHand;} // 必须有实现
function findStraightFlushes(cards) { /* ... (您的实现) ... */ return [];}
function findFourOfAKind(cards) { /* ... (您的实现) ... */ return [];}
function findFullHouses(cards) { /* ... (您的实现) ... */ return [];}
function findFlushes(cards) { /* ... (您的实现) ... */ return [];}
function findStraights(cards) { /* ... (您的实现) ... */ return [];}
function findSimilarTypeHands(cards, targetType) { /* ... (您的实现) ... */ return [];}
function groupByRank(cards) { /* ... (您的实现) ... */ return {};}
function checkStraight(cards) { /* ... (您的实现) ... */ return false;}
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的实现) ... */ return 0;}
function fallbackArrangement(allCardsInput) { /* ... (您的实现，确保它返回 {frontHand, middleHand, backHand}) ... */ 
    const cards = [...(allCardsInput || [])].sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    return {
        backHand: cards.slice(0, 5),
        middleHand: cards.slice(5, 10),
        frontHand: cards.slice(10, 13),
    };
}
function generateStrongHandCandidates(cards) { /* ... (您的实现) ... */ return [];}
function generateMiddleHandCandidates(remainingCards, backEval) { /* ... (您的实现) ... */ return [];}


// 您提供的 smartAiArrangeCards 函数 (确保它调用了上面定义的辅助函数)
// --- 修改点：重命名为 smartAiArrangeCardsInternal，并创建一个导出的包装器 ---
function smartAiArrangeCardsInternal(allCardsInput) {
    if (!allCardsInput || allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return fallbackArrangement(allCardsInput || []); // 确保 fallback 有输入
    }

    const cards = allCardsInput.map(card => ({
        ...card,
        id: card.id || `${card.value}_of_${card.suit}`,
        rankValue: getRankValue(card.value),
        suitValue: card.suit 
    }));
    cards.sort((a, b) => b.rankValue - a.rankValue);

    const strongCandidates = generateStrongHandCandidates(cards); // 调用
    
    let bestArrangement = null;
    let bestScore = -Infinity;
    
    for (const backHandCandidate of strongCandidates) {
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue; // 增加校验
        
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); // 调用
        
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); // 调用
        
        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) continue; // back < middle 是倒水
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); // 调用
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) continue;
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) continue; // middle < front 是倒水
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); // 调用
            
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = {
                    backHand: [...backHandCandidate],   
                    middleHand: [...middleHandCandidate], 
                    frontHand: [...frontHandCandidate]   
                };
            }
        }
    }
    
    if (bestArrangement) {
        console.log("AI智能分牌完成");
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand);
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand);
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand);
        if (compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0) {
            console.warn("AI智能分牌最终结果仍疑似倒水，回退。", { F: finalEvalF.name, M: finalEvalM.name, B: finalEvalB.name});
            return fallbackArrangement(allCardsInput);
        }
        return bestArrangement;
    }
    
    console.warn("AI智能分牌未找到理想解，使用回退方案");
    return fallbackArrangement(allCardsInput);
}

// 导出的函数，最终被 GameBoard.js 使用
export const smartAiArrangeCards = smartAiArrangeCardsInternal;

// 同时保留 simpleAiArrangeCards (之前的简化版AI) 以便测试或回退，但确保它不与 smartAiArrangeCards 冲突
// 如果 GameBoard.js 只导入 smartAiArrangeCards，这个可以注释掉或删除
export function simpleAiArrangeCards(allCardsInput) {
    console.log("Using fallback simpleAi (순서대로).");
    return fallbackArrangement(allCardsInput || []);
}
