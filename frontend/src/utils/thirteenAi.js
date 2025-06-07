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
    if (k < 0 || !Array.isArray(sourceArray) || k > sourceArray.length) { return []; }
    if (k === 0) { return [[]]; }
    if (k === sourceArray.length) { return [[...sourceArray]]; } // 返回副本
    if (k === 1) { return sourceArray.map(element => [{...element}]); } // 返回副本
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
    if (!sourceHand || !Array.isArray(sourceHand) || !selectedCards || !Array.isArray(selectedCards)) return [];
    const selectedIds = new Set(selectedCards.map(c => c.id).filter(Boolean));
    return sourceHand.filter(c => c && c.id && !selectedIds.has(c.id));
}

function groupByRank(cards) { /* ... (您的实现，确保健壮性) ... */ return {}; }
function checkStraight(cards) { /* ... (您的实现，确保健壮性) ... */ return false; }
function findStraightFlushes(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
function findFourOfAKind(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
function findFullHouses(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
function findFlushes(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
function findStraights(cards) { /* ... (您的实现，确保返回数组) ... */ return [];}
function findSimilarTypeHands(cards, targetType) { /* ... (您的实现，确保返回数组) ... */ return [];}
function calculateArrangementScore(backEval, middleEval, frontEval) { /* ... (您的实现) ... */ return 0;}

function generateStrongHandCandidates(cards) {
    if (!cards || !Array.isArray(cards)) return [];
    const candidates = [];
    // (您的牌型查找逻辑，确保 addCandidate 添加的是5张牌的数组)
    // 例如: findFlushes(cards).forEach(hand => { if(hand.length === 5) candidates.push(hand); });
    if (cards.length >= 5) { // 至少保证一个高牌候选
        candidates.push([...cards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5));
    }
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5);
}

function generateMiddleHandCandidates(remainingCards, backEval) {
    if (!remainingCards || !Array.isArray(remainingCards)) return [];
    const candidates = [];
    // (您的牌型查找逻辑)
    if (remainingCards.length >= 5) { // 至少保证一个高牌候选
        candidates.push([...remainingCards].sort((a,b)=> (getRankValue(b.value) || 0) - (getRankValue(a.value) || 0)).slice(0,5));
    }
    return candidates.filter(hand => Array.isArray(hand) && hand.length === 5);
}

// --- 修改点：确保 fallbackArrangement 总是返回定义良好的对象结构 ---
function fallbackArrangement(allCardsInputOriginal) {
    console.log("Executing fallbackArrangement.");
    // 创建一个全新的副本进行操作，确保原始输入不被修改，且对象结构完整
    const allCardsInput = Array.isArray(allCardsInputOriginal) ? allCardsInputOriginal.map(c => ({...c})) : [];

    if (allCardsInput.length < 13 && allCardsInput.length > 0) { // 如果牌不够13张但有牌
      console.warn("FallbackArrangement: 牌数不足13张，但会尝试分配。", allCardsInput.length);
    } else if (allCardsInput.length === 0 && (!allCardsInputOriginal || allCardsInputOriginal.length === 0)) {
      console.warn("FallbackArrangement: 无输入牌张，返回空墩。");
    }


    const cards = allCardsInput.map(c => ({
        ...c, // 保留所有原始属性
        id: c.id || `${c.value}_of_${c.suit}`, // 确保有 id
        rankForSort: getRankValue(c.value)
    })).sort((a, b) => b.rankForSort - a.rankForSort);
    
    const sortedOriginalCards = cards.map(c => {
        const { rankForSort, ...originalCard } = c;
        return originalCard;
    });

    const backHand = sortedOriginalCards.slice(0, 5);
    const middleHand = sortedOriginalCards.slice(5, 10);
    const frontHand = sortedOriginalCards.slice(10, 13);

    // 确保即使牌不够，返回的也是空数组而不是 undefined
    return {
        backHand: Array.isArray(backHand) ? backHand : [],
        middleHand: Array.isArray(middleHand) ? middleHand : [],
        frontHand: Array.isArray(frontHand) ? frontHand : [],
    };
}

export function smartAiArrangeCards(allCardsInput) {
    console.log("smartAiArrangeCards called with:", allCardsInput ? JSON.stringify(allCardsInput.map(c=>c.id)) : "undefined input");

    if (!allCardsInput || !Array.isArray(allCardsInput) || allCardsInput.length !== 13) {
        console.error("AI智能分牌：输入的allCardsInput无效或数量不为13，执行回退。", allCardsInput);
        return fallbackArrangement(allCardsInput); // 确保 fallbackArrangement 能处理 null/undefined
    }

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
        console.error("AI智能分牌预处理卡片失败:", e.message, "Input was:", allCardsInput);
        return fallbackArrangement(allCardsInput);
    }

    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null;
    let bestScore = -Infinity;

    if (!strongCandidates || strongCandidates.length === 0) { // 严格检查
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput);
    }

    for (const backHandCandidate of strongCandidates) {
        // ... (与上一个版本 smartAiArrangeCards 的循环逻辑相同，确保所有卡片对象都传递完整属性) ...
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) { continue; }
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate);
        if (remainingAfterBack.length < 8) { continue; } // 需要足够牌给中墩和前墩

        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation);
        if (!middleOptions || middleOptions.length === 0) { continue; }

        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) { continue; }
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) { continue; }
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate);
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) { continue; }
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) { continue; }
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation);
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
        // (最终检查和日志)
        return bestArrangement;
    }
    
    console.warn("AI智能分牌未找到理想解，使用回退方案");
    return fallbackArrangement(allCardsInput);
}
