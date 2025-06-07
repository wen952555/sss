// frontend/src/utils/thirteenAi.js

// --- 牌型代码和基础辅助函数 (getRankValue, prepareCardsForEval, evaluateHandSimple) ---
// (这些与上一个版本相同，此处省略以保持简洁，但确保它们存在且 evaluateHandSimple 已导出)
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
        ...c, 
        rank: getRankValue(c.value),
    }));
    cards.sort((a, b) => b.rank - a.rank); 
    return cards;
}

// evaluateHandSimple 现在需要返回更详细的牌面信息用于比较，例如 primary_ranks
export function evaluateHandSimple(cardObjects) { 
    if (!cardObjects || (cardObjects.length !== 3 && cardObjects.length !== 5)) {
        return { type_code: 0, cards: cardObjects, rank: 0, name: "无效牌数", primary_ranks: [] }; 
    }
    const preparedCards = prepareCardsForEval(cardObjects); 
    const ranks = preparedCards.map(c => c.rank); // 已经是降序的
    const suits = preparedCards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    let primaryRanksForCompare = [...ranks]; // 默认用所有牌的降序rank比较乌龙和同花

    const typeWeights = { /* ... (与上一版本相同) ... */
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000, 0: 0
    };
    
    let straightHighRank = Math.max(...ranks); // 默认顺子最高牌

    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') { // A2345
                isStraight = true;
                straightHighRank = 5; // A2345顺子以5为最高牌点进行比较
                primaryRanksForCompare = [5,4,3,2,1]; // 用于比较的特殊ranks
            } else if (uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4 && uniqueRanksSortedAsc.length === 5) {
                isStraight = true;
                primaryRanksForCompare = [ranks[0]]; // 正常顺子比最大牌
            }
        } else if (cardObjects.length === 3) { // 前墩顺子
            if (uniqueRanksSortedAsc.join(',') === '2,3,14' && uniqueRanksSortedAsc.length === 3) { // A23
                isStraight = true;
                straightHighRank = 3; // A23顺子以3为最高牌点比较 (或者按规则定)
                primaryRanksForCompare = [3,2,1];
            } else if (uniqueRanksSortedAsc[2] - uniqueRanksSortedAsc[0] === 2 && uniqueRanksSortedAsc.length === 3) {
                isStraight = true;
                primaryRanksForCompare = [ranks[0]];
            }
        }
    }
    
    if (isStraight && isFlush) {
        // 同花顺的 primary_ranks 同顺子
        return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    }
    
    const countsValues = Object.values(rankCounts);
    // const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); 

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
        // primary_ranks 已经是 ranks (所有牌降序)
        return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; 
    }
    if (isStraight) {
        // primary_ranks 已在上面isStraight判断中设置
        return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare };
    }
    
    if (countsValues.includes(3)) {
        const tripRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 3));
        const kickers = ranks.filter(r => r !== tripRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 3);
        primaryRanksForCompare = [tripRank, ...kickers];
        return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tripRank, name: "三条", primary_ranks: primaryRanksForCompare };
    }
    
    const numPairs = countsValues.filter(c => c === 2).length;
    if (numPairs === 2) { // 两对
        const pairRanks = Object.keys(rankCounts).filter(key => rankCounts[key] === 2).map(Number).sort((a,b)=>b-a);
        const kicker = ranks.find(r => !pairRanks.includes(r));
        primaryRanksForCompare = [...pairRanks, kicker].filter(r => r !== undefined);
        return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pairRanks[0], name: "两对", primary_ranks: primaryRanksForCompare }; 
    }
    if (numPairs === 1) { // 对子
        const pairRank = Number(Object.keys(rankCounts).find(key => rankCounts[key] === 2));
        const kickers = ranks.filter(r => r !== pairRank).sort((a,b)=>b-a).slice(0, cardObjects.length - 2);
        primaryRanksForCompare = [pairRank, ...kickers];
        return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pairRank, name: "对子", primary_ranks: primaryRanksForCompare }; 
    }

    // 乌龙，primary_ranks 已经是 ranks (所有牌降序)
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

// --- 新增：前端墩牌比较函数 ---
// eval1 和 eval2 是 evaluateHandSimple 返回的对象
// 返回值：1 (eval1 > eval2), -1 (eval1 < eval2), 0 (eval1 == eval2)
export function compareHandsFrontend(eval1, eval2) {
    if (!eval1 || !eval2) return 0; // 防御性编程

    // 1. 比较牌型代码
    if (eval1.type_code > eval2.type_code) return 1;
    if (eval1.type_code < eval2.type_code) return -1;

    // 2. 牌型代码相同，比较 primary_ranks
    // primary_ranks 应该是按重要性排序的牌点
    if (eval1.primary_ranks && eval2.primary_ranks) {
        for (let i = 0; i < Math.min(eval1.primary_ranks.length, eval2.primary_ranks.length); i++) {
            if (eval1.primary_ranks[i] > eval2.primary_ranks[i]) return 1;
            if (eval1.primary_ranks[i] < eval2.primary_ranks[i]) return -1;
        }
        // 如果主要比较牌面都相同，理论上相等（除非十三水有比花色的规则，这里不考虑）
        // 或者可以根据 primary_ranks 的长度来决定（例如，更长的 kicker 序列）
        // 但对于标准比较，到这里通常就是相等了
    }
    return 0; // 牌型和主要比较牌面都相同
}


export function simpleAiArrangeCards(allCardsInput) {
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    
    const allCards = [...allCardsInput].sort((a, b) => getRankValue(b.value) - getRankValue(a.value)); 

    console.log("AI分牌：使用简化的顺序分配策略。");

    const arrangement = {
        backHand: allCards.slice(0, 5),
        middleHand: allCards.slice(5, 10),
        frontHand: allCards.slice(10, 13),
    };
    
    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);

    // --- 修改点：使用新的比较函数 ---
    if (!(compareHandsFrontend(evalFront, evalMiddle) <= 0 && compareHandsFrontend(evalMiddle, evalBack) <= 0)) {
        console.error("AI顺序分配后，compareHandsFrontend 比较未通过:", 
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    } else {
        console.log("AI顺序分配后，compareHandsFrontend 比较通过:",
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    }

    return arrangement;
}
