// frontend/src/utils/thirteenAi.js

// --- 牌型代码 和 基础辅助函数 (与上一无ESLint错误版本一致) ---
// ... (HAND_TYPE_...常量, getRankValue, prepareCardsForEval, evaluateHandSimple, compareHandsFrontend) ...
// ... (combinations, removeSelectedCards, groupByRank, checkStraight) ...
// ... (findStraightFlushes, findFourOfAKind, findFullHouses, findFlushes, findStraights, findSimilarTypeHands, calculateArrangementScore) ...
// (为简洁，此处省略这些函数的完整实现，请确保您使用的是上一个通过ESLint检查的版本)
// (并且，您需要用您自己实现的、能够正确工作的牌型查找函数替换find...系列的占位符)

// --- 修改点：确保 fallbackArrangement 总是返回一个有效的对象结构 ---
function fallbackArrangement(allCardsInput) {
    console.log("Executing fallbackArrangement.");
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length === 0) { // 增加对空数组的检查
        console.warn("FallbackArrangement: 无效或空输入, 返回空墩");
        return { 
            backHand: [], 
            middleHand: [], 
            frontHand: [] 
        };
    }
    const cards = [...allCardsInput].map(c => ({...c, id: c.id || `${c.value}_of_${c.suit}`})); // 确保有id
    cards.sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    
    const backHand = cards.slice(0, 5);
    const middleHand = cards.slice(5, 10);
    const frontHand = cards.slice(10, 13);

    // 即使牌不够，slice 也会返回空数组，这是OK的
    return {
        backHand: backHand.map(c => ({...c})), // 返回副本
        middleHand: middleHand.map(c => ({...c})),
        frontHand: frontHand.map(c => ({...c})),
    };
}

// --- 修改点：确保 generateStrongHandCandidates 即使找不到特定牌型，也返回一个包含高牌的有效数组 ---
function generateStrongHandCandidates(cards) {
    const candidates = []; 
    const addUniqueCandidate = (hand) => { /* ... (与上一版本相同，基于ID去重) ... */ };

    // (调用 find... 系列函数，您需要确保这些函数返回的是卡片数组或空数组)
    // findStraightFlushes(cards).forEach(addUniqueCandidate);
    // findFourOfAKind(cards).forEach(addUniqueCandidate);
    // findFullHouses(cards).forEach(addUniqueCandidate);
    // findFlushes(cards).forEach(addUniqueCandidate);
    // findStraights(cards).forEach(addUniqueCandidate);
    
    // 确保总有一个高牌候选 (按点数最大的5张)
    if (cards && cards.length >= 5) { // 增加对 cards 的检查
         const highCardHand = [...cards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0) ).slice(0,5);
         if (highCardHand.length === 5) { // 确保slice成功
            addUniqueCandidate(highCardHand);
         }
    }
    
    // console.log("AI: Strong hand candidates generated:", candidates.length);
    // 如果没有任何候选（非常不应该发生，因为至少有高牌），则返回一个包含高牌的数组
    if (candidates.length === 0 && cards && cards.length >= 5) {
        return [[...cards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5)];
    }
    return candidates; // candidates 已经是卡片对象数组的数组了
}

// --- 修改点：确保 generateMiddleHandCandidates 类似地返回有效数组 ---
function generateMiddleHandCandidates(remainingCards, backEval) {
    const candidates = [];
    const addUniqueCandidate = (hand) => { /* ... (与上一版本相同) ... */};
    
    // (调用 findSimilarTypeHands 或其他逻辑)
    // findSimilarTypeHands(remainingCards, HAND_TYPE_FLUSH); // 例如

    if (remainingCards && remainingCards.length >= 5) { // 增加对 remainingCards 的检查
         const highCardHand = [...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5);
         if (highCardHand.length === 5) {
            addUniqueCandidate(highCardHand);
         }
    }
    // console.log("AI: Middle hand candidates generated:", candidates.length);
    if (candidates.length === 0 && remainingCards && remainingCards.length >= 5) {
        return [[...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5)];
    }
    return candidates;
}


export function smartAiArrangeCards(allCardsInput) {
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { 
        console.error("AI智能分牌：输入的allCardsInput无效，执行回退。", allCardsInput); 
        return fallbackArrangement(allCardsInput || []); // 确保 fallback 有输入
    }
    
    // --- 修改点：在操作前，先对 allCardsInput 进行一次深拷贝和预处理，确保后续所有操作基于有效数据 ---
    let cards;
    try {
        cards = allCardsInput.map(card => {
            if (!card || typeof card.value === 'undefined' || typeof card.suit === 'undefined') {
                throw new Error(`无效卡片对象在输入中: ${JSON.stringify(card)}`);
            }
            return { 
                ...card, 
                id: card.id || `${card.value}_of_${card.suit}`, 
                rankValue: getRankValue(card.value), 
                suitValue: card.suit 
            };
        });
    } catch (e) {
        console.error("AI智能分牌预处理卡片失败:", e.message);
        return fallbackArrangement(allCardsInput); // 如果预处理失败，也回退
    }
    
    // console.log("AI: Processed cards for AI:", cards.map(c=>c.id));

    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null; 
    let bestScore = -Infinity;

    if (!strongCandidates || strongCandidates.length === 0) { // 增加了对 strongCandidates 的检查
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput); 
    }

    for (const backHandCandidate of strongCandidates) {
        // ... (与上一版本 smartAiArrangeCards 的循环逻辑相同)
        // ... 确保所有从候选数组中取出的 hand 都是有效的卡片对象数组 ...
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) {console.warn("跳过无效后墩候选"); continue;}
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate);
        
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation);
        if (!middleOptions || middleOptions.length === 0 ) { /* console.log("无中墩选项，跳过后墩:", backHandCandidate.map(c=>c.id)); */ continue; }

        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) {console.warn("跳过无效中墩候选"); continue;}
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;}
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate);
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {console.warn("跳过无效前墩候选"); continue;}
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;}
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation);
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = { 
                    // --- 修改点：确保从 allCardsInput 查找原始对象时 ID 匹配，并且做拷贝 ---
                    backHand: backHandCandidate.map(c => { const orig = allCardsInput.find(o => o.id === c.id); return {...(orig || c)}; }), 
                    middleHand: middleHandCandidate.map(c => { const orig = allCardsInput.find(o => o.id === c.id); return {...(orig || c)}; }), 
                    frontHand: frontHandCandidate.map(c => { const orig = allCardsInput.find(o => o.id === c.id); return {...(orig || c)}; })
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
