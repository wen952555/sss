// frontend/src/utils/thirteenAi.js

// --- 牌型代码 和 基础辅助函数 (与上一版本相同) ---
const HAND_TYPE_HIGH_CARD = 1; /* ... */
function getRankValue(value) { /* ... */ }
function prepareCardsForEval(cardObjects) { /* ... */ }
export function evaluateHandSimple(cardObjects) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }
export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与上一版本能通过ESLint的版本一致) ... */ }

// --- AI 辅助函数 ---
function combinations(sourceArray, k) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }
function removeSelectedCards(sourceHand, selectedCards) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }
function groupByRank(cards) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }
function checkStraight(cards) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (与上一版本能通过ESLint的版本一致) ... */ }

// --- 修改点：为牌型查找函数提供更健壮的占位实现或基础实现 ---
function findStraightFlushes(cards) { 
    // console.log("AI: findStraightFlushes called with", cards.length, "cards");
    // 实际应实现同花顺查找逻辑
    return []; // 暂时返回空，依赖后续的高牌
}
function findFourOfAKind(cards) { 
    // console.log("AI: findFourOfAKind called");
    // 实际应实现铁支查找逻辑
    const groups = groupByRank(cards);
    const fours = Object.values(groups).find(group => group.length === 4);
    if (fours) {
        const kicker = cards.filter(c => !fours.find(fc => fc.id === c.id))
                            .sort((a,b) => b.rankValue - a.rankValue)[0];
        return kicker ? [[...fours, kicker]] : []; // 返回一个包含一个组合的数组
    }
    return [];
}
function findFullHouses(cards) { 
    // console.log("AI: findFullHouses called");
    // 实际应实现葫芦查找逻辑
    const groups = groupByRank(cards);
    const threes = Object.values(groups).find(group => group.length === 3);
    const pairs = Object.values(groups).find(group => group.length === 2 && (!threes || group[0].rankValue !== threes[0].rankValue));
    if (threes && pairs) {
        return [[...threes, ...pairs]];
    }
    return [];
}
function findFlushes(cards) { 
    // console.log("AI: findFlushes called");
    const suits = {};
    cards.forEach(card => {
        if(!suits[card.suitValue]) suits[card.suitValue] = [];
        suits[card.suitValue].push(card);
    });
    const flushCards = Object.values(suits).find(group => group.length >= 5);
    if (flushCards) {
        return [flushCards.sort((a,b)=>b.rankValue - a.rankValue).slice(0,5)];
    }
    return [];
}
function findStraights(cards) { 
    // console.log("AI: findStraights called");
     if (cards.length < 5) return [];
    const uniqueRankCards = [];
    const seenRanks = new Set();
    [...cards].sort((a,b) => a.rankValue - b.rankValue).forEach(card => {
        if(!seenRanks.has(card.rankValue)){ uniqueRankCards.push(card); seenRanks.add(card.rankValue); }
    });
    if (uniqueRankCards.length < 5) return [];
    const results = [];
    for (let i = 0; i <= uniqueRankCards.length - 5; i++) {
        const segment = uniqueRankCards.slice(i, i + 5);
        if (checkStraight(segment)) { results.push(segment); }
    }
    const ace = cards.find(c=>c.rankValue === 14); const two = cards.find(c=>c.rankValue === 2); const three = cards.find(c=>c.rankValue === 3); const four = cards.find(c=>c.rankValue === 4); const five = cards.find(c=>c.rankValue === 5);
    if(ace && two && three && four && five){ const a2345 = [ace, five, four, three, two].sort((a,b)=>a.rankValue-b.rankValue); if(!results.some(r => JSON.stringify(r.map(c=>c.id).sort()) === JSON.stringify(a2345.map(c=>c.id).sort()))){ results.push(a2345);}}
    return results;
}

function findSimilarTypeHands(cards, targetType) {
    // console.log("AI: findSimilarTypeHands called for type", targetType);
    switch (targetType) {
        case HAND_TYPE_STRAIGHT_FLUSH: return findStraightFlushes(cards);
        case HAND_TYPE_FOUR_OF_A_KIND: return findFourOfAKind(cards);
        case HAND_TYPE_FULL_HOUSE: return findFullHouses(cards);
        case HAND_TYPE_FLUSH: return findFlushes(cards);
        case HAND_TYPE_STRAIGHT: return findStraights(cards);
        // 对于更小的牌型，如果需要，可以继续实现或返回高牌
        default: 
            if (cards.length >= 5) return [[...cards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5)];
            return [];
    }
}

function generateStrongHandCandidates(cards) {
    const candidates = []; // 直接用数组，后面手动去重或接受重复（评分会选优）
    const addUniqueCandidate = (hand) => { // 确保添加的是5张牌
        if (hand && hand.length === 5) {
            // 简单的去重：检查是否已存在完全相同的牌组 (基于id)
            const handIds = hand.map(c=>c.id).sort().join(',');
            if (!candidates.find(cHand => cHand.map(cc=>cc.id).sort().join(',') === handIds)) {
                candidates.push(hand);
            }
        }
    };

    findStraightFlushes(cards).forEach(addUniqueCandidate);
    findFourOfAKind(cards).forEach(addUniqueCandidate);
    findFullHouses(cards).forEach(addUniqueCandidate);
    findFlushes(cards).forEach(addUniqueCandidate);
    findStraights(cards).forEach(addUniqueCandidate);
    
    // 确保总有一个高牌候选 (按点数最大的5张)
    if (cards.length >= 5) {
         addUniqueCandidate([...cards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5));
    }
    
    // console.log("AI: Strong hand candidates generated:", candidates.length);
    return candidates.length > 0 ? candidates : (cards.length >= 5 ? [[...cards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5)] : []);
}

function generateMiddleHandCandidates(remainingCards, backEval) {
    const candidates = [];
    const addUniqueCandidate = (hand) => {
        if (hand && hand.length === 5) {
            const handIds = hand.map(c=>c.id).sort().join(',');
            if (!candidates.find(cHand => cHand.map(cc=>cc.id).sort().join(',') === handIds)) {
                candidates.push(hand);
            }
        }
    };
    
    if (backEval.type_code > HAND_TYPE_HIGH_CARD) {
        findSimilarTypeHands(remainingCards, backEval.type_code).forEach(hand => {
            if(hand.length !== 5) return;
            const evalResult = evaluateHandSimple(hand);
            if (compareHandsFrontend(evalResult, backEval) <= 0) { 
                addUniqueCandidate(hand);
            }
        });
    }
    if (backEval.type_code > HAND_TYPE_PAIR) { 
        const weakerType = backEval.type_code - 1;
        findSimilarTypeHands(remainingCards, weakerType).forEach(addUniqueCandidate);
    }
    if (remainingCards.length >= 5) {
         addUniqueCandidate([...remainingCards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5));
    }
    // console.log("AI: Middle hand candidates generated:", candidates.length, "for backEval type:", backEval.type_code);
    return candidates.length > 0 ? candidates : (remainingCards.length >= 5 ? [[...remainingCards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5)] : []);
}

// fallbackArrangement (确保返回的卡片对象是完整的原始结构)
function fallbackArrangement(allCardsInput) {
    console.log("Executing fallbackArrangement.");
    if (!allCardsInput || !Array.isArray(allCardsInput)) {
        console.error("FallbackArrangement: 无效输入, 返回空墩", allCardsInput);
        return { backHand: [], middleHand: [], frontHand: [] };
    }
    // --- 修改点：确保 fallback 返回的卡片包含所有原始属性 ---
    const cards = allCardsInput.map(c => ({...c})); // 创建副本
    cards.sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    
    const backHand = cards.slice(0, 5);
    const middleHand = cards.slice(5, 10);
    const frontHand = cards.slice(10, 13);

    // 确保即使是fallback，返回的也是包含完整属性的卡片对象
    return {
        backHand: backHand.map(c => ({...c})),
        middleHand: middleHand.map(c => ({...c})),
        frontHand: frontHand.map(c => ({...c})),
    };
}


export function smartAiArrangeCards(allCardsInput) {
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { 
        console.error("AI智能分牌需要13张有效牌，执行回退。Input:", allCardsInput); 
        return fallbackArrangement(allCardsInput || []); 
    }
    // --- 修改点：确保AI内部操作的是包含完整原始属性的卡片对象 ---
    const cards = allCardsInput.map(card => ({ 
        ...card, // 复制所有原始属性
        id: card.id || `${card.value}_of_${card.suit}`, // 确保有id
        rankValue: getRankValue(card.value),          // 用于AI内部计算和排序
        suitValue: card.suit                          // 用于AI内部计算
    }));
    
    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null; 
    let bestScore = -Infinity;

    if (strongCandidates.length === 0 && cards.length > 0) { 
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput); // 传递原始输入
    }

    for (const backHandCandidate of strongCandidates) {
        // ... (与上一版本 smartAiArrangeCards 的循环逻辑相同，确保所有卡片对象都传递完整属性) ...
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue;
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate);
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation);
        if (middleOptions.length === 0 && remainingAfterBack.length > 0) { continue; }
        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;}
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate);
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;}
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;}
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation);
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = { 
                    // --- 修改点：确保从候选复制时也保留所有原始属性 ---
                    backHand: backHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), 
                    middleHand: middleHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c })), 
                    frontHand: frontHandCandidate.map(c => ({...allCardsInput.find(orig => orig.id === c.id) || c }))
                };
            }
        }
    }

    if (bestArrangement) { 
        console.log("AI智能分牌完成。"); 
        // ... (最终检查和日志) ...
        return bestArrangement; 
    }
    console.warn("AI智能分牌未找到理想解，使用回退方案"); 
    return fallbackArrangement(allCardsInput);
}
