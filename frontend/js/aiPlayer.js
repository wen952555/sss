// frontend/js/aiPlayer.js
import { DUN_IDS, HAND_TYPES } from './constants.js';
import { sortCards } from './cardUtils.js';
import { evaluateHand, compareSingleHands } from './handEvaluator.js';

// AI 难度级别 (可以扩展)
export const AI_DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    // HARD: 'hard'
};

/**
 * AI 核心摆牌逻辑
 * @param {Array<Object>} hand - AI的13张手牌数据
 * @param {string} difficulty - AI难度
 * @returns {Object|null} - { front: [card1, card2, card3], middle: [...5 cards], back: [...5 cards] } or null if error
 */
export function getAIMoves(hand, difficulty = AI_DIFFICULTY.MEDIUM) {
    if (!hand || hand.length !== 13) {
        console.error("AI Error: Invalid hand provided.");
        return null;
    }

    let arrangedHand = null;

    // 尝试不同的摆牌策略，可以根据难度选择
    if (difficulty === AI_DIFFICULTY.EASY) {
        arrangedHand =擺牌策略_简单随机合法(hand);
    } else if (difficulty === AI_DIFFICULTY.MEDIUM) {
        // 尝试更优策略：先找好牌型放尾墩，再中墩，最后头墩
        arrangedHand = 擺牌策略_中等优化(hand);
    }
    // else if (difficulty === AI_DIFFICULTY.HARD) {
    // arrangedHand = getHardAIMoves(hand); // 更复杂的策略
    // }

    if (arrangedHand && isValidArrangement(arrangedHand.front, arrangedHand.middle, arrangedHand.back)) {
        return arrangedHand;
    } else {
        // 如果优化策略失败，尝试使用保底的随机合法策略
        console.warn("AI: Optimized strategy failed or produced invalid hand, falling back to simple valid strategy.");
        arrangedHand = 擺牌策略_简单随机合法(hand);
        if (arrangedHand && isValidArrangement(arrangedHand.front, arrangedHand.middle, arrangedHand.back)) {
            return arrangedHand;
        }
    }
    
    console.error("AI Error: Could not determine a valid move.");
    return null; // 最终无法摆出合法牌
}

// 内部函数：检查AI摆牌是否合法 (头<中<尾)
function isValidArrangement(frontCards, middleCards, backCards) {
    if (frontCards.length !== 3 || middleCards.length !== 5 || backCards.length !== 5) return false;

    const frontEval = evaluateHand(frontCards, DUN_IDS.FRONT);
    const middleEval = evaluateHand(middleCards, DUN_IDS.MIDDLE);
    const backEval = evaluateHand(backCards, DUN_IDS.BACK);

    if (frontEval.type.value === HAND_TYPES.INVALID.value || 
        middleEval.type.value === HAND_TYPES.INVALID.value || 
        backEval.type.value === HAND_TYPES.INVALID.value) return false;

    if (compareSingleHands(frontEval, middleEval) > 0) return false; // 头 > 中
    if (compareSingleHands(middleEval, backEval) > 0) return false; // 中 > 尾
    return true;
}


// --- AI 摆牌策略 ---

// 策略1：简单随机合法摆牌 (保底策略)
// 随机将牌放入三墩，然后调整直到合法或尝试次数用尽
function 擺牌策略_简单随机合法(initialHand) {
    let hand = [...initialHand];
    let attempts = 0;
    const maxAttempts = 1000; // 防止无限循环

    while (attempts < maxAttempts) {
        attempts++;
        shuffleArray(hand); // 打乱手牌顺序

        let front = hand.slice(0, 3);
        let middle = hand.slice(3, 8);
        let back = hand.slice(8, 13);
        
        // 初步排序墩内牌，便于评估 (可选，evaluateHand内部会排序)
        // front = sortCards(front);
        // middle = sortCards(middle);
        // back = sortCards(back);

        if (isValidArrangement(front, middle, back)) {
            // console.log("AI (SimpleRandom): Found valid hand in attempts:", attempts);
            return { front, middle, back };
        }
    }
    console.warn("AI (SimpleRandom): Max attempts reached, couldn't find valid arrangement easily.");
    // 如果多次随机都失败，尝试一种更结构化的方式（例如，最大的牌放尾墩等）
    // 但这里为了简单，如果随机失败则可能返回null，由调用者处理
    // 更好的做法是有一个绝对能成功的（即使很差）的摆法
    return 擺牌策略_保底最差(initialHand); // 调用一个绝对能摆出牌的（可能倒水）
}

// 策略1.1: 绝对保底策略 (确保能摆出牌，即使可能是倒水，但getAIMoves会校验)
// 将最大的牌放尾，次大放中，最小放头 (不考虑牌型)
function 擺牌策略_保底最差(initialHand) {
    let sortedHand = sortCards([...initialHand]); // 从大到小排序
    return {
        front: [sortedHand[10], sortedHand[11], sortedHand[12]], // 最小的3张
        middle: [sortedHand[5], sortedHand[6], sortedHand[7], sortedHand[8], sortedHand[9]],
        back: [sortedHand[0], sortedHand[1], sortedHand[2], sortedHand[3], sortedHand[4]] // 最大的5张
    };
}


// 策略2：中等优化策略
// 尝试从所有可能的组合中找到一个较好的、合法的摆法
// 这会比较复杂，我们先简化：
// 1. 找出所有可能的尾墩组合(5张)，评估其牌力。
// 2. 对每个尾墩，从剩余的牌中找出所有可能的中墩组合(5张)，评估。
// 3. 对每个中墩，剩余的3张作为头墩，评估。
// 4. 找到符合 头<=中<=尾 的组合，并选择一个总牌力较优的。
// 由于组合数巨大，需要启发式搜索或简化。

// 简化版中等策略：
// - 优先组成最好的尾墩牌型
// - 然后从剩下牌组成最好的中墩
// - 最后头墩
// - 如果不合法，则降级尝试，或交换牌张调整
function 擺牌策略_中等优化(initialHand) {
    const allCards = [...initialHand];
    let bestArrangement = null;
    let bestScore = -Infinity; // 用于评估摆法的总“强度”

    // 这是一个非常简化的迭代，实际AI会复杂得多
    // 我们可以尝试生成一些有潜力的牌墩，然后组合
    // 例如，找出所有可能的顺子、同花、葫芦等

    // 尝试1: 优先组合同花顺/铁支/葫芦放尾墩
    const potentialStrongHands = findPotentialStrongDuns(allCards, 5);
    potentialStrongHands.sort((a, b) => compareSingleHands(evaluateHand(b, DUN_IDS.BACK), evaluateHand(a, DUN_IDS.BACK))); // 按牌力排序

    for (const backCandidate of potentialStrongHands) {
        if (!backCandidate || backCandidate.length !== 5) continue;
        const remainingAfterBack = 빼除卡牌(allCards, backCandidate);
        if (remainingAfterBack.length !== 8) continue;

        const potentialMiddleHands = findPotentialStrongDuns(remainingAfterBack, 5);
        potentialMiddleHands.sort((a, b) => compareSingleHands(evaluateHand(b, DUN_IDS.MIDDLE), evaluateHand(a, DUN_IDS.MIDDLE)));

        for (const middleCandidate of potentialMiddleHands) {
            if (!middleCandidate || middleCandidate.length !== 5) continue;
            const frontCandidate = 빼除卡牌(remainingAfterBack, middleCandidate);
            if (frontCandidate.length !== 3) continue;

            if (isValidArrangement(frontCandidate, middleCandidate, backCandidate)) {
                // 计算一个当前摆法的“分数”，用于选择 (简化：各墩牌型value之和)
                const currentScore = evaluateHand(frontCandidate, DUN_IDS.FRONT).type.value +
                                     evaluateHand(middleCandidate, DUN_IDS.MIDDLE).type.value +
                                     evaluateHand(backCandidate, DUN_IDS.BACK).type.value;
                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestArrangement = { front: frontCandidate, middle: middleCandidate, back: backCandidate };
                }
            }
        }
    }
    
    if (bestArrangement) {
        // console.log("AI (Medium): Found an optimized arrangement.");
        return bestArrangement;
    }

    // 如果上面的策略没找到，退回简单策略
    // console.log("AI (Medium): Optimized search failed, using simple valid strategy.");
    return 擺牌策略_简单随机合法(initialHand);
}

// 辅助函数：从牌池中移除指定的牌
function 빼除卡牌(sourceCards, cardsToRemove) {
    const remaining = [...sourceCards];
    for (const cardToRemove of cardsToRemove) {
        const index = remaining.findIndex(c => c.id === cardToRemove.id);
        if (index > -1) {
            remaining.splice(index, 1);
        }
    }
    return remaining;
}

// 辅助函数：找到指定数量牌中可能的最强牌型组合 (简化版，只找几种)
// 实际应用中，这个函数需要非常复杂，能找出所有可能的牌型
function findPotentialStrongDuns(cards, numCardsToSelect) {
    if (cards.length < numCardsToSelect) return [];
    const combinations = [];
    
    // 这是一个简化的暴力组合生成器，对于13选5 (C(13,5)=1287) 还行
    // 但对于更复杂的AI，需要更高效的方法
    function generateCombinations(startIndex, currentCombination) {
        if (currentCombination.length === numCardsToSelect) {
            combinations.push([...currentCombination]);
            return;
        }
        if (startIndex >= cards.length) {
            return;
        }
        // Include cards[startIndex]
        currentCombination.push(cards[startIndex]);
        generateCombinations(startIndex + 1, currentCombination);
        currentCombination.pop(); // Backtrack

        // Exclude cards[startIndex] (if enough remaining to form combination)
        if (cards.length - (startIndex + 1) >= numCardsToSelect - currentCombination.length) {
            generateCombinations(startIndex + 1, currentCombination);
        }
    }

    generateCombinations(0, []);
    
    // 进一步优化：只返回评估后牌力较强的组合
    // 这里返回所有组合，让调用者排序
    return combinations;
}


// 辅助函数：打乱数组 (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
