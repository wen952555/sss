// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval) 保持不变 ---
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
    // 确保返回的卡片对象包含所有原始属性，尤其是 id, imageName 等 Card 组件需要的
    const cards = cardObjects.map(c => ({
        ...c, // 展开原始卡片所有属性
        rank: getRankValue(c.value),
        // originalCard: c // 如果 c 本身就是原始对象，则不需要再包一层 originalCard
    }));
    cards.sort((a, b) => b.rank - a.rank); 
    return cards;
}

export function evaluateHandSimple(cardObjects) { 
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数" }; 
    }
    // 使用 prepareCardsForEval 来确保我们处理的是包含 rank 的完整卡片对象
    const preparedCards = prepareCardsForEval(cardObjects); 
    const ranks = preparedCards.map(c => c.rank);
    const suits = preparedCards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    
    // --- 修改点：调整 typeWeights，增大牌型之间的区分度 ---
    const typeWeights = {
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000, 0: 0
    };
    // rank 的计算：牌型权重 + 主要贡献牌的点数 (对于多张牌贡献的，取最大的)
    // 确保点数部分不会轻易超过牌型权重差异
    
    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') isStraight = true;
            else if (uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4 && uniqueRanksSortedAsc.length === 5) isStraight = true; 
        } else if (cardObjects.length === 3) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,14' && uniqueRanksSortedAsc.length === 3) isStraight = true; 
            else if (uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2 && uniqueRanksSortedAsc.length === 3) isStraight = true;
        }
    }
    
    // --- 修改点：确保返回的 cards 是原始传入的 cardObjects，因为它们已包含所有信息 ---
    // --- rank 计算也基于 ranks (来自 preparedCards) ---
    let primaryRankComponent = Math.max(...ranks); // 默认取最大单张牌
    if (ranks.includes(14) && ranks.includes(2) && isStraight && cardObjects.length === 5) { // A2345顺子
        primaryRankComponent = 5; // A2345顺子以5为最高牌点进行比较
    }


    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + primaryRankComponent, name: "同花顺" };
    
    const countsValues = Object.values(rankCounts);
    // const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); 

    if (countsValues.includes(4)) {
        const quadRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 4));
        return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + quadRank, name: "铁支" };
    }
    if (countsValues.includes(3) && countsValues.includes(2)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tripRank, name: "葫芦" };
    }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + primaryRankComponent, name: "同花" }; 
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + primaryRankComponent, name: "顺子" };
    
    if (countsValues.includes(3)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条" };
    }
    
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) {
        const pairRanks = Object.keys(rankCounts).filter(key => rankCounts[key] === 2).map(Number);
        return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + Math.max(...pairRanks), name: "两对" }; 
    }
    if (numPairs === 1) {
        const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2));
        return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子" }; 
    }

    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + primaryRankComponent, name: "乌龙" };
}

export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    // --- 修改点：确保 allCards 中的对象是包含所有原始属性的副本 ---
    // GameBoard 中 allPlayerCards 已经是完整的卡片对象了
    // AI内部操作时，如果需要修改卡片对象（比如添加临时的AI评分），应该先深拷贝
    // 但这里我们只是排序和切片，所以浅拷贝 allCardsInput 即可
    const allCards = [...allCardsInput].sort((a, b) => getRankValue(b.value) - getRankValue(a.value)); 

    console.log("AI分牌：使用简化的顺序分配策略。");

    const arrangement = {
        // slice 会创建新的数组，但数组内的对象仍然是 allCards 中的引用
        // 这对于 Card 组件是OK的，因为它需要原始的卡片属性
        backHand: allCards.slice(0, 5),
        middleHand: allCards.slice(5, 10),
        frontHand: allCards.slice(10, 13),
    };
    
    // 验证返回的卡片对象是否完整
    // console.log("AI generated backHand sample card:", arrangement.backHand[0]);

    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);

    // 使用 console.error 方便在浏览器中高亮查看
    if (!(evalFront.rank <= evalMiddle.rank && evalMiddle.rank <= evalBack.rank)) {
        console.error("AI顺序分配后，rank比较未通过:", 
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    } else {
        console.log("AI顺序分配后，rank比较通过:",
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    }

    return arrangement;
}
