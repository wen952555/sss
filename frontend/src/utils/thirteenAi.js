// frontend/src/utils/thirteenAi.js

// 简化的牌型代码 (与后端对应，但可能不完全一致)
const HAND_TYPE_HIGH_CARD = 1;
const HAND_TYPE_PAIR = 2;
const HAND_TYPE_TWO_PAIR = 3;
const HAND_TYPE_THREE_OF_A_KIND = 4;
const HAND_TYPE_STRAIGHT = 5;
const HAND_TYPE_FLUSH = 6;
const HAND_TYPE_FULL_HOUSE = 7;
const HAND_TYPE_FOUR_OF_A_KIND = 8;
const HAND_TYPE_STRAIGHT_FLUSH = 9;

// 辅助函数：获取牌的rankValue (A=14, K=13, ..., 2=2)
// (这个函数已在后端 deck.php 中存在，前端也需要一个)
function getRankValue(value) {
    if (!isNaN(parseInt(value))) return parseInt(value);
    if (value === 'jack') return 11;
    if (value === 'queen') return 12;
    if (value === 'king') return 13;
    if (value === 'ace') return 14;
    return 0;
}

// 辅助函数：准备卡片数据 (主要获取rank和suit) 并排序
// card 对象期望有 value 和 suit 属性
function prepareCardsForEval(cardObjects) {
    if (!cardObjects || cardObjects.length === 0) return [];
    const cards = cardObjects.map(c => ({
        rank: getRankValue(c.value),
        suit: c.suit,
        originalCard: c // 保留原始卡片对象
    }));
    // 按 rankValue 降序排序
    cards.sort((a, b) => b.rank - a.rank);
    return cards;
}

// 简化的前端牌型评估函数 (不包含与后端完全一致的primary_ranks比较逻辑，主要用于AI决策)
// 返回一个包含 type_code 和 cards (属于该牌型的牌) 的对象
function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: [], rank: 0 }; // rank 用于简单比较
    }
    const cards = prepareCardsForEval(cardObjects);
    const ranks = cards.map(c => c.rank);
    const suits = cards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueSortedRanks = Array.from(new Set(ranks)).sort((a, b) => a - b); // 升序
    if (uniqueSortedRanks.length >= (cards.length === 3 ? 3 : 5)) { // 至少需要3或5张不同牌才能构成顺子
        let straightCount = 1;
        let currentRank = uniqueSortedRanks[0];
        for (let i = 1; i < uniqueSortedRanks.length; i++) {
            if (uniqueSortedRanks[i] === currentRank + 1) {
                straightCount++;
                currentRank = uniqueSortedRanks[i];
            } else if (straightCount < (cards.length === 3 ? 3 : 5)) { // 如果断了，且还没构成顺子
                straightCount = 1; // 重置
                currentRank = uniqueSortedRanks[i];
            }
            if (straightCount === (cards.length === 3 ? 3 : 5)) break;
        }
        if (straightCount === (cards.length === 3 ? 3 : 5)) isStraight = true;
        // A2345 顺子 (A算1)
        if (cards.length === 5 && ranks.includes(14) && ranks.includes(2) && ranks.includes(3) && ranks.includes(4) && ranks.includes(5)) {
            isStraight = true;
        }
    }


    // 评估逻辑 (简化版)
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: Math.max(...ranks) + 200 }; // 加权
    
    const counts = Object.values(rankCounts);
    if (counts.includes(4)) return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: Math.max(...ranks) + 180 };
    if (counts.includes(3) && counts.includes(2)) return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: Math.max(...ranks) + 160 };
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: Math.max(...ranks) + 140 };
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: (ranks.includes(14) && ranks.includes(2) ? 5 : Math.max(...ranks)) + 120 }; // A2345算5高
    if (counts.includes(3)) return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: Math.max(...ranks) + 100 };
    
    const pairs = counts.filter(c => c === 2).length;
    if (pairs === 2) return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: Math.max(...ranks) + 80 };
    if (pairs === 1) return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: Math.max(...ranks) + 60 };

    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: Math.max(...ranks) };
}


// 辅助函数：从手牌中移除已选的牌
function removeCardsFromHand(hand, cardsToRemove) {
    const idsToRemove = new Set(cardsToRemove.map(c => c.id));
    return hand.filter(c => !idsToRemove.has(c));
}

// 辅助函数：生成牌的所有组合 (例如从n张牌中选k张)
function getCombinations(array, k) {
    // ... (这是一个标准的组合算法，比较复杂，这里暂时跳过，AI会用更启发式的方式)
    // 实际应用中，如果牌少，可以用。对于13选5，组合数很大。
    // 我们这里会用更贪心的方法，而不是枚举所有组合。
    return []; // 占位
}

// 基础AI分牌逻辑
export function simpleAiArrangeCards(allCards) {
    if (allCards.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }

    let hand = [...allCards]; // 创建副本进行操作
    hand.sort((a, b) => getRankValue(b.value) - getRankValue(a.value)); // 按牌面从大到小排序

    let bestArrangement = null;
    let bestScore = -1; // 用于比较不同尝试的“好坏”，这里简化为后墩牌型大小

    // 这是一个非常简化的尝试，实际AI会复杂得多
    // 尝试不同的后墩组合
    // 策略：尝试找到最好的5张牌作为后墩，然后是中墩，最后是前墩

    // 简化：我们不枚举所有组合，而是尝试构建一个合法的解
    // 这是一个非常初步的贪心策略，远非最优
    
    // 尝试1: 找最大的5张牌做后墩，次大的5张做中墩 (非常粗糙)
    function tryArrangement(currentHand) {
        let tempHand = [...currentHand];
        let back = [], middle = [], front = [];

        // 简化：按顺序尝试填充
        // 1. 尝试为后墩挑选最强的牌 (不一定是最优组合)
        //    这里我们只是简单地从排序后的手牌中取牌，实际AI会找最佳组合
        
        // 后墩 (5张)
        // 这是一个非常简单的分配，实际AI会找最佳牌型
        back = tempHand.splice(0, 5);
        
        // 中墩 (5张)
        middle = tempHand.splice(0, 5);
        
        // 前墩 (3张)
        front = tempHand.splice(0, 3);

        if (front.length === 3 && middle.length === 5 && back.length === 5) {
            const evalFront = evaluateHandSimple(front);
            const evalMiddle = evaluateHandSimple(middle);
            const evalBack = evaluateHandSimple(back);

            // 简单比较牌墩的rank值 (注意：这不是严格的十三水比较)
            if (evalFront.rank <= evalMiddle.rank && evalMiddle.rank <= evalBack.rank) {
                // 找到一个合法解
                const currentScore = evalBack.rank * 100 + evalMiddle.rank * 10 + evalFront.rank; // 简单评分
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = {
                        frontHand: evalFront.cards.map(c => c.originalCard || c), // 确保返回原始卡片对象
                        middleHand: evalMiddle.cards.map(c => c.originalCard || c),
                        backHand: evalBack.cards.map(c => c.originalCard || c),
                    };
                }
            }
        }
    }
    
    tryArrangement(hand); // 第一次尝试

    // TODO: 实现更智能的组合查找逻辑
    // 例如，优先找同花顺、铁支、葫芦等放入后墩，然后处理中墩和前墩
    // 这需要更复杂的搜索和回溯

    // 如果第一次尝试失败，可以尝试打乱顺序再试几次，或实现更高级算法
    if (!bestArrangement) {
        // 简单的回退：如果上面的简单分配不合法，就按顺序分
        let tempHandForFallback = [...allCards].sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
         bestArrangement = {
            backHand: tempHandForFallback.slice(0, 5),
            middleHand: tempHandForFallback.slice(5, 10),
            frontHand: tempHandForFallback.slice(10, 13),
        };
    }


    // 确保返回的牌与原牌对象一致 (如果 evaluateHandSimple 返回的是处理过的 card)
    // （在 evaluateHandSimple 中已通过 originalCard 处理）

    return bestArrangement;
}

// 示例：更复杂的组合生成和评估可以放在这里
// function findBestFiveCardHand(cards) { ... }
// function findBestThreeCardHand(cards) { ... }
