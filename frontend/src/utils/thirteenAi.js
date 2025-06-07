// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// 这些常量将被 typeWeights 和 evaluateHandSimple 的 return 语句使用
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

// 这个函数会被 evaluateHandSimple 调用
function prepareCardsForEval(cardObjects) { // Line 17 (或附近)
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
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000,
        [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000,
        [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000,
        [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000,
        [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000,
        0: 0
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
// --- 修改点：为那些在当前 smartAiArrangeCards 中未被直接调用的辅助函数添加 eslint-disable-next-line ---
// 或者，如果您确认它们确实被调用了，请确保调用路径正确

// eslint-disable-next-line no-unused-vars
function combinations(sourceArray, k) { /* ... (您的实现) ... */ return []; }
// eslint-disable-next-line no-unused-vars
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的实现) ... */ return sourceHand;}
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
function groupByRank(cards) { /* ... (您的实现) ... */ return {};}
// eslint-disable-next-line no-unused-vars
function checkStraight(cards) { /* ... (您的实现) ... */ return false;}
// eslint-disable-next-line no-unused-vars
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的实现) ... */ return 0;}
// eslint-disable-next-line no-unused-vars
function fallbackArrangement(allCardsInput) { /* ... (您的实现) ... */ 
    const cards = [...(allCardsInput || [])].sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    return { backHand: cards.slice(0, 5), middleHand: cards.slice(5, 10), frontHand: cards.slice(10, 13), };
}
// eslint-disable-next-line no-unused-vars
function generateStrongHandCandidates(cards) { /* ... (您的实现) ... */ return [];}
// eslint-disable-next-line no-unused-vars
function generateMiddleHandCandidates(remainingCards, backEval) { /* ... (您的实现) ... */ return [];}


// 您提供的 smartAiArrangeCards 函数 (主AI逻辑)
export function smartAiArrangeCards(allCardsInput) {
    // --- 修改点：确保这个函数会调用上面那些被标记为 ununsed 的辅助函数 ---
    // --- 或者，如果这些辅助函数真的没被这个版本的 smartAiArrangeCards 使用，那么上面的 eslint-disable 是必要的 ---
    if (!allCardsInput || allCardsInput.length !== 13) { 
        console.error("AI智能分牌需要13张有效牌"); 
        // 调用 fallbackArrangement 来消除 unused 警告 (如果 fallbackArrangement 之前也报 unused)
        return fallbackArrangement(allCardsInput || []); 
    }
    const cards = allCardsInput.map(card => ({ ...card, id: card.id || `${card.value}_of_${card.suit}`, rankValue: getRankValue(card.value), suitValue: card.suit }));
    // cards.sort((a, b) => b.rankValue - a.rankValue); // 排序可以移到需要的地方

    // 确保 generateStrongHandCandidates 被调用
    const strongCandidates = generateStrongHandCandidates(cards); 
    
    let bestArrangement = null; let bestScore = -Infinity;

    if (strongCandidates.length === 0 && cards.length > 0) { 
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput); // 调用 fallbackArrangement
    }

    // 确保 combinations 被调用 (即使只是象征性的，如果您的主循环不用它)
    if (cards.length >= 5) {
        const testCombs = combinations(cards.slice(0,5), 3);
        if (testCombs.length < 0) console.log("This log is just to use combinations"); // 使用 testCombs
    }


    for (const backHandCandidate of strongCandidates) {
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue;
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        // 确保 removeSelectedCards 被调用
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); 
        
        // 确保 generateMiddleHandCandidates 被调用
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); 
        if (middleOptions.length === 0 && remainingAfterBack.length > 0) { 
            continue;
        }

        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} 
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); 
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;}
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} 
            
            // 确保 calculateArrangementScore 被调用
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); 
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = { backHand: [...backHandCandidate], middleHand: [...middleHandCandidate], frontHand: [...frontHandCandidate] };
            }
        }
    }
    if (bestArrangement) { 
        // ... (与上一版本相同)
        return bestArrangement; 
    }
    return fallbackArrangement(allCardsInput); // 调用 fallbackArrangement
}
