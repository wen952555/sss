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
export function evaluateHandSimple(cardObjects) { /* ... (与之前无 ESLint 错误的版本一致，确保它使用顶层 HAND_TYPE_... 常量) ... */ }
export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与之前无 ESLint 错误的版本一致) ... */ }

// --- 您提供的 AI 辅助函数 ---
// (确保这些函数定义完整，并且它们内部如果用到 HAND_TYPE_... 常量，也能访问到顶层定义)
function combinations(sourceArray, k) { /* ... (您提供的完整实现) ... */ return []; }
function removeSelectedCards(sourceHand, selectedCards) { /* ... (您的完整实现) ... */ return sourceHand.filter(c => !selectedCards.find(sc => sc.id === c.id));} // 确保有实现
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
        case HAND_TYPE_FLUSH: return findFlushes(cards);
        case HAND_TYPE_STRAIGHT: return findStraights(cards);
        default: 
            // 对于其他牌型，如果需要，可以尝试暴力组合并评估
            if (cards.length >= 5 && (targetType === HAND_TYPE_THREE_OF_A_KIND || targetType === HAND_TYPE_TWO_PAIR || targetType === HAND_TYPE_PAIR || targetType === HAND_TYPE_HIGH_CARD)) {
                const combs = combinations(cards, 5);
                return combs.filter(comb => evaluateHandSimple(comb).type_code === targetType);
            }
             if (cards.length >= 3 && (targetType === HAND_TYPE_THREE_OF_A_KIND || targetType === HAND_TYPE_PAIR || targetType === HAND_TYPE_HIGH_CARD)) {
                const combs = combinations(cards, 3);
                return combs.filter(comb => evaluateHandSimple(comb).type_code === targetType);
            }
            return [];
    }
}

function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的完整实现) ... */ return 0;}
function fallbackArrangement(allCardsInput) { /* ... (您的完整实现，确保返回正确结构) ... */ }

function generateStrongHandCandidates(cards) {
    const candidates = []; 
    // 确保调用了 find... 系列函数
    findStraightFlushes(cards).forEach(hand => { if(hand && hand.length === 5) candidates.push(hand);});
    findFourOfAKind(cards).forEach(hand => { if(hand && hand.length === 5) candidates.push(hand);});
    findFullHouses(cards).forEach(hand => { if(hand && hand.length === 5) candidates.push(hand);});
    findFlushes(cards).forEach(hand => { if(hand && hand.length === 5) candidates.push(hand);});
    findStraights(cards).forEach(hand => { if(hand && hand.length === 5) candidates.push(hand);});
    
    if (cards && cards.length >= 5) {
         const highCardHand = [...cards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5);
         if (highCardHand.length === 5) { candidates.push(highCardHand); }
    }
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5);
}

function generateMiddleHandCandidates(remainingCards, backEval) {
    const candidates = [];
    if (!remainingCards || !Array.isArray(remainingCards) || !backEval) return candidates;

    // 尝试找比后墩弱或等于的同类型牌
    if (backEval.type_code > HAND_TYPE_HIGH_CARD) {
        findSimilarTypeHands(remainingCards, backEval.type_code).forEach(hand => {
            if(hand && hand.length === 5) {
                const evalResult = evaluateHandSimple(hand);
                if (compareHandsFrontend(evalResult, backEval) <= 0) { candidates.push(hand); }
            }
        });
    }
    // 尝试找比后墩弱一级的牌型 (确保 targetType 是有效的)
    if (backEval.type_code > HAND_TYPE_PAIR) { 
        const weakerType = backEval.type_code - 1;
        if (weakerType >= HAND_TYPE_HIGH_CARD) { // 确保类型有效
             findSimilarTypeHands(remainingCards, weakerType).forEach(hand => {  if(hand && hand.length === 5) candidates.push(hand); });
        }
    }
    if (remainingCards.length >= 5) {
         const highCardHand = [...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5);
         if (highCardHand.length === 5) { candidates.push(highCardHand); }
    }
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5);
}


// --- 修改点：确保 smartAiArrangeCards 完整并调用其辅助函数 ---
export function smartAiArrangeCards(allCardsInput) {
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { 
        console.error("AI智能分牌：输入的allCardsInput无效或数量不为13，执行回退。", allCardsInput); 
        return fallbackArrangement(allCardsInput || []); 
    }

    const cards = allCardsInput.map(card => ({ 
        ...card, 
        id: card.id || `${card.value}_of_${card.suit}`, 
        rankValue: getRankValue(card.value), 
        suitValue: card.suit 
    }));
    
    const strongCandidates = generateStrongHandCandidates(cards); // 调用
    let bestArrangement = null; 
    let bestScore = -Infinity; // bestScore 现在会被使用

    if (!strongCandidates || strongCandidates.length === 0) { 
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput); 
    }

    // console.log(`AI: 尝试 ${strongCandidates.length} 个强后墩候选...`);
    for (const backHandCandidate of strongCandidates) { // backHandCandidate 被使用
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue;
        
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate); // 调用
        
        if (remainingAfterBack.length < 8) continue; // 不够牌给中墩和前墩

        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation); // 调用
        
        if (!middleOptions || middleOptions.length === 0 ) { 
            // 如果严格按牌型找不到，尝试一个高牌中墩（如果牌够）
            if (remainingAfterBack.length >= 5) {
                const fallbackMiddle = [...remainingAfterBack].sort((a,b)=>getRankValue(b.value)-getRankValue(a.value)).slice(0,5);
                if (fallbackMiddle.length === 5) middleOptions.push(fallbackMiddle);
            }
            if (!middleOptions || middleOptions.length === 0) continue;
        }

        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} 
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate); // 调用
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;}
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} 
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation); // 调用
            if (arrangementScore > bestScore) { // bestScore 被使用
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
        // (最终检查和日志)
        return bestArrangement; 
    }
    
    console.warn("AI智能分牌未找到理想解，使用回退方案"); 
    return fallbackArrangement(allCardsInput); // 调用
}
