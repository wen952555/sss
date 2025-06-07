// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 ---
const HAND_TYPE_HIGH_CARD = 1;
const HAND_TYPE_PAIR = 2;
const HAND_TYPE_TWO_PAIR = 3;
const HAND_TYPE_THREE_OF_A_KIND = 4;
const HAND_TYPE_STRAIGHT = 5;
const HAND_TYPE_FLUSH = 6;
const HAND_TYPE_FULL_HOUSE = 7; 
const HAND_TYPE_FOUR_OF_A_KIND = 8; 
const HAND_TYPE_STRAIGHT_FLUSH = 9; 

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
        rank: getRankValue(c.value),
        suit: c.suit,
        id: c.id, 
        originalCard: c 
    }));
    cards.sort((a, b) => b.rank - a.rank); 
    return cards;
}

// --- 修改点：添加 export 关键字 ---
export function evaluateHandSimple(cardObjects) { // <--- 添加 export
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数" }; 
    }
    const prepared = prepareCardsForEval(cardObjects); 
    const ranks = prepared.map(c => c.rank);
    const suits = prepared.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    
    // 权重
    const typeWeights = {
        [HAND_TYPE_STRAIGHT_FLUSH]: 900, [HAND_TYPE_FOUR_OF_A_KIND]: 800,
        [HAND_TYPE_FULL_HOUSE]: 700, [HAND_TYPE_FLUSH]: 600,
        [HAND_TYPE_STRAIGHT]: 500, [HAND_TYPE_THREE_OF_A_KIND]: 400,
        [HAND_TYPE_TWO_PAIR]: 300, [HAND_TYPE_PAIR]: 200,
        [HAND_TYPE_HIGH_CARD]: 100, 0: 0
    };
    
    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') isStraight = true;
            else if (uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4 && uniqueRanksSortedAsc.length === 5) isStraight = true; // 确保是5张连续
        } else if (cardObjects.length === 3) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,14' && uniqueRanksSortedAsc.length === 3) isStraight = true; 
            else if (uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2 && uniqueRanksSortedAsc.length === 3) isStraight = true;
        }
    }
    
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + Math.max(...ranks), name: "同花顺" };
    
    const countsValues = Object.values(rankCounts);
    const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); 

    if (countsValues.includes(4)) {
        const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 4));
        return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + quadRank, name: "铁支" };
    }
    if (countsValues.includes(3) && countsValues.includes(2)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tripRank, name: "葫芦" };
    }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花" }; 
    if (isStraight) {
        const straightHighRank = (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') ? 5 : Math.max(...ranks); 
        return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子" };
    }
    if (countsValues.includes(3)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条" };
    }
    
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) {
        const pairRanks = countsKeys.filter(r => rankCounts[r] === 2);
        return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + Math.max(...pairRanks), name: "两对" }; 
    }
    if (numPairs === 1) {
        const pairRank = countsKeys.find(r => rankCounts[r] === 2);
        return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子" }; 
    }

    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙" };
}


/* // 之前注释掉的未使用函数
function removeCardsFromHand(hand, cardsToRemove) {
    const idsToRemove = new Set(cardsToRemove.map(c => c.id));
    return hand.filter(c => !idsToRemove.has(c));
}
function combinations(array, k) {
    return []; 
}
*/

export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    const allCards = allCardsInput.map(c => ({ ...c, rank: getRankValue(c.value) }));
    allCards.sort((a, b) => b.rank - a.rank); 

    console.log("AI分牌：使用简化的顺序分配策略。");

    const bestArrangement = {
        backHand: allCards.slice(0, 5),
        middleHand: allCards.slice(5, 10),
        frontHand: allCards.slice(10, 13),
    };
    
    const evalBack = evaluateHandSimple(bestArrangement.backHand);
    const evalMiddle = evaluateHandSimple(bestArrangement.middleHand);
    const evalFront = evaluateHandSimple(bestArrangement.frontHand);

    if (!(evalFront.rank <= evalMiddle.rank && evalMiddle.rank <= evalBack.rank)) {
        console.warn("AI顺序分配后，简单的rank比较未通过。");
    }

    return bestArrangement;
}
