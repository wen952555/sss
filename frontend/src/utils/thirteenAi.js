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
export function evaluateHandSimple(cardObjects) { /* ... (与之前无 ESLint 错误的版本一致) ... */ }
export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与之前无 ESLint 错误的版本一致) ... */ }

// --- AI 辅助函数 (确保它们总是返回数组，即使是空数组) ---
function combinations(sourceArray, k) {
    if (k < 0 || !Array.isArray(sourceArray) || k > sourceArray.length) { console.warn("combinations: invalid input", sourceArray, k); return []; }
    if (k === 0) { return [[]]; }
    if (k === sourceArray.length) { return sourceArray.length > 0 ? [[...sourceArray.map(c=>({...c}))]] : [[]]; }
    if (k === 1) { return sourceArray.map(element => [{...element}]); }
    const combs = [];
    if (sourceArray.length > 0) {
        const head = sourceArray[0];
        const tail = sourceArray.slice(1);
        combinations(tail, k - 1).forEach(smallerComb => { combs.push([{...head}, ...smallerComb.map(c=>({...c}))]); });
        combinations(tail, k).forEach(smallerComb => { combs.push([...smallerComb.map(c=>({...c}))]); });
    }
    return combs;
}

function removeSelectedCards(sourceHand, selectedCards) {
    if (!sourceHand || !Array.isArray(sourceHand)) { console.warn("removeSelectedCards: invalid sourceHand"); return []; }
    if (!selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) { return [...sourceHand.map(c=>({...c}))]; } // 返回副本
    const selectedIds = new Set(selectedCards.map(c => c.id).filter(Boolean));
    return sourceHand.filter(c => c && c.id && !selectedIds.has(c.id)).map(c=>({...c})); // 返回副本
}

// 您需要提供这些牌型查找函数的正确实现
// 为了调试，我将让它们至少返回一个空数组
function findStraightFlushes(cards) { console.log("findStraightFlushes called"); return []; }
function findFourOfAKind(cards) { console.log("findFourOfAKind called"); return []; }
function findFullHouses(cards) { console.log("findFullHouses called"); return []; }
function findFlushes(cards) { console.log("findFlushes called"); return []; }
function findStraights(cards) { console.log("findStraights called"); return []; }
function findSimilarTypeHands(cards, targetType) { console.log("findSimilarTypeHands called for type", targetType); return []; }
function calculateArrangementScore(backEval, middleEval, frontEval) { return (backEval.rank * 1000000 + middleEval.rank * 1000 + frontEval.rank); }

// --- 修改点：极度强化的 fallbackArrangement ---
function fallbackArrangement(allCardsInputOriginal) {
    console.log("Executing fallbackArrangement. Input:", allCardsInputOriginal ? JSON.stringify(allCardsInputOriginal.map(c=>c.id)) : "undefined/null");
    
    const defaultArrangement = { backHand: [], middleHand: [], frontHand: [] };
    if (!allCardsInputOriginal || !Array.isArray(allCardsInputOriginal) || allCardsInputOriginal.length === 0) {
        console.warn("FallbackArrangement: 无效或空输入, 返回完全空墩.");
        return defaultArrangement;
    }

    // 确保操作的是副本，并且卡片有ID和可排序的rank
    const cardsToProcess = allCardsInputOriginal.map((c, index) => {
        if (!c || typeof c.value === 'undefined' || typeof c.suit === 'undefined') {
            console.error(`FallbackArrangement: 输入手牌中发现无效卡片对象 at index ${index}:`, c);
            return null; // 标记为null，稍后过滤
        }
        return {
            ...c,
            id: c.id || `${c.value}_of_${c.suit}_${index}`, // 确保唯一ID
            rankForSort: getRankValue(c.value)
        };
    }).filter(Boolean); // 过滤掉null的卡片

    if (cardsToProcess.length !== 13) {
        console.warn(`FallbackArrangement: 过滤无效卡片后，牌数不足13张 (${cardsToProcess.length}张)，将按现有牌分配。`);
        // 即使牌数不足，也尝试分配，slice会自动处理边界
    }

    cardsToProcess.sort((a, b) => b.rankForSort - a.rankForSort);
    
    const sortedOriginalCards = cardsToProcess.map(c => {
        const { rankForSort, ...originalCard } = c;
        return originalCard; // 返回不含 rankForSort 的原始结构副本
    });

    const backHand = sortedOriginalCards.slice(0, 5);
    const middleHand = sortedOriginalCards.slice(5, 10);
    const frontHand = sortedOriginalCards.slice(10, 13);

    const finalArrangement = {
        backHand: Array.isArray(backHand) ? backHand : [],
        middleHand: Array.isArray(middleHand) ? middleHand : [],
        frontHand: Array.isArray(frontHand) ? frontHand : [],
    };
    console.log("FallbackArrangement result:", JSON.stringify(finalArrangement));
    return finalArrangement;
}

// --- 修改点：极度强化的 generateStrongHandCandidates ---
function generateStrongHandCandidates(cards) {
    console.log("generateStrongHandCandidates called with cards:", cards ? cards.length : 'undefined');
    if (!cards || !Array.isArray(cards) || cards.length < 5) {
        console.warn("generateStrongHandCandidates: 牌数不足5张，无法生成强牌候选。");
        return []; // 必须返回数组
    }
    const candidates = [];
    // (您的牌型查找逻辑，例如 findFlushes(cards).forEach(hand => { if(hand.length === 5) candidates.push(hand); });)
    // 确保至少有一个高牌候选
    const highCardHand = [...cards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5);
    if (highCardHand.length === 5) {
        candidates.push(highCardHand);
    }
    console.log("generateStrongHandCandidates returning candidates count:", candidates.length);
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5); // 确保返回的是有效5张牌组
}

// --- 修改点：极度强化的 generateMiddleHandCandidates ---
function generateMiddleHandCandidates(remainingCards, backEval) {
    console.log("generateMiddleHandCandidates called. Remaining:", remainingCards ? remainingCards.length : 'undefined', "BackEval:", backEval ? backEval.name : 'undefined');
    if (!remainingCards || !Array.isArray(remainingCards) || remainingCards.length < 5) {
        console.warn("generateMiddleHandCandidates: 剩余牌数不足5张。");
        return []; // 必须返回数组
    }
    if (!backEval) {
        console.error("generateMiddleHandCandidates: backEval 无效。");
        // 也可以尝试生成一个高牌中墩
        return [[...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5)].filter(h=>h.length===5);
    }
    const candidates = [];
    // (您的牌型查找逻辑)
    // 确保至少有一个高牌候选
    const highCardHand = [...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5);
    if (highCardHand.length === 5) {
        candidates.push(highCardHand);
    }
    console.log("generateMiddleHandCandidates returning candidates count:", candidates.length);
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5);
}

export function smartAiArrangeCards(allCardsInput) {
    console.log("smartAiArrangeCards called. Input length:", allCardsInput ? allCardsInput.length : "undefined/null");
    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) { 
        console.error("AI智能分牌：输入的allCardsInput无效或数量不为13，执行回退。", allCardsInput); 
        return fallbackArrangement(allCardsInput); // fallbackArrangement 现在能处理 null/undefined
    }

    let cards;
    try {
        cards = allCardsInput.map(card => {
            if (!card || typeof card.value === 'undefined' || typeof card.suit === 'undefined') {
                throw new Error(`smartAiArrangeCards: 无效卡片对象在输入中: ${JSON.stringify(card)}`);
            }
            return { ...card, id: card.id || `${card.value}_of_${card.suit}`, rankValue: getRankValue(card.value), suitValue: card.suit };
        });
    } catch (e) {
        console.error("AI智能分牌预处理卡片失败:", e.message, "Input was:", allCardsInput);
        return fallbackArrangement(allCardsInput);
    }
    
    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null; 
    let bestScore = -Infinity;

    if (!strongCandidates || !Array.isArray(strongCandidates) || strongCandidates.length === 0) { 
        console.warn("智能AI：未能生成强后墩候选 (strongCandidates is empty or invalid)，回退。", strongCandidates);
        return fallbackArrangement(allCardsInput); 
    }

    console.log(`AI: 开始尝试 ${strongCandidates.length} 个强后墩候选...`);
    for (const backHandCandidate of strongCandidates) {
        // ... (循环逻辑与上一版本相同，确保 removeSelectedCards, generateMiddleHandCandidates, evaluateHandSimple, compareHandsFrontend, calculateArrangementScore 都被正确调用)
        // ... (为简洁省略，请使用您已有的包含这些调用的版本)
    }

    if (bestArrangement) { 
        console.log("AI智能分牌完成，找到最佳组合。"); 
        // (最终检查和日志)
        return bestArrangement; 
    }
    
    console.warn("AI智能分牌在所有尝试后未找到理想解，执行最终回退方案。"); 
    return fallbackArrangement(allCardsInput);
}
