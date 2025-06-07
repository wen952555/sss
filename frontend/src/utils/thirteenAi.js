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
function getRankValue(value) { /* ... (与之前无 ESLint 错误的版本一致) ... */ }
function prepareCardsForEval(cardObjects) { /* ... (与之前无 ESLint 错误的版本一致) ... */ }

// --- 修改点：确保这个函数被正确导出 ---
export function evaluateHandSimple(cardObjects) {
    // (这里的 evaluateHandSimple 函数体与上一次提供给您的、确认无 ESLint 错误且包含所有牌型判断的版本完全一致。
    //  它内部调用了 prepareCardsForEval，并返回包含 type_code, cards, name, primary_ranks, rank 的对象。
    //  为简洁起见，此处省略其具体实现，请使用您已有的那个完整版本。)
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) { return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] }; }
    const preparedCards = prepareCardsForEval(cardObjects); 
    if (!preparedCards || preparedCards.length === 0) { return { type_code: 0, cards: cardObjects, rank: 0, name: "预处理失败", primary_ranks: [] };}
    const ranks = preparedCards.map(c => c.rank); const suits = preparedCards.map(c => c.suit); const rankCounts = {}; ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1); const isFlush = new Set(suits).size === 1; let isStraight = false; const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b); let primaryRanksForCompare = [...ranks]; const typeWeights = { [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000, [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000, [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000, [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000, [HAND_TYPE_HIGH_CARD]: 10000, 0: 0 }; let straightHighRank = Math.max(...ranks); if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { const oR = ranks.filter(r=>r!==14&&r!==2).sort((a,b)=>a-b); if (oR.length===3&&oR[0]===3&&oR[1]===4&&oR[2]===5){ straightHighRank = 5;}} if (uniqueRanksSortedAsc.length >= cardObjects.length) { if (cardObjects.length === 5) { if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}} else if (cardObjects.length === 3) { if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}}}
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare }; const cV = Object.values(rankCounts); if (cV.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; } if (cV.includes(3) && cV.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; } if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; if (cV.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; } const nPs=cV.filter(c=>c===2).length; if (nPs===2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; } if (nPs===1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; } return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与之前无 ESLint 错误的版本一致) ... */ }

// --- 您提供的 AI 辅助函数 ---
// (确保这些函数定义完整，并且它们内部如果用到 HAND_TYPE_... 常量，也能访问到顶层定义)
// (如果这些函数在 smartAiArrangeCards 中确实未被调用，请为它们添加 // eslint-disable-next-line no-unused-vars)
function combinations(sourceArray, k) { /* ... (您的完整实现) ... */ return []; }
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的完整实现) ... */ return sourceHand;}
// ... (所有其他AI辅助函数：findStraightFlushes, groupByRank, checkStraight, etc.)

export function smartAiArrangeCards(allCardsInput) {
    // (这里的 smartAiArrangeCards 函数体与您上一次提供的版本一致，
    //  它应该会调用 evaluateHandSimple, compareHandsFrontend, 以及您提供的其他AI辅助函数。
    //  为简洁起见，此处省略其具体实现，请使用您已有的那个包含组合搜索的版本。)
    // ... (确保所有函数调用正确)
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { console.error("AI智能分牌需要13张有效牌"); return fallbackArrangement(allCardsInput || []); } const cards = allCardsInput.map(card => ({ ...card, id: card.id || `${card.value}_of_${card.suit}`, rankValue: getRankValue(card.value), suitValue: card.suit })); const strongCandidates = generateStrongHandCandidates(cards); let bestArrangement = null; let bestScore = -Infinity; if (strongCandidates.length === 0 && cards.length > 0) { console.warn("智能AI：未能生成强后墩候选，回退。"); return fallbackArrangement(allCardsInput); } for (const backHandCandidate of strongCandidates) { if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue; const backEvaluation = evaluateHandSimple(backHandCandidate); const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); if (middleOptions.length === 0 && remainingAfterBack.length >= 5) { const fB = [...remainingAfterBack].sort((a,b)=>getRankValue(b.value)-getRankValue(a.value)).slice(0,5); if (fB.length === 5) middleOptions.push(fB); if (middleOptions.length === 0) continue; } for (const middleHandCandidate of middleOptions) { if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue; const middleEvaluation = evaluateHandSimple(middleHandCandidate); if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;} const frontEvaluation = evaluateHandSimple(frontHandCandidate); if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); if (arrangementScore > bestScore) { bestScore = arrangementScore; bestArrangement = { backHand: backHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), middleHand: middleHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), frontHand: frontHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })) }; } } } if (bestArrangement) { console.log("AI智能分牌完成。"); const finalEvalB = evaluateHandSimple(bestArrangement.backHand); const finalEvalM = evaluateHandSimple(bestArrangement.middleHand); const finalEvalF = evaluateHandSimple(bestArrangement.frontHand); if(compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0){console.warn("AI智能分牌最终结果仍疑似倒水，回退。",{F:finalEvalF.name,M:finalEvalM.name,B:finalEvalB.name}); return fallbackArrangement(allCardsInput);} return bestArrangement; } console.warn("AI智能分牌未找到理想解，使用回退方案"); return fallbackArrangement(allCardsInput);
}

// 确保 fallbackArrangement 也被定义 (如果 smartAiArrangeCards 中有调用它的路径)
function fallbackArrangement(allCardsInput) { /* ... (您的实现) ... */ }
function generateStrongHandCandidates(cards) { /* ... (您的实现) ... */ return [];} // 这些也需要完整定义
function generateMiddleHandCandidates(remainingCards, backEval) { /* ... (您的实现) ... */ return [];}
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的实现) ... */ return 0;}
