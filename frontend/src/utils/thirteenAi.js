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

// --- 确保这个函数被 evaluateHandSimple 调用 ---
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
    // --- 确认调用 ---
    const preparedCards = prepareCardsForEval(cardObjects);
    const ranks = preparedCards.map(c => c.rank);
    const suits = preparedCards.map(c => c.suit);
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    const uniqueRanksSortedAsc = Array.from(new Set(ranks)).sort((a, b) => a - b);
    let primaryRanksForCompare = [...ranks];
    
    const typeWeights = {
        [HAND_TYPE_STRAIGHT_FLUSH]: 90000, [HAND_TYPE_FOUR_OF_A_KIND]: 80000,
        [HAND_TYPE_FULL_HOUSE]: 70000, [HAND_TYPE_FLUSH]: 60000,
        [HAND_TYPE_STRAIGHT]: 50000, [HAND_TYPE_THREE_OF_A_KIND]: 40000,
        [HAND_TYPE_TWO_PAIR]: 30000, [HAND_TYPE_PAIR]: 20000,
        [HAND_TYPE_HIGH_CARD]: 10000, 0: 0
    };
    
    let straightHighRank = Math.max(...ranks); 

    if (uniqueRanksSortedAsc.length >= cardObjects.length) { 
        if (cardObjects.length === 5) {
            if (uniqueRanksSortedAsc.join(',') === '2,3,4,5,14') { 
                isStraight = true;
                straightHighRank = 5; 
                primaryRanksForCompare = [5,4,3,2,1]; 
            } else if (uniqueRanksSortedAsc.length === 5 && uniqueRanksSortedAsc[4] - uniqueRanksSortedAsc[0] === 4) { // 确保是5张不同且连续
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
    
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    
    const countsValues = Object.values(rankCounts);
    // const countsKeys = Object.keys(rankCounts).map(Number).sort((a,b)=>b-a); // 这个如果未使用也可以注释

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
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks }; 
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare };
    
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

export function compareHandsFrontend(eval1, eval2) {
    // ... (保持不变)
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

export function simpleAiArrangeCards(allCardsInput) {
    // ... (保持不变)
    if (allCardsInput.length !== 13) {
        console.error("AI分牌需要13张牌");
        return null;
    }
    const allCards = allCardsInput.map(c => ({ ...c, rank: getRankValue(c.value) }));
    allCards.sort((a, b) => b.rank - a.rank); 
    console.log("AI分牌：使用简化的顺序分配策略。Input cards sample:", allCardsInput[0]);
    const arrangement = {
        backHand: allCards.slice(0, 5).map(c => ({...c})), 
        middleHand: allCards.slice(5, 10).map(c => ({...c})),
        frontHand: allCards.slice(10, 13).map(c => ({...c})),
    };
    console.log("AI Raw Arrangement (before eval):");
    console.log("Front:", JSON.parse(JSON.stringify(arrangement.frontHand.map(c=>`${c.value}_of_${c.suit}`))));
    console.log("Middle:", JSON.parse(JSON.stringify(arrangement.middleHand.map(c=>`${c.value}_of_${c.suit}`))));
    console.log("Back:", JSON.parse(JSON.stringify(arrangement.backHand.map(c=>`${c.value}_of_${c.suit}`))));
    const evalBack = evaluateHandSimple(arrangement.backHand);
    const evalMiddle = evaluateHandSimple(arrangement.middleHand);
    const evalFront = evaluateHandSimple(arrangement.frontHand);
    console.log("AI Evaluated Hands:");
    console.log("Eval Front:", JSON.parse(JSON.stringify(evalFront)));
    console.log("Eval Middle:", JSON.parse(JSON.stringify(evalMiddle)));
    console.log("Eval Back:", JSON.parse(JSON.stringify(evalBack)));
    const frontToMiddleComparison = compareHandsFrontend(evalFront, evalMiddle);
    const middleToBackComparison = compareHandsFrontend(evalMiddle, evalBack);
    if (!(frontToMiddleComparison <= 0 && middleToBackComparison <= 0)) {
        console.error(
            `AI顺序分配后，compareHandsFrontend 比较未通过: 
            Front vs Middle: ${frontToMiddleComparison > 0 ? 'FAIL (Front > Middle)' : 'OK'}, 
            Middle vs Back: ${middleToBackComparison > 0 ? 'FAIL (Middle > Back)' : 'OK'}`,
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    } else {
        console.log(
            `AI顺序分配后，compareHandsFrontend 比较通过:
            Front vs Middle: OK, 
            Middle vs Back: OK`,
            { front: evalFront, middle: evalMiddle, back: evalBack }
        );
    }
    return arrangement;
}
