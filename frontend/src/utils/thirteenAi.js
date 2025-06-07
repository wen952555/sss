// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_HIGH_CARD = 1;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_PAIR = 2;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_TWO_PAIR = 3;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_THREE_OF_A_KIND = 4;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_STRAIGHT = 5;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FLUSH = 6;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FULL_HOUSE = 7;
// eslint-disable-next-line no-unused-vars
const HAND_TYPE_FOUR_OF_A_KIND = 8;
// eslint-disable-next-line no-unused-vars
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
function prepareCardsForEval(cardObjects) { // <--- 定义处 (日志中可能是Line 9或附近)
    if (!cardObjects || cardObjects.length === 0) return [];
    const cards = cardObjects.map(c => ({
        ...c, // 确保所有原始属性被复制
        rank: getRankValue(c.value),
    }));
    cards.sort((a, b) => b.rank - a.rank); // 按牌点降序排序
    return cards;
}

// 这个函数会被 simpleAiArrangeCards 和 compareHandsFrontend 调用
export function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] };
    }
    
    // --- 确保调用 prepareCardsForEval ---
    const preparedCards = prepareCardsForEval(cardObjects); // <--- 调用处
    
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
    let primaryRanksForCompare = [...ranks]; // 默认值
    
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
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') { 
                isStraight = true;
                primaryRanksForCompare = [5,4,3,2,1]; 
            } else if (uniqueRanksSortedAsc.length === 5 && uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4) { 
                isStraight = true;
                primaryRanksForCompare = [ranks[0]]; 
            }
        } else if (cardObjects.length === 3) { 
            if (uniqueRanksSortedAsc.length === 3 && uniqueRanksSortedAsc.join(',') === '2,3,14') { 
                isStraight = true;
                straightHighRank = 3; 
                primaryRanksForCompare = [3,2,1];
            } else if (uniqueRanksSortedAsc.length === 3 && uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2) {
                isStraight = true;
                primaryRanksForCompare = [ranks[0]];
            }
        }
    }
    
    // (牌型判断和返回逻辑，与上个版本应该一致，确保所有路径都返回一个对象)
    // ... (此处为完整的牌型判断和return语句，我将粘贴上一次完整的这部分)
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    const countsValues = Object.values(rankCounts);
    if (countsValues.includes(4)) { const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 4)); const kicker = ranks.find(r => r !== quadRank); primaryRanksForCompare = [quadRank, kicker].filter(r => r !== undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + quadRank, name: "铁支", primary_ranks: primaryRanksForCompare }; }
    if (countsValues.includes(3) && countsValues.includes(2)) { const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3)); const pairRankVal = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2)); primaryRanksForCompare = [tripRank, pairRankVal]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tripRank, name: "葫芦", primary_ranks: primaryRanksForCompare }; }
    if (isFlush) { return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks };  }
    if (isStraight) { return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; }
    if (countsValues.includes(3)) { const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3)); const kickers = ranks.filter(r => r !== tripRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 3); primaryRanksForCompare = [tripRank, ...kickers]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条", primary_ranks: primaryRanksForCompare }; }
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) { const pairRanks = Object.keys(rankCounts).filter(key => rankCounts[key] === 2).map(Number).sort((a,b)=>b-a); const kicker = ranks.find(r => !pairRanks.includes(r)); primaryRanksForCompare = [...pairRanks, kicker].filter(r => r !== undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pairRanks[0], name: "两对", primary_ranks: primaryRanksForCompare };  }
    if (numPairs === 1) { const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2)); const kickers = ranks.filter(r => r !== pairRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 2); primaryRanksForCompare = [pairRank, ...kickers]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子", primary_ranks: primaryRanksForCompare };  }
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2) {
    if (!eval1 || !eval2) return 0; 
    if (eval1.type_code > eval2.type_code) return 1;
    if (eval1.type_code < eval2.type_code) return -1;
    if (eval1.primary_ranks && eval2.primary_ranks) {
        for (let i = 0; i < Math.min(eval1.primary_ranks.length, eval2.primary_ranks.length); i++) {
            if (eval1.primary_ranks[i] > eval2.primary_ranks[i]) return 1;
            if (eval1.primary_ranks[i] < eval2.primary_ranks[i]) return -1;
        }
    }
    return 0; 
}

// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的 id)
function removeSelectedCards(sourceHand, selectedCards) { // 被 simpleAiArrangeCards 调用
    const selectedIds = new Set(selectedCards.map(c => c.id));
    return sourceHand.filter(c => !selectedIds.has(c));
}

// 辅助函数：生成组合 C(n,k) - 被 simpleAiArrangeCards 调用
function combinations(sourceArray, k) { // 被 simpleAiArrangeCards 调用
    if (k < 0 || k > sourceArray.length) { return []; }
    if (k === 0) { return [[]]; }
    if (k === sourceArray.length) { return [sourceArray]; }
    if (k === 1) { return sourceArray.map(element => [element]); }
    const combs = [];
    if (sourceArray.length > 0) {
        const head = sourceArray[0];
        const tail = sourceArray.slice(1);
        combinations(tail, k - 1).forEach(smallerComb => {
            combs.push([head, ...smallerComb]);
        });
        combinations(tail, k).forEach(smallerComb => {
            combs.push(smallerComb);
        });
    }
    return combs;
}


export function simpleAiArrangeCards(allCardsInput) { // 这个函数是导出的，被GameBoard调用
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    const allCards = allCardsInput.map(c => ({ ...c, id: c.id || `${c.value}_of_${c.suit}` }));

    let bestArrangement = null;
    let bestArrangementOverallScore = -Infinity; 

    const possibleBackHands = combinations(allCards, 5); // 调用 combinations
    if (possibleBackHands.length === 0) { 
        console.error("未能生成后墩组合");
        return fallbackArrangement(allCardsInput); // fallbackArrangement 调用 getRankValue
    }

    for (const currentBackTry of possibleBackHands) {
        const evalBack = evaluateHandSimple(currentBackTry); // 调用 evaluateHandSimple
        const remainingAfterBack = removeSelectedCards(allCards, currentBackTry); // 调用 removeSelectedCards
        if (remainingAfterBack.length !== 8) continue; 
        const possibleMiddleHands = combinations(remainingAfterBack, 5); // 调用 combinations
        if (possibleMiddleHands.length === 0) continue;
        for (const currentMiddleTry of possibleMiddleHands) {
            const evalMiddle = evaluateHandSimple(currentMiddleTry); // 调用 evaluateHandSimple
            if (compareHandsFrontend(evalMiddle, evalBack) > 0) { // 调用 compareHandsFrontend
                continue; 
            }
            const currentFrontTry = removeSelectedCards(remainingAfterBack, currentMiddleTry); // 调用 removeSelectedCards
            if (currentFrontTry.length !== 3) continue; 
            const evalFront = evaluateHandSimple(currentFrontTry); // 调用 evaluateHandSimple
            if (compareHandsFrontend(evalFront, evalMiddle) > 0) { // 调用 compareHandsFrontend
                continue; 
            }
            const overallScore = evalBack.rank * 1000000 + evalMiddle.rank * 1000 + evalFront.rank;
            if (overallScore > bestArrangementOverallScore) {
                bestArrangementOverallScore = overallScore;
                bestArrangement = {
                    frontHand: currentFrontTry,
                    middleHand: currentMiddleTry,
                    backHand: currentBackTry,
                };
            }
        }
    }

    if (bestArrangement) {
        console.log("AI分牌完成 (通过组合搜索)。");
        // ... (日志)
        return bestArrangement;
    } else {
        console.warn("AI未能通过组合搜索找到理想解，回退到顺序分配。");
        return fallbackArrangement(allCardsInput); // fallbackArrangement 调用 getRankValue
    }
}

function fallbackArrangement(allCardsInput) { // 被 simpleAiArrangeCards 调用
    const cardsWithRank = allCardsInput.map(c => ({
        ...c,
        rankForSort: getRankValue(c.value) // 调用 getRankValue
    }));
    cardsWithRank.sort((a, b) => b.rankForSort - a.rankForSort);
    const sortedOriginalCards = cardsWithRank.map(c => {
        const { rankForSort, ...originalCard } = c;
        return originalCard;
    });
    return {
        backHand: sortedOriginalCards.slice(0, 5),
        middleHand: sortedOriginalCards.slice(5, 10),
        frontHand: sortedOriginalCards.slice(10, 13),
    };
}
