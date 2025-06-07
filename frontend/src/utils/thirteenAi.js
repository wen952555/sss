// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// --- 修改点：为所有 HAND_TYPE 常量添加 eslint-disable-next-line ---
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

// --- 修改点：为 prepareCardsForEval 添加 eslint-disable-next-line ---
// eslint-disable-next-line no-unused-vars
function prepareCardsForEval(cardObjects) { // Line 16 (或附近)
    if (!cardObjects || cardObjects.length === 0) return [];
    const cards = cardObjects.map(c => ({
        ...c,
        rank: getRankValue(c.value),
    }));
    cards.sort((a, b) => b.rank - a.rank);
    return cards;
}

// 确保此函数被导出，并且内部调用了 prepareCardsForEval
export function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] };
    }
    
    const preparedCards = prepareCardsForEval(cardObjects); // 调用 prepareCardsForEval
    
    if (!preparedCards || preparedCards.length === 0) { 
         return { type_code: 0, cards: cardObjects, rank: 0, name: "预处理失败", primary_ranks: [] };
    }

    const ranks = preparedCards.map(c => c.rank); // 使用 preparedCards
    const suits = preparedCards.map(c => c.suit); // 使用 preparedCards
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    let primaryRanksForCompare = [...ranks]; 
    
    const typeWeights = { // 所有 HAND_TYPE 常量在这里被用作键
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000, 0: 0
    };
    
    let straightHighRank = Math.max(...ranks); 
    if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { 
        const otherRanks = ranks.filter(r => r !== 14 && r !== 2).sort((a,b)=>a-b);
        if (otherRanks.length === 3 && otherRanks[0] === 3 && otherRanks[1] === 4 && otherRanks[2] === 5) {
             straightHighRank = 5;
        }
    }

    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} 
            else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}
        } else if (cardObjects.length === 3) { 
            if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} 
            else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}
        }
    }
    
    // 所有 HAND_TYPE 常量在以下 return 语句中被用作 type_code 的值
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    const countsValues = Object.values(rankCounts);
    if (countsValues.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; }
    if (countsValues.includes(3) && countsValues.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks };
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare };
    if (countsValues.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; }
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; }
    if (numPairs === 1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; }
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与上一版本相同) ... */ }

// --- 您提供的 AI 辅助函数 ---
// --- 修改点：为所有未在 smartAiArrangeCards 中被直接或明确间接调用的辅助函数添加 eslint-disable-next-line ---
// (您需要根据您 smartAiArrangeCards 的最终逻辑，决定哪些函数确实未被使用)

// eslint-disable-next-line no-unused-vars
function combinations(sourceArray, k) { /* ... (您的实现) ... */ return []; }
// eslint-disable-next-line no-unused-vars
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的实现) ... */ return sourceHand;}
// eslint-disable-next-line no-unused-vars
function groupByRank(cards) { /* ... (您的实现) ... */ return {};}
// eslint-disable-next-line no-unused-vars
function checkStraight(cards) { /* ... (您的实现) ... */ return false;}
// eslint-disable-next-line no-unused-vars
function findStraightFlushes(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function findFourOfAKind(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function findFullHouses(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function findFlushes(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function findStraights(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function findSimilarTypeHands(cards, targetType) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的实现) ... */ return 0;}
// eslint-disable-next-line no-unused-vars
function fallbackArrangement(allCardsInput) { /* ... (您的实现，确保返回正确结构) ... */ }
// eslint-disable-next-line no-unused-vars
function generateStrongHandCandidates(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function generateMiddleHandCandidates(remainingCards, backEval) { /* ... (您的实现，确保返回数组) ... */ return [];}


// 您提供的 smartAiArrangeCards 函数
export function smartAiArrangeCards(allCardsInput) {
    // (这里的 smartAiArrangeCards 函数体与您上一次提供的版本一致。
    //  它应该会调用 evaluateHandSimple, compareHandsFrontend, 
    //  以及您定义的其他AI辅助函数。
    //  请确保您使用的是您自己编写的、希望运行的完整AI逻辑。)
    // ... (为简洁，此处省略其具体实现，请使用您已有的那个包含组合搜索的版本)
    // ... (确保这个函数内部确实调用了它所依赖的所有辅助函数)
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { console.error("AI智能分牌需要13张有效牌"); return fallbackArrangement(allCardsInput || []); } const cards = allCardsInput.map(card => ({ ...card, id: card.id || `${card.value}_of_${card.suit}`, rankValue: getRankValue(card.value), suitValue: card.suit })); const strongCandidates = generateStrongHandCandidates(cards); let bestArrangement = null; let bestScore = -Infinity; if (strongCandidates.length === 0 && cards.length > 0) { console.warn("智能AI：未能生成强后墩候选，回退。"); return fallbackArrangement(allCardsInput); } for (const backHandCandidate of strongCandidates) { if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue; const backEvaluation = evaluateHandSimple(backHandCandidate); const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); if (middleOptions.length === 0 && remainingAfterBack.length >= 5) { const fB = [...remainingAfterBack].sort((a,b)=>getRankValue(b.value)-getRankValue(a.value)).slice(0,5); if (fB.length === 5) middleOptions.push(fB); if (middleOptions.length === 0) continue; } for (const middleHandCandidate of middleOptions) { if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue; const middleEvaluation = evaluateHandSimple(middleHandCandidate); if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;} const frontEvaluation = evaluateHandSimple(frontHandCandidate); if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); if (arrangementScore > bestScore) { bestScore = arrangementScore; bestArrangement = { backHand: backHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), middleHand: middleHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), frontHand: frontHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })) }; } } } if (bestArrangement) { console.log("AI智能分牌完成。"); const finalEvalB = evaluateHandSimple(bestArrangement.backHand); const finalEvalM = evaluateHandSimple(bestArrangement.middleHand); const finalEvalF = evaluateHandSimple(bestArrangement.frontHand); if(compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0){console.warn("AI智能分牌最终结果仍疑似倒水，回退。",{F:finalEvalF.name,M:finalEvalM.name,B:finalEvalB.name}); return fallbackArrangement(allCardsInput);} return bestArrangement; } console.warn("AI智能分牌未找到理想解，使用回退方案"); return fallbackArrangement(allCardsInput);
}
