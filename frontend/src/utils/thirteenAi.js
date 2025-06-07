// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (与上一版本相同，确保 evaluateHandSimple 返回正确的 primary_ranks) ---
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1; /* ... */ // (所有牌型常量)
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { 
    // ... (与上一版本 evaluateHandSimple 完整代码一致, 确保 primary_ranks 生成正确)
    // 例如，对于乌龙牌，primary_ranks 应该是按点数降序排列的5张或3张牌的 rank 数组
    // 对于对子，应该是 [对子点数, kicker1, kicker2, ...]
    // 请仔细回顾和确认这部分的逻辑是否完全符合十三水比较规则
    // ... (为了简洁，此处省略了 evaluateHandSimple 的完整实现，请以上一个回复中的为准)
    // 确保所有路径都返回 primary_ranks
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
    let primaryRanksForCompare = [...ranks]; // Default for high card / flush
    const typeWeights = { /* ... */ };
    let straightHighRank = Math.max(...ranks); 
    if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { 
        const otherRanks = ranks.filter(r => r !== 14 && r !== 2).sort((a,b)=>a-b);
        if (otherRanks.length === 3 && otherRanks[0] === 3 && otherRanks[1] === 4 && otherRanks[2] === 5) {
             straightHighRank = 5;
        }
    }
    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') { isStraight = true; primaryRanksForCompare = [5,4,3,2,1]; } 
            else if (uniqueRanksSortedAsc.length === 5 && uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4) { isStraight = true; primaryRanksForCompare = [ranks[0]]; }
        } else if (cardObjects.length === 3) { 
            if (uniqueRanksSortedAsc.length === 3 && uniqueRanksSortedAsc.join(',') === '2,3,14') { isStraight = true; straightHighRank = 3; primaryRanksForCompare = [3,2,1];} 
            else if (uniqueRanksSortedAsc.length === 3 && uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2) {isStraight = true; primaryRanksForCompare = [ranks[0]];}
        }
    }
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    const countsValues = Object.values(rankCounts);
    if (countsValues.includes(4)) { const qR = Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_ = ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; }
    if (countsValues.includes(3) && countsValues.includes(2)) { const tR = Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR = Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks };
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare };
    if (countsValues.includes(3)) { const tR = Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_ = ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; }
    const numPs = countsValues.filter(c=>c===2).length;
    if (numPs === 2) { const pRs = Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_ = ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; }
    if (numPs === 1) { const pR = Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_ = ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; }
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
 }


export function compareHandsFrontend(eval1, eval2, context = "") { // 添加 context 用于日志
    if (!eval1 || !eval2) {
        console.error(`Compare Error in ${context}: One or both evals are undefined. Eval1:`, eval1, "Eval2:", eval2);
        return 0; 
    }

    // --- 修改点：添加详细日志 ---
    // console.log(`Comparing (${context}):`);
    // console.log(`Hand 1 (${eval1.name}): type=${eval1.type_code}, ranks=${JSON.stringify(eval1.primary_ranks)}`, eval1.cards.map(c=>c.id));
    // console.log(`Hand 2 (${eval2.name}): type=${eval2.type_code}, ranks=${JSON.stringify(eval2.primary_ranks)}`, eval2.cards.map(c=>c.id));

    if (eval1.type_code > eval2.type_code) {
        // console.log(`Result (${context}): Hand 1 wins by type_code`);
        return 1;
    }
    if (eval1.type_code < eval2.type_code) {
        // console.log(`Result (${context}): Hand 2 wins by type_code`);
        return -1;
    }

    // Type codes are equal, compare primary_ranks
    if (eval1.primary_ranks && eval2.primary_ranks) {
        for (let i = 0; i < Math.min(eval1.primary_ranks.length, eval2.primary_ranks.length); i++) {
            if (eval1.primary_ranks[i] > eval2.primary_ranks[i]) {
                // console.log(`Result (${context}): Hand 1 wins at primary_ranks[${i}] (${eval1.primary_ranks[i]} vs ${eval2.primary_ranks[i]})`);
                return 1;
            }
            if (eval1.primary_ranks[i] < eval2.primary_ranks[i]) {
                // console.log(`Result (${context}): Hand 2 wins at primary_ranks[${i}] (${eval1.primary_ranks[i]} vs ${eval2.primary_ranks[i]})`);
                return -1;
            }
        }
        // If all compared primary_ranks are equal, check length (e.g. two pair with same pairs but different kicker count - though should be same length)
        // For thirteen water, usually primary_ranks should be same length for same type or one is clearly a subset.
        // If primary_ranks are exhausted and equal, hands are considered equal.
    } else {
        // Fallback if primary_ranks are missing, though they shouldn't be
        console.warn(`Missing primary_ranks in comparison (${context})`, {eval1, eval2});
    }
    // console.log(`Result (${context}): Hands are equal`);
    return 0; 
}

function shuffleArray(array) { /* ... (与上一版本相同) ... */ }

export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    const allCardsOriginal = allCardsInput.map(c => ({ ...c }));

    let bestArrangement = null;
    let bestArrangementOverallScore = -Infinity;
    const MAX_ATTEMPTS = 100; // 保持尝试次数

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const currentHandAttempt = (attempt === 0) ?
            [...allCardsOriginal].sort((a, b) => getRankValue(b.value) - getRankValue(a.value))
            : shuffleArray(allCardsOriginal);

        const tempBack = currentHandAttempt.slice(0, 5);
        const tempMiddle = currentHandAttempt.slice(5, 10);
        const tempFront = currentHandAttempt.slice(10, 13);

        if (tempFront.length !== 3 || tempMiddle.length !== 5 || tempBack.length !== 5) {
            console.error("AI: Slicing error in attempt", attempt);
            continue; 
        }

        const evalBack = evaluateHandSimple(tempBack);
        const evalMiddle = evaluateHandSimple(tempMiddle);
        const evalFront = evaluateHandSimple(tempFront);

        // --- 修改点：在比较前打印详细评估结果 ---
        if (attempt < 5 || attempt === MAX_ATTEMPTS -1 ) { //只打印前几次和最后一次尝试的细节，避免过多日志
            console.log(`AI Attempt ${attempt}:`);
            console.log("  Front Eval:", JSON.parse(JSON.stringify({name: evalFront.name, type:evalFront.type_code, ranks:evalFront.primary_ranks, cards: evalFront.cards.map(c=>c.id) })));
            console.log("  Middle Eval:", JSON.parse(JSON.stringify({name: evalMiddle.name, type:evalMiddle.type_code, ranks:evalMiddle.primary_ranks, cards: evalMiddle.cards.map(c=>c.id) })));
            console.log("  Back Eval:", JSON.parse(JSON.stringify({name: evalBack.name, type:evalBack.type_code, ranks:evalBack.primary_ranks, cards: evalBack.cards.map(c=>c.id) })));
        }


        const frontToMiddleComparison = compareHandsFrontend(evalFront, evalMiddle, `Attempt ${attempt} F-M`);
        const middleToBackComparison = compareHandsFrontend(evalMiddle, evalBack, `Attempt ${attempt} M-B`);

        if (frontToMiddleComparison <= 0 && middleToBackComparison <= 0) {
            const currentScore = evalBack.rank * 1000000 + evalMiddle.rank * 1000 + evalFront.rank;
            if (currentScore > bestArrangementOverallScore) {
                bestArrangementOverallScore = currentScore;
                bestArrangement = {
                    frontHand: tempFront,
                    middleHand: tempMiddle,
                    backHand: tempBack,
                };
                 console.log(`AI Attempt ${attempt}: New best legal arrangement! Score: ${bestArrangementOverallScore}. F:${evalFront.name}, M:${evalMiddle.name}, B:${evalBack.name}`);
            }
        } else if (attempt === 0) { // 如果第一次（顺序分配）就失败，则特别打印
             console.error(
                `AI首次顺序分配不符合规则: 
                Front (${evalFront.name}) vs Middle (${evalMiddle.name}): ${frontToMiddleComparison > 0 ? '倒水' : 'OK'}, 
                Middle (${evalMiddle.name}) vs Back (${evalBack.name}): ${middleToBackComparison > 0 ? '倒水' : 'OK'}`
            );
        }
    } 

    if (bestArrangement) {
        console.log("AI分牌完成 (通过启发式尝试).");
        // ... (日志)
        return bestArrangement;
    } else {
        console.warn("AI在多次尝试后未能找到任何合法解，回退到纯顺序分配。");
        // ... (fallbackArrangement 逻辑与上一版本相同)
        const cardsWithRank = allCardsInput.map(c => ({...c, rankForSort: getRankValue(c.value) }));
        cardsWithRank.sort((a, b) => b.rankForSort - a.rankForSort);
        const sortedOriginalCards = cardsWithRank.map(c => { const { rankForSort, ...originalCard } = c; return originalCard; });
        return { backHand: sortedOriginalCards.slice(0, 5), middleHand: sortedOriginalCards.slice(5, 10), frontHand: sortedOriginalCards.slice(10, 13), };
    }
}

function fallbackArrangement(allCardsInput) { /* ... (与上一版本相同) ... */ }
