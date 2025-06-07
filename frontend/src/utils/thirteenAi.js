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
function getRankValue(value) { /* ... (与之前无错误版本一致) ... */ }
function prepareCardsForEval(cardObjects) { /* ... (与之前无错误版本一致) ... */ }
export function evaluateHandSimple(cardObjects) { /* ... (与之前无错误版本一致，确保它使用顶层 HAND_TYPE_... 常量) ... */ }
export function compareHandsFrontend(eval1, eval2, context = "") { /* ... (与之前无错误版本一致) ... */ }

// --- 您提供的AI辅助函数 ---
// (我将粘贴您上次提供的所有AI辅助函数，并确保它们正确使用了顶层常量)

function combinations(sourceArray, k) {
    if (k < 0 || k > sourceArray.length) { return []; }
    if (k === 0) { return [[]]; }
    if (k === sourceArray.length) { return [sourceArray]; }
    if (k === 1) { return sourceArray.map(element => [element]); }
    const combs = [];
    if (sourceArray.length > 0) {
        const head = sourceArray[0];
        const tail = sourceArray.slice(1);
        combinations(tail, k - 1).forEach(smallerComb => { combs.push([head, ...smallerComb]); });
        combinations(tail, k).forEach(smallerComb => { combs.push(smallerComb); });
    }
    return combs;
}

function removeSelectedCards(sourceHand, selectedCards) {
    const selectedIds = new Set(selectedCards.map(c => c.id));
    return sourceHand.filter(c => !selectedIds.has(c));
}

function groupByRank(cards) {
    const groups = {};
    if (!cards || !Array.isArray(cards)) return groups;
    cards.forEach(card => {
        if (card && card.rankValue !== undefined) {
            if (!groups[card.rankValue]) groups[card.rankValue] = [];
            groups[card.rankValue].push(card);
        }
    });
    return groups;
}

function checkStraight(cards) {
    if (!cards || cards.length < 3) return false;
    const ranks = cards.map(c => c.rankValue).sort((a,b) => a - b);
    // A2345 (A的rankValue是14)
    if (ranks.length === 5 && ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5 && cards.some(c => c.rankValue === 14)) {
        return true;
    }
    // A23 (前墩)
    if (ranks.length === 3 && ranks[0] === 2 && ranks[1] === 3 && cards.some(c => c.rankValue === 14)) {
        return true;
    }
    for (let i = 0; i < ranks.length - 1; i++) {
        if (ranks[i+1] - ranks[i] !== 1) {
            return false;
        }
    }
    return true;
}

function findStraightFlushes(cards) {
    const suits = {}; const results = [];
    cards.forEach(card => { if (!suits[card.suitValue]) suits[card.suitValue] = []; suits[card.suitValue].push(card); });
    Object.values(suits).forEach(suitCards => {
        if (suitCards.length < 5) return;
        suitCards.sort((a, b) => a.rankValue - b.rankValue); // 升序便于查顺子
        // 尝试所有长度为5的子序列
        for (let i = 0; i <= suitCards.length - 5; i++) {
            const segment = suitCards.slice(i, i + 5);
            if (checkStraight(segment)) { results.push(segment); }
        }
    });
    return results;
}

function findFourOfAKind(cards) {
    const rankGroups = groupByRank(cards); const results = [];
    const quadRanks = Object.keys(rankGroups).filter(rank => rankGroups[rank].length === 4);
    quadRanks.forEach(qRank => {
        const quads = rankGroups[qRank];
        const kickers = cards.filter(c => c.rankValue !== parseInt(qRank)).sort((a,b)=>b.rankValue-a.rankValue);
        if (kickers.length > 0) { results.push([...quads, kickers[0]]);} 
        else if (cards.length === 4) { results.push([...quads]); } // 如果总共就4张牌（不可能在13张牌里找5张铁支）
    });
    return results;
}

function findFullHouses(cards) {
    const rankGroups = groupByRank(cards); const results = [];
    const tripRanks = Object.keys(rankGroups).filter(rank => rankGroups[rank].length >= 3);
    const pairRanks = Object.keys(rankGroups).filter(rank => rankGroups[rank].length >= 2);
    tripRanks.forEach(tRank => {
        const trips = rankGroups[tRank].slice(0,3);
        pairRanks.forEach(pRank => {
            if (tRank !== pRank) { // 三条和对子不能是同一点数
                const pairs = rankGroups[pRank].slice(0,2);
                results.push([...trips, ...pairs]);
            }
        });
    });
    return results;
}

function findFlushes(cards) {
    const suits = {}; const results = [];
    cards.forEach(card => { if (!suits[card.suitValue]) suits[card.suitValue] = []; suits[card.suitValue].push(card); });
    Object.values(suits).forEach(suitCards => {
        if (suitCards.length >= 5) {
            results.push([...suitCards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5));
        }
    });
    return results;
}

function findStraights(cards) {
    if (cards.length < 5) return [];
    // 移除同点数牌，只保留一张用于顺子判断 (例如手中有 2,2,3,4,5,6 -> 应该能组成 23456)
    const uniqueRankCards = [];
    const seenRanks = new Set();
    [...cards].sort((a,b) => a.rankValue - b.rankValue).forEach(card => { //升序处理
        if(!seenRanks.has(card.rankValue)){
            uniqueRankCards.push(card);
            seenRanks.add(card.rankValue);
        }
    });
    if (uniqueRankCards.length < 5) return [];

    const results = [];
    for (let i = 0; i <= uniqueRankCards.length - 5; i++) {
        const segment = uniqueRankCards.slice(i, i + 5);
        if (checkStraight(segment)) { results.push(segment); }
    }
     // 特殊处理A2345，因为上面checkStraight可能只认连续的
    const ace = cards.find(c=>c.rankValue === 14);
    const two = cards.find(c=>c.rankValue === 2);
    const three = cards.find(c=>c.rankValue === 3);
    const four = cards.find(c=>c.rankValue === 4);
    const five = cards.find(c=>c.rankValue === 5);
    if(ace && two && three && four && five){
        const a2345 = [ace, five, four, three, two].sort((a,b)=>a.rankValue-b.rankValue); //确保顺序
        if(!results.some(r => JSON.stringify(r.map(c=>c.id).sort()) === JSON.stringify(a2345.map(c=>c.id).sort()))){
             results.push(a2345);
        }
    }
    return results;
}

function findSimilarTypeHands(cards, targetType) {
    switch (targetType) {
        case HAND_TYPE_STRAIGHT_FLUSH: return findStraightFlushes(cards);
        case HAND_TYPE_FOUR_OF_A_KIND: return findFourOfAKind(cards);
        case HAND_TYPE_FULL_HOUSE: return findFullHouses(cards);
        case HAND_TYPE_FLUSH: return findFlushes(cards); // HAND_TYPE_FLUSH 应该能访问到
        case HAND_TYPE_STRAIGHT: return findStraights(cards);
        // 还可以添加对子、三条、两对的查找逻辑
        default:
            // 如果目标是更小的牌型，可以尝试生成所有5张组合并评估
            if (cards.length >= 5) {
                const combs = combinations(cards, 5);
                return combs.filter(comb => evaluateHandSimple(comb).type_code === targetType);
            }
            return [];
    }
}

function calculateArrangementScore(backEval, middleEval, frontEval) {
    return (backEval.rank * 1000000 + middleEval.rank * 1000 + frontEval.rank);
}

function fallbackArrangement(allCardsInput) {
    if (!allCardsInput || !Array.isArray(allCardsInput)) {
        return { backHand: [], middleHand: [], frontHand: [] };
    }
    // 确保fallback的卡片对象也有id
    const cards = [...allCardsInput].map(c => ({...c, id: c.id || `${c.value}_of_${c.suit}`})).sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
    return {
        backHand: cards.slice(0, 5),
        middleHand: cards.slice(5, 10),
        frontHand: cards.slice(10, 13),
    };
}

function generateStrongHandCandidates(cards) {
    const candidatesSet = new Set(); // 使用Set存储字符串化的牌组以去重
    const addCandidate = (hand) => {
        if (hand && hand.length === 5) {
            // 为了保证Set去重的有效性，对牌组内卡片按id排序后字符串化
            const sortedHandString = JSON.stringify(hand.map(c=>c.id).sort());
            candidatesSet.add(sortedHandString);
        }
    };

    findStraightFlushes(cards).forEach(addCandidate);
    findFourOfAKind(cards).forEach(addCandidate);
    findFullHouses(cards).forEach(addCandidate);
    findFlushes(cards).forEach(addCandidate);
    findStraights(cards).forEach(addCandidate);
    
    if (cards.length >= 5) { // 确保有高牌候选
         addCandidate([...cards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5));
    }
    // 将字符串化的牌组转回实际的卡片对象数组
    // 这需要一个方法从字符串化的id列表找回原始卡片对象
    // 或者，确保find...函数返回的已经是原始对象，并且Set存储的是对象数组（但Set对对象去重是基于引用）
    // 一个简单的处理是，如果candidatesSet是空的，至少返回一个高牌组合
    const results = Array.from(candidatesSet).map(strHandIds => {
        const ids = JSON.parse(strHandIds);
        return ids.map(id => cards.find(c => c.id === id)).filter(Boolean); // 确保找到卡片
    });
    if(results.length === 0 && cards.length >= 5) { //如果一个都没找到，加个高牌
        return [[...cards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5)];
    }
    return results.filter(hand => hand.length === 5); //确保返回的都是5张牌
}

function generateMiddleHandCandidates(remainingCards, backEval) {
    const candidatesSet = new Set();
    const addCandidate = (hand) => {
        if (hand && hand.length === 5) {
            const sortedHandString = JSON.stringify(hand.map(c=>c.id).sort());
            candidatesSet.add(sortedHandString);
        }
    };

    // 尝试找比后墩弱或等于的同类型牌
    if (backEval.type_code > HAND_TYPE_HIGH_CARD) {
        findSimilarTypeHands(remainingCards, backEval.type_code).forEach(hand => {
            if(hand.length !== 5) return;
            const evalResult = evaluateHandSimple(hand);
            if (compareHandsFrontend(evalResult, backEval) <= 0) { // evalResult <= backEval
                addCandidate(hand);
            }
        });
    }
    // 尝试找比后墩弱一级的牌型
    if (backEval.type_code > HAND_TYPE_PAIR) { // 至少是对子，才能找更弱的乌龙之外的牌型
        const weakerType = backEval.type_code - 1;
        findSimilarTypeHands(remainingCards, weakerType).forEach(addCandidate);
    }
    // 总是包含一个高牌选项
    if (remainingCards.length >= 5) {
         addCandidate([...remainingCards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5));
    }
    const results = Array.from(candidatesSet).map(strHandIds => {
        const ids = JSON.parse(strHandIds);
        return ids.map(id => remainingCards.find(c => c.id === id)).filter(Boolean);
    });
    if(results.length === 0 && remainingCards.length >= 5) {
        return [[...remainingCards].sort((a,b)=>b.rankValue-a.rankValue).slice(0,5)];
    }
    return results.filter(hand => hand.length === 5);
}

// 您提供的 smartAiArrangeCards 函数
export function smartAiArrangeCards(allCardsInput) {
    // (这个函数体与您上一次提供的版本一致，确保它调用了上面定义的辅助函数)
    // ... (为简洁，此处省略其具体实现，请使用您已有的那个包含组合搜索的版本)
    if (!allCardsInput || allCardsInput.length !== 13) { console.error("AI智能分牌需要13张有效牌"); return fallbackArrangement(allCardsInput || []); }
    const cards = allCardsInput.map(card => ({ ...card, id: card.id || `${card.value}_of_${card.suit}`, rankValue: getRankValue(card.value), suitValue: card.suit }));
    // cards.sort((a, b) => b.rankValue - a.rankValue); // 排序移到 generateStrongHandCandidates 内部或按需排序
    
    const strongCandidates = generateStrongHandCandidates(cards);
    let bestArrangement = null; let bestScore = -Infinity;

    if (strongCandidates.length === 0 && cards.length > 0) { // 如果没有强候选，直接回退
        console.warn("智能AI：未能生成强后墩候选，回退。");
        return fallbackArrangement(allCardsInput);
    }

    for (const backHandCandidate of strongCandidates) {
        if (!Array.isArray(backHandCandidate) || backHandCandidate.length !== 5) continue;
        const backEvaluation = evaluateHandSimple(backHandCandidate);
        const remainingAfterBack = removeSelectedCards(cards, backHandCandidate);
        
        const middleOptions = generateMiddleHandCandidates(remainingAfterBack, backEvaluation);
        if (middleOptions.length === 0 && remainingAfterBack.length > 0) { // 如果没有中墩候选
            continue;
        }

        for (const middleHandCandidate of middleOptions) {
            if (!Array.isArray(middleHandCandidate) || middleHandCandidate.length !== 5) continue;
            const middleEvaluation = evaluateHandSimple(middleHandCandidate);
            if (compareHandsFrontend(backEvaluation, middleEvaluation) < 0) {continue;} // 后墩必须 >= 中墩
            
            const frontHandCandidate = removeSelectedCards(remainingAfterBack, middleHandCandidate);
            if (!Array.isArray(frontHandCandidate) || frontHandCandidate.length !== 3) {continue;}
            
            const frontEvaluation = evaluateHandSimple(frontHandCandidate);
            if (compareHandsFrontend(middleEvaluation, frontEvaluation) < 0) {continue;} // 中墩必须 >= 前墩
            
            const arrangementScore = calculateArrangementScore(backEvaluation, middleEvaluation, frontEvaluation);
            if (arrangementScore > bestScore) {
                bestScore = arrangementScore;
                bestArrangement = { backHand: [...backHandCandidate], middleHand: [...middleHandCandidate], frontHand: [...frontHandCandidate] };
            }
        }
    }
    if (bestArrangement) { 
        console.log("AI智能分牌完成"); 
        const finalEvalB = evaluateHandSimple(bestArrangement.backHand); const finalEvalM = evaluateHandSimple(bestArrangement.middleHand); const finalEvalF = evaluateHandSimple(bestArrangement.frontHand); 
        if(compareHandsFrontend(finalEvalM, finalEvalB) > 0 || compareHandsFrontend(finalEvalF, finalEvalM) > 0){
            console.warn("AI智能分牌最终结果仍疑似倒水，回退。",{F:finalEvalF.name,M:finalEvalM.name,B:finalEvalB.name}); 
            return fallbackArrangement(allCardsInput);
        } 
        return bestArrangement; 
    }
    console.warn("AI智能分牌未找到理想解，使用回退方案"); 
    return fallbackArrangement(allCardsInput);
}
