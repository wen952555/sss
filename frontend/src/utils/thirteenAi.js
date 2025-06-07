// frontend/src/utils/thirteenAi.js

// --- 牌型代码 ---
// (这些常量定义与上一版本一致，包含 eslint-disable-next-line no-unused-vars 注释)
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
    // (这里的 evaluateHandSimple 函数体与上一次提供给您的版本完全一致，
    //  它内部调用了 prepareCardsForEval，并返回包含 type_code, cards, name, primary_ranks, rank 的对象。
    //  为简洁起见，此处省略其具体实现，请确保您使用的是包含所有牌型判断的完整版本。)
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
    const typeWeights = { /* ... (同上一版本) ... */ };
    let straightHighRank = Math.max(...ranks); 
    if (ranks.includes(14) && ranks.includes(2) && ranks.length === 5) { const oR = ranks.filter(r=>r!==14&&r!==2).sort((a,b)=>a-b); if (oR.length===3&&oR[0]===3&&oR[1]===4&&oR[2]===5){ straightHighRank = 5;}}
    if (uniqueRanksSortedAsc.length >= cardObjects.length) { if (cardObjects.length === 5) { if (uniqueRanksSortedAsc.join(',')==='2,3,4,5,14'){isStraight=true;primaryRanksForCompare=[5,4,3,2,1];} else if (uniqueRanksSortedAsc.length===5&&uniqueRanksSortedAsc[4]-uniqueRanksSortedAsc[0]===4){isStraight=true;primaryRanksForCompare=[ranks[0]];}} else if (cardObjects.length === 3) { if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc.join(',')==='2,3,14'){isStraight=true;straightHighRank=3;primaryRanksForCompare=[3,2,1];} else if (uniqueRanksSortedAsc.length===3&&uniqueRanksSortedAsc[2]-uniqueRanksSortedAsc[0]===2){isStraight=true;primaryRanksForCompare=[ranks[0]];}}}
    if (isStraight && isFlush) return { type_code: HAND_TYPE_STRAIGHT_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT_FLUSH] + straightHighRank, name: "同花顺", primary_ranks: primaryRanksForCompare };
    const cV = Object.values(rankCounts);
    if (cV.includes(4)) { const qR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===4)); const k_=ranks.find(r=>r!==qR); primaryRanksForCompare=[qR,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_FOUR_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_FOUR_OF_A_KIND] + qR, name: "铁支", primary_ranks: primaryRanksForCompare }; }
    if (cV.includes(3) && cV.includes(2)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); primaryRanksForCompare=[tR,pR]; return { type_code: HAND_TYPE_FULL_HOUSE, cards: cardObjects, rank: typeWeights[HAND_TYPE_FULL_HOUSE] + tR, name: "葫芦", primary_ranks: primaryRanksForCompare }; }
    if (isFlush) return { type_code: HAND_TYPE_FLUSH, cards: cardObjects, rank: typeWeights[HAND_TYPE_FLUSH] + Math.max(...ranks), name: "同花", primary_ranks: ranks };
    if (isStraight) return { type_code: HAND_TYPE_STRAIGHT, cards: cardObjects, rank: typeWeights[HAND_TYPE_STRAIGHT] + straightHighRank, name: "顺子", primary_ranks: primaryRanksForCompare };
    if (cV.includes(3)) { const tR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===3)); const ks_=ranks.filter(r=>r!==tR).sort((a,b)=>b-a).slice(0,cardObjects.length-3); primaryRanksForCompare=[tR,...ks_]; return { type_code: HAND_TYPE_THREE_OF_A_KIND, cards: cardObjects, rank: typeWeights[HAND_TYPE_THREE_OF_A_KIND] + tR, name: "三条", primary_ranks: primaryRanksForCompare }; }
    const nPs=cV.filter(c=>c===2).length;
    if (nPs===2) { const pRs=Object.keys(rankCounts).filter(k=>rankCounts[k]===2).map(Number).sort((a,b)=>b-a); const k_=ranks.find(r=>!pRs.includes(r)); primaryRanksForCompare=[...pRs,k_].filter(r=>r!==undefined); return { type_code: HAND_TYPE_TWO_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_TWO_PAIR] + pRs[0], name: "两对", primary_ranks: primaryRanksForCompare }; }
    if (nPs===1) { const pR=Number(Object.keys(rankCounts).find(k=>rankCounts[k]===2)); const ks_=ranks.filter(r=>r!==pR).sort((a,b)=>b-a).slice(0,cardObjects.length-2); primaryRanksForCompare=[pR,...ks_]; return { type_code: HAND_TYPE_PAIR, cards: cardObjects, rank: typeWeights[HAND_TYPE_PAIR] + pR, name: "对子", primary_ranks: primaryRanksForCompare }; }
    return { type_code: HAND_TYPE_HIGH_CARD, cards: cardObjects, rank: typeWeights[HAND_TYPE_HIGH_CARD] + Math.max(...ranks), name: "乌龙", primary_ranks: ranks };
}

export function compareHandsFrontend(eval1, eval2, context = "") {
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

// 辅助函数：Fisher-Yates Shuffle 洗牌算法
// --- 修改点：暂时注释掉 shuffleArray 函数的定义 ---
/* // Line 147 (según el log anterior)
function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; 
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}
*/

// 辅助函数：生成组合 C(n,k) - 被 simpleAiArrangeCards 调用
function combinations(sourceArray, k) { /* ... (与上一版本相同，确保存在) ... */ }

// 辅助函数：从手牌中移除已选的牌 (基于卡片对象的 id) - 被 simpleAiArrangeCards 调用
function removeSelectedCards(sourceHand, selectedCards) { /* ... (与上一版本相同，确保存在) ... */ }

// 主要AI逻辑 - 改进版 (基于组合搜索)
export function simpleAiArrangeCards(allCardsInput) {
    // (这里的 simpleAiArrangeCards 函数体与上一次提供给您的、包含组合搜索的版本完全一致。
    //  它内部调用了 combinations, removeSelectedCards, evaluateHandSimple, compareHandsFrontend,
    //  并且在最后有一个 else 分支调用了 fallbackArrangement。
    //  为简洁起见，此处省略其具体实现，请确保您使用的是那个完整版本。)
    if (allCardsInput.length !== 13) { console.error("AI分牌需要13张牌"); return null; }
    const allCards = allCardsInput.map(c => ({ ...c, id: c.id || `${c.value}_of_${c.suit}` }));
    let bestArrangement = null; let bestArrangementOverallScore = -Infinity;
    const possibleBackHands = combinations(allCards, 5);
    if (possibleBackHands.length === 0 && allCards.length > 0) { console.error("未能生成后墩组合"); return fallbackArrangement(allCardsInput); } 
    else if (possibleBackHands.length === 0 && allCards.length === 0) { return null; }
    for (const currentBackTry of possibleBackHands) {
        const evalBack = evaluateHandSimple(currentBackTry);
        const remainingAfterBack = removeSelectedCards(allCards, currentBackTry);
        if (remainingAfterBack.length !== 8) continue;
        const possibleMiddleHands = combinations(remainingAfterBack, 5);
        if (possibleMiddleHands.length === 0 && remainingAfterBack.length > 0) continue;
        for (const currentMiddleTry of possibleMiddleHands) {
            const evalMiddle = evaluateHandSimple(currentMiddleTry);
            if (compareHandsFrontend(evalMiddle, evalBack, "AI M-B") > 0) { continue; }
            const currentFrontTry = removeSelectedCards(remainingAfterBack, currentMiddleTry);
            if (currentFrontTry.length !== 3) continue;
            const evalFront = evaluateHandSimple(currentFrontTry);
            if (compareHandsFrontend(evalFront, evalMiddle, "AI F-M") > 0) { continue; }
            const overallScore = evalBack.rank * 1000000 + evalMiddle.rank * 1000 + evalFront.rank;
            if (overallScore > bestArrangementOverallScore) {
                bestArrangementOverallScore = overallScore;
                bestArrangement = { frontHand: currentFrontTry, middleHand: currentMiddleTry, backHand: currentBackTry,};
            }
        }
    }
    if (bestArrangement) { console.log("AI分牌完成 (通过组合搜索)。"); return bestArrangement;
    } else { console.warn("AI未能通过组合搜索找到理想解，回退到顺序分配。"); return fallbackArrangement(allCardsInput); }
}

// 回退的简单顺序分配 - 这个函数被 simpleAiArrangeCards 的 else 分支调用
function fallbackArrangement(allCardsInput) { // Line 148 (según el log anterior)
    console.log("Executing fallbackArrangement"); 
    const cardsWithRank = allCardsInput.map(c => ({
        ...c,
        rankForSort: getRankValue(c.value) 
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
