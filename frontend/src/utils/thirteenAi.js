// frontend/src/utils/thirteenAi.js

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
        originalCard: c 
    }));
    cards.sort((a, b) => b.rank - a.rank);
    return cards;
}

function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: [], rank: 0 }; 
    }
    const cards = prepareCardsForEval(cardObjects);
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueSortedRanks = Array.from(new Set(ranks)).sort((a, b) => a - b); 
    if (uniqueSortedRanks.length >= (cards.length === 3 ? 3 : 5)) { 
        let straightCount = 1;
        let currentRank = uniqueSortedRanks[0];
        for (let i = 1; i < uniqueSortedRanks.length; i++) {
            if (uniqueSortedRanks[i] === currentRank + 1) {
                straightCount++;
                currentRank = uniqueSortedRanks[i];
            } else if (straightCount < (cards.length === 3 ? 3 : 5)) { 
                straightCount = 1; 
                currentRank = uniqueSortedRanks[i];
            }
            if (straightCount === (cards.length === 3 ? 3 : 5)) break;
        }
        if (straightCount === (cards.length === 3 ? 3 : 5)) isStraight = true;
        if (cards.length === 5 && ranks.includes(14) && ranks.includes(2) && ranks.includes(3) && ranks.includes(4) && ranks.includes(5)) {
            isStraight = true;
        }
    }

    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: Math.max(...ranks) + 200 }; 
    
    const counts = Object.values(rankCounts);
    if (counts.includes(4)) return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: Math.max(...ranks) + 180 };
    if (counts.includes(3) && counts.includes(2)) return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: Math.max(...ranks) + 160 };
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: Math.max(...ranks) + 140 };
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: (ranks.includes(14) && ranks.includes(2) ? 5 : Math.max(...ranks)) + 120 }; 
    if (counts.includes(3)) return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: Math.max(...ranks) + 100 };
    
    const pairs = counts.filter(c => c === 2).length;
    if (pairs === 2) return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: Math.max(...ranks) + 80 };
    if (pairs === 1) return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: Math.max(...ranks) + 60 };

    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: Math.max(...ranks) };
}

// 辅助函数：从手牌中移除已选的牌
// Line 94:10: 'removeCardsFromHand' is defined but never used no-unused-vars
/* // 暂时注释掉，因为当前 AI 逻辑未使用
function removeCardsFromHand(hand, cardsToRemove) {
    const idsToRemove = new Set(cardsToRemove.map(c => c.id));
    return hand.filter(c => !idsToRemove.has(c));
}
*/

// 辅助函数：生成牌的所有组合 (例如从n张牌中选k张)
// Line 100:10: 'getCombinations' is defined but never used no-unused-vars
/* // 暂时注释掉，因为当前 AI 逻辑未使用
function getCombinations(array, k) {
    // ... (这是一个标准的组合算法，比较复杂，这里暂时跳过，AI会用更启发式的方式)
    // 实际应用中，如果牌少，可以用。对于13选5，组合数很大。
    // 我们这里会用更贪心的方法，而不是枚举所有组合。
    return []; // 占位
}
*/

export function simpleAiArrangeCards(allCards) {
    if (allCards.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }

    let hand = [...allCards]; 
    hand.sort((a, b) => getRankValue(b.value) - getRankValue(a.value)); 

    let bestArrangement = null;
    let bestScore = -1; 

    function tryArrangement(currentHand) {
        let tempHand = [...currentHand];
        let back = [], middle = [], front = [];
        
        back = tempHand.splice(0, 5);
        middle = tempHand.splice(0, 5);
        front = tempHand.splice(0, 3);

        if (front.length === 3 && middle.length === 5 && back.length === 5) {
            const evalFront = evaluateHandSimple(front);
            const evalMiddle = evaluateHandSimple(middle);
            const evalBack = evaluateHandSimple(back);

            if (evalFront.rank <= evalMiddle.rank && evalMiddle.rank <= evalBack.rank) {
                const currentScore = evalBack.rank * 100 + evalMiddle.rank * 10 + evalFront.rank; 
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = {
                        frontHand: evalFront.cards.map(c => c.originalCard || c), 
                        middleHand: evalMiddle.cards.map(c => c.originalCard || c),
                        backHand: evalBack.cards.map(c => c.originalCard || c),
                    };
                }
            }
        }
    }
    
    tryArrangement(hand); 

    if (!bestArrangement) {
        let tempHandForFallback = [...allCards].sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
         bestArrangement = {
            backHand: tempHandForFallback.slice(0, 5),
            middleHand: tempHandForFallback.slice(5, 10),
            frontHand: tempHandForFallback.slice(10, 13),
        };
    }

    return bestArrangement;
}
