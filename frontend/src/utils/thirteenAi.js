// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// 这些常量定义在文件的顶层作用域，后续函数应该都能访问到
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
        rank: getRankValue(c.value), // 使用 getRankValue
        // rankValue 属性如果原始对象有，会被保留；这里我们用 rank 作为内部计算的牌点
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

    const ranks = preparedCards.map(c => c.rank);
    const suits = preparedCards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    let primaryRanksForCompare = [...ranks];
    
    const typeWeights = {
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
// (确保这些函数定义完整，并且它们内部如果用到 HAND_TYPE_... 常量，也能访问到顶层定义)
function combinations(sourceArray, k) { /* ... (您的完整实现) ... */ return []; }
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的完整实现) ... */ return sourceHand;}
function groupByRank(cards) { /* ... (您的完整实现) ... */ return {};}
function checkStraight(cards) { /* ... (您的完整实现) ... */ return false;}
function findStraightFlushes(cards) { /* ... (您的完整实现) ... */ return [];}
function findFourOfAKind(cards) { /* ... (您的完整实现) ... */ return [];}
function findFullHouses(cards) { /* ... (您的完整实现) ... */ return [];}
function findFlushes(cards) { /* ... (您的完整实现) ... */ return [];}
function findStraights(cards) { /* ... (您的完整实现) ... */ return [];}

function findSimilarTypeHands(cards, targetType) { // 这个函数会调用上面的 find... 函数
    switch (targetType) {
        case HAND_TYPE_STRAIGHT_FLUSH: return findStraightFlushes(cards);
        case HAND_TYPE_FOUR_OF_A_KIND: return findFourOfAKind(cards);
        case HAND_TYPE_FULL_HOUSE: return findFullHouses(cards);
        case HAND_TYPE_FLUSH: return findFlushes(cards); // 确保 HAND_TYPE_FLUSH 能访问到
        case HAND_TYPE_STRAIGHT: return findStraights(cards);
        default: return [];
    }
}

function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的完整实现) ... */ return 0; }

function fallbackArrangement(allCardsInput) {
    if (!allCardsInput || !Array.isArray(allCardsInput)) {
        return { backHand: [], middleHand: [], frontHand: [] };
    }
    const cards = [...allCardsInput].map(c => ({...c, id: c.id || `${c.value}_of_${c.suit}`})).sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    return {
        backHand: cards.slice(0, 5),
        middleHand: cards.slice(5, 10),
        frontHand: cards.slice(10, 13),
    };
}

function generateStrongHandCandidates(cards) {
    // (这个函数会调用 find... 系列函数，请确保您的实现是完整的)
    /* ... (您的完整实现) ... */ 
    // 确保至少返回一个高牌候选，以避免空数组导致后续错误
    const results = [];
    // (添加您查找各种强牌型的逻辑，并将结果（5张牌的数组）push到results)
    // 例如: findFlushes(cards).forEach(hand => results.push(hand));
    if (cards.length >= 5) {
        results.push([...cards].sort((a,b)=> getRankValue(b.value) - getRankValue(a.value)).slice(0,5));
    }
    return results.filter(hand => hand && hand.length === 5); // 确保返回的是有效5张牌组
}

function generateMiddleHandCandidates(remainingCards, backEval) {
    // (这个函数会调用 findSimilarTypeHands，请确保您的实现是完整的)
    /* ... (您的完整实现) ... */
    const results = [];
    // (添加您查找中墩牌型的逻辑)
    // 例如: findSimilarTypeHands(remainingCards, HAND_TYPE_FLUSH).forEach(hand => results.push(hand));
    if (remainingCards.length >= 5) {
        results.push([...remainingCards].sort((a,b)=> getRankValue(b.value) - getRankValue(a.value)).slice(0,5));
    }
    return results.filter(hand => hand && hand.length === 5);
}


// 您提供的 smartAiArrangeCards 函数
export function smartAiArrangeCards(allCardsInput) {
    if (!allCardsInput || allCardsInput.length !== 13) { 
        console.error("AI智能分牌需要13张有效牌"); 
        return fallbackArrangement(allCardsInput || []); 
    }
    const cards = allCardsInput.map(card => ({ 
        ...card, 
        id: card.id || `${card.value}_of_${card.suit}`, 
        // 使用 prepareCardsForEval 或 getRankValue 来获取用于AI内部计算的牌点
        rankValue: getRankValue(card.value), // 确保 rankValue 存在
        suitValue: card.suit 
    }));
    // cards.sort((a, b) => b.rankValue - a.rankValue); // 排序可以根据策略需要

    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null; 
    let bestScore = -Infinity;

    if (strongCandidates.length === 0 && cards.length > 0) { 
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput); 
    }

    for (const backHandCandidate of strongCandidates) {
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue;
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); // 使用了
        
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); // 使用了
        if (middleOptions.length === 0 && remainingAfterBack.length >= 5) { // 改为 >=5
             // 如果没有合适的中墩候选，但牌还够，可以尝试一个高牌中墩
             const fallbackMiddle = [...remainingAfterBack].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5);
             if (fallbackMiddle.length === 5) middleOptions.push(fallbackMiddle);
             if (middleOptions.length === 0) continue; // 如果仍然没有，则跳过此后墩候选
        }


        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} 
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); 
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;}
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} 
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); // 使用了
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = { 
                    backHand: backHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), 
                    middleHand: middleHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), 
                    frontHand: frontHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c }))
                };
            }
        }
    }
    if (bestArrangement) { 
        console.log("AI智能分牌完成。"); 
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand); 
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand); 
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand); 
        if(compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0){
            console.warn("AI智能分牌最终结果仍疑似倒水，回退。",{F:finalEvalF.name,M:finalEvalM.name,B:finalEvalB.name}); 
            return fallbackArrangement(allCardsInput);
        } 
        return bestArrangement; 
    }
    console.warn("AI智能分牌未找到理想解，使用回退方案"); 
    return fallbackArrangement(allCardsInput);
}
