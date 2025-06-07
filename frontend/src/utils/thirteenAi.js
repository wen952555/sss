// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// 这些常量定义在文件的顶层作用域
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
    
    // --- 修改点：确保 typeWeights 能访问到顶层定义的常量 ---
    const typeWeights = {
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000,
        [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000,
        [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000,
        [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000,
        [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000,
        0: 0
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
    
    // --- 修改点：确保所有 return 语句中的 type_code 都正确引用了顶层常量 ---
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    
    const countsValues = Object.values(rankCounts);
    // const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); // 如果未使用，可以注释

    if (countsValues.includes(4)) { 
        const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 4)); 
        const kicker = ranks.find(r => r !== quadRank); 
        primaryRanksForCompare = [quadRank, kicker].filter(r => r !== undefined); 
        return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + quadRank, name: "铁支", primary_ranks: primaryRanksForCompare }; 
    }
    if (countsValues.includes(3) && countsValues.includes(2)) { 
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3)); 
        const pairRankVal = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2)); 
        primaryRanksForCompare = [tripRank, pairRankVal]; 
        return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tripRank, name: "葫芦", primary_ranks: primaryRanksForCompare }; 
    }
    if (isFlush) { 
        return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks };  
    }
    if (isStraight) { 
        return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare }; 
    }
    if (countsValues.includes(3)) { 
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3)); 
        const kickers = ranks.filter(r => r !== tripRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 3); 
        primaryRanksForCompare = [tripRank, ...kickers]; 
        return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条", primary_ranks: primaryRanksForCompare }; 
    }
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) { 
        const pairRanks = Object.keys(rankCounts).filter(key => rankCounts[key] === 2).map(Number).sort((a,b)=>b-a); 
        const kicker = ranks.find(r => !pairRanks.includes(r)); 
        primaryRanksForCompare = [...pairRanks, kicker].filter(r => r !== undefined); 
        return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pairRanks[0], name: "两对", primary_ranks: primaryRanksForCompare };  
    }
    if (numPairs === 1) { 
        const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2)); 
        const kickers = ranks.filter(r => r !== pairRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 2); 
        primaryRanksForCompare = [pairRank, ...kickers]; 
        return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子", primary_ranks: primaryRanksForCompare };  
    }
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2) { /* ... (与上一版本相同) ... */ }
export function simpleAiArrangeCards(allCardsInput) { /* ... (与上一版本相同，确保调用了 evaluateHandSimple 和 compareHandsFrontend) ... */ }
function shuffleArray(array) { /* ... (与上一版本相同) ... */ } // 如果 simpleAiArrangeCards 用到了
function fallbackArrangement(allCardsInput) { /* ... (与上一版本相同) ... */ } // 如果 simpleAiArrangeCards 用到了
// 注意：如果 simpleAiArrangeCards 中没有使用 removeSelectedCards 和 combinations，它们应该被注释掉或删除，以避免 no-unused-vars
