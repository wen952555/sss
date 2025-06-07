// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple) 保持不变 ---
const HAND_TYPE_HIGH_CARD = 1;
const HAND_TYPE_PAIR = 2;
const HAND_TYPE_TWO_PAIR = 3;
const HAND_TYPE_THREE_OF_A_KIND = 4;
const HAND_TYPE_STRAIGHT = 5;
const HAND_TYPE_FLUSH = 6;
const HAND_TYPE_FULL_HOUSE = 7; // 简单AI暂不优先处理葫芦
const HAND_TYPE_FOUR_OF_A_KIND = 8; // 简单AI暂不优先处理铁支
const HAND_TYPE_STRAIGHT_FLUSH = 9; // 简单AI暂不优先处理同花顺

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
        id: c.id, // 确保 id 传递，方便移除
        originalCard: c 
    }));
    cards.sort((a, b) => b.rank - a.rank); // 默认降序
    return cards;
}

// evaluateHandSimple 返回 { type_code, cards (原始对象), rank (用于简单比较), constituentCards (构成牌型的核心牌，可选)}
function evaluateHandSimple(cardObjects) {
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数" }; 
    }
    const prepared = prepareCardsForEval(cardObjects); // 使用 originalCard 转换回
    const ranks = prepared.map(c => c.rank);
    const suits = prepared.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    
    if (uniqueRanksSortedAsc.length >= cardObjects.length) { // 确保有足够的不同点数的牌
        if (cardObjects.length === 5) {
            // A2345
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') isStraight = true;
            // 正常顺子
            else if (uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4) isStraight = true;
        } else if (cardObjects.length === 3) {
            // A23 或 KQ A (A算14)
            if (uniqueRanksSortedAsc.join(',') === '2,3,14') isStraight = true; // A23
            else if (uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2) isStraight = true;
        }
    }
    
    // 权重，用于AI决策时比较牌型大小
    const typeWeights = {
        [HAND_TYPE_STRAIGHT_FLUSH]: 900, [HAND_TYPE_FOUR_OF_A_KIND]: 800,
        [HAND_TYPE_FULL_HOUSE]: 700, [HAND_TYPE_FLUSH]: 600,
        [HAND_TYPE_STRAIGHT]: 500, [HAND_TYPE_THREE_OF_A_KIND]: 400,
        [HAND_TYPE_TWO_PAIR]: 300, [HAND_TYPE_PAIR]: 200,
        [HAND_TYPE_HIGH_CARD]: 100, 0: 0
    };
    // 返回的 rank 用于AI内部比较，可以更精细，例如牌型权重 + 最高牌点数
    // 注意：这个 evaluateHandSimple 主要为 AI 服务，后端的评估函数才是最终标准

    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + Math.max(...ranks), name: "同花顺" };
    
    const countsValues = Object.values(rankCounts);
    const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); // 牌点降序

    if (countsValues.includes(4)) {
        const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 4));
        return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + quadRank, name: "铁支" };
    }
    if (countsValues.includes(3) && countsValues.includes(2)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tripRank, name: "葫芦" };
    }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花" }; // 实际比较需要比较5张牌
    if (isStraight) {
        const straightHighRank = (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') ? 5 : Math.max(...ranks); // A2345算5高
        return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子" };
    }
    if (countsValues.includes(3)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条" };
    }
    
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) {
        const pairRanks = countsKeys.filter(r => rankCounts[r] === 2);
        return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + Math.max(...pairRanks), name: "两对" }; // 实际比较要看两个对子和单张
    }
    if (numPairs === 1) {
        const pairRank = countsKeys.find(r => rankCounts[r] === 2);
        return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子" }; // 实际比较要看对子和三张单张
    }

    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙" };
}

// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的引用或ID)
function removeSelectedCards(sourceHand, selectedCards) {
    const selectedIds = new Set(selectedCards.map(c => c.id));
    return sourceHand.filter(c => !selectedIds.has(c));
}

// 辅助函数：生成组合 C(n,k) - 这个函数在牌多时性能较低，谨慎使用
function combinations(sourceArray, k) {
    if (k === 0) return [[]];
    if (sourceArray.length < k) return [];

    const result = [];
    function pick(startIndex, currentCombo) {
        if (currentCombo.length === k) {
            result.push([...currentCombo]);
            return;
        }
        if (startIndex >= sourceArray.length) return;

        // Pick current element
        currentCombo.push(sourceArray[startIndex]);
        pick(startIndex + 1, currentCombo);
        currentCombo.pop();

        // Skip current element
        pick(startIndex + 1, currentCombo);
    }
    pick(0, []);
    return result;
}


// 主要AI逻辑
export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    // 确保我们操作的是包含所有必要信息的卡片对象副本
    const allCards = allCardsInput.map(c => ({ ...c, rank: getRankValue(c.value) }));
    allCards.sort((a, b) => b.rank - a.rank); // 从大到小排序

    let bestArrangement = null;
    let bestArrangementScore = -Infinity;

    // 尝试所有可能的后墩组合 (C(13,5) = 1287)
    const backCombinations = combinations(allCards, 5);

    for (const backTry of backCombinations) {
        const evalBack = evaluateHandSimple(backTry);
        const remainingAfterBack = removeSelectedCards(allCards, backTry);

        // 尝试所有可能的中墩组合 (C(8,5) = 56)
        const middleCombinations = combinations(remainingAfterBack, 5);

        for (const middleTry of middleCombinations) {
            const evalMiddle = evaluateHandSimple(middleTry);

            // 检查中墩是否小于等于后墩 (使用简化的 rank 比较)
            if (evalMiddle.rank > evalBack.rank) continue; 
            // TODO: 这里应该使用更严格的十三水牌墩比较规则，而不仅仅是 rank

            const frontTry = removeSelectedCards(remainingAfterBack, middleTry);
            if (frontTry.length !== 3) continue; // 确保剩余3张牌

            const evalFront = evaluateHandSimple(frontTry);

            // 检查前墩是否小于等于中墩
            if (evalFront.rank > evalMiddle.rank) continue;
            // TODO: 同上，应使用严格比较

            // 找到了一个合法的排列
            // 计算一个分数来评估这个排列的好坏 (这里只是一个示例，可以更复杂)
            // 例如，优先特殊牌型，或总的“牌力”
            const currentScore = evalBack.rank * 10000 + evalMiddle.rank * 100 + evalFront.rank;

            if (currentScore > bestArrangementScore) {
                bestArrangementScore = currentScore;
                bestArrangement = {
                    frontHand: frontTry.map(c => c.originalCard || c), // 返回原始卡片对象
                    middleHand: middleTry.map(c => c.originalCard || c),
                    backHand: backTry.map(c => c.originalCard || c),
                };
            }
        }
    }

    // 如果通过组合没有找到任何合法解（理论上不太可能，除非 evaluateHandSimple 或比较逻辑有误）
    // 则回退到最简单的按大小顺序分配
    if (!bestArrangement) {
        console.warn("AI未能通过组合找到合法解，回退到顺序分配。");
        let tempHandForFallback = [...allCardsInput].sort((a, b) => getRankValue(b.value) - getRankValue(a.value));
        bestArrangement = {
            backHand: tempHandForFallback.slice(0, 5),
            middleHand: tempHandForFallback.slice(5, 10),
            frontHand: tempHandForFallback.slice(10, 13),
        };
    }

    return bestArrangement;
}
