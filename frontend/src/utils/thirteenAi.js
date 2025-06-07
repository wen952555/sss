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

export function evaluateHandSimple(cardObjects) {
    // (这里的 evaluateHandSimple 函数体与上一次提供给您的、确认无 ESLint 错误的版本完全一致。
    //  它内部调用了 prepareCardsForEval，并返回包含 type_code, cards, name, primary_ranks, rank 的对象。
    //  为简洁起见，此处省略其具体实现，请确保您使用的是那个完整版本，并且没有变量名为 eval。)
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) { return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] }; }
    const preparedCards = prepareCardsForEval(cardObjects); 
    if (!preparedCards || preparedCards.length === 0) { return { type_code: 0, cards: cardObjects, rank: 0, name: "预处理失败", primary_ranks: [] };}
    const ranks = preparedCards.map(c => c.rank); const suits = preparedCards.map(c => c.suit); const rankCounts = {}; ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1); const isFlush = new Set(suits).size === 1; let isStraight = false; const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b); let primaryRanksForCompare = [...ranks]; const typeWeights = { [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000, [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000, [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000, [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000, [HAND_TYPE_HIGH_CARD]: 10000, 0: 0 }; let straightHighRank = Math.max(...ranks); if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { const oR = ranks.filter(r=>r!==14&&r!==2).sort((a,b)=>a-b); if (oR.length===3&&oR[0]===3&&oR[1]===4&&oR[2]===5){ straightHighRank = 5;}} if (uniqueRanksSortedAsc.length >= cardObjects.length) { if (cardObjects.length === 5) { if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}} else if (cardObjects.length === 3) { if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}}}
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare }; const cV = Object.values(rankCounts); if (cV.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; } if (cV.includes(3) && cV.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; } if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; if (cV.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; } const nPs=cV.filter(c=>c===2).length; if (nPs===2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; } if (nPs===1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; } return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与上一版本相同) ... */ }

// --- 修改点：确保 smartAiArrangeCards 和其辅助函数中没有变量名为 eval ---
// (以下是您上次提供的 smartAiArrangeCards 及其辅助函数的结构，我将检查并确保没有 eval 变量)

function combinations(sourceArray, k) { /* ... (您提供的版本) ... */ }
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您提供的版本) ... */ }
function findStraightFlushes(cards) { /* ... (您提供的版本) ... */ }
function findFourOfAKind(cards) { /* ... (您提供的版本) ... */ }
function findFullHouses(cards) { /* ... (您提供的版本) ... */ }
function findFlushes(cards) { /* ... (您提供的版本) ... */ }
function findStraights(cards) { /* ... (您提供的版本) ... */ }
function findSimilarTypeHands(cards, targetType) { /* ... (您提供的版本) ... */ }
function groupByRank(cards) { /* ... (您提供的版本) ... */ }
function checkStraight(cards) { /* ... (您提供的版本) ... */ }
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您提供的版本, 确保参数名不是 eval) ... */ }
function fallbackArrangement(allCardsInput) { /* ... (您提供的版本) ... */ }


// 智能分牌主函数 (确保这里面没有变量叫 eval)
export function smartAiArrangeCards(allCardsInput) {
    if (!allCardsInput || allCardsInput.length !== 13) { // 添加了对 allCardsInput 的检查
        console.error("AI智能分牌需要13张有效牌");
        return fallbackArrangement(allCardsInput || []); // 如果 allCardsInput 是 undefined，传空数组给 fallback
    }

    const cards = allCardsInput.map(card => ({
        ...card,
        id: card.id || `${card.value}_of_${card.suit}`, // 确保有 id
        rankValue: getRankValue(card.value),
        suitValue: card.suit 
    }));

    cards.sort((a, b) => b.rankValue - a.rankValue);

    const strongCandidates = generateStrongHandCandidates(cards);
    
    let bestArrangement = null;
    let bestScore = -Infinity;
    
    for (const backHandCandidate of strongCandidates) { // 修改变量名以避免与内部的 backHand 冲突
        if (backHandCandidate.length !== 5) continue;
        
        const backEvaluation = evaluateHandSimple(backHandCandidate); // 使用 evaluationResult, handEval 等
        const remainingAfterBack = cards.filter(c => !backHandCandidate.find(bc => bc.id === c.id));
        
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation);
        
        for (const middleHandCandidate of middleOptions) {
            if (middleHandCandidate.length !== 5) continue;
            
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            // --- 修改点：确保比较函数的调用正确，且参数是评估结果 ---
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) continue; // back < middle (倒水)
            
            const frontHandCandidate = remainingAfterBack.filter(c => !middleHandCandidate.find(mc => mc.id === c.id));
            if (frontHandCandidate.length !== 3) continue;
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
             // --- 修改点：确保比较函数的调用正确 ---
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) continue; // middle < front (倒水)
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation);
            
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = {
                    backHand: [...backHandCandidate],    // 使用候选变量名
                    middleHand: [...middleHandCandidate],  // 使用候选变量名
                    frontHand: [...frontHandCandidate]   // 使用候选变量名
                };
            }
        }
    }
    
    if (bestArrangement) {
        console.log("AI智能分牌完成");
        // 在返回前，最后确认一次墩序，以防评分与比较规则有细微差别
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand);
        const finalEvalM = evaluateHandSimple(bestArrangement.middleHand);
        const finalEvalF = evaluateHandSimple(bestArrangement.frontHand);
        if (compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0) {
            console.warn("AI智能分牌最终结果仍疑似倒水，回退。FB:", finalEvalF, "FM:", finalEvalM, "MB:", finalEvalB);
            return fallbackArrangement(allCardsInput);
        }
        return bestArrangement;
    }
    
    console.warn("AI智能分牌未找到理想解，使用回退方案");
    return fallbackArrangement(allCardsInput);
}

// 生成强牌型候选（后墩）- (确保这里面没有变量叫 eval)
function generateStrongHandCandidates(cards) { /* ... (您提供的版本，仔细检查内部变量名) ... */ }
// 生成中墩候选（确保≤后墩）- (确保这里面没有变量叫 eval)
function generateMiddleHandCandidates(remainingCards, backEvaluation) { /* ... (您提供的版本，参数名 backEval 没问题) ... */ }
