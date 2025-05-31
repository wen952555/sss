// frontend/js/handEvaluator.js
import { HAND_TYPES, CARD_RANKS_MAP, DUN_IDS } from './constants.js';
import { sortCards } from './cardUtils.js';

// getCardStats, evaluateHand, compareSingleHands 函数与之前版本基本一致，此处省略
// 您可以从上一个回复中复制这些函数，确保它们是最新的

// --- getCardStats (from previous response) ---
function getCardStats(cards) {
    if (!Array.isArray(cards)) return { ranks: [], suits: [], rankCounts: {}, countsOfRanks: [] };
    const ranks = cards.map(c => c.rankValue);
    const suits = cards.map(c => c.suitValue);
    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {});
    const countsOfRanks = Object.values(rankCounts).sort((a, b) => b - a);
    return { ranks, suits, rankCounts, countsOfRanks };
}

// --- evaluateHand (from previous response, ensure it's complete) ---
export function evaluateHand(cards, dunId = null) {
    const n = cards.length;

    if (dunId === DUN_IDS.FRONT && n !== 3) return { ...HAND_TYPES.INVALID, cards };
    if ((dunId === DUN_IDS.MIDDLE || dunId === DUN_IDS.BACK) && n !== 5) return { ...HAND_TYPES.INVALID, cards };
    if (n === 0) return { ...HAND_TYPES.HIGH_CARD, cards };

    const sortedOriginalCards = sortCards([...cards]);
    const { ranks, suits, rankCounts, countsOfRanks } = getCardStats(sortedOriginalCards);
    const isFlush = new Set(suits).size === 1;
    let isStraight = false;
    let isAceLowStraight = false;
    const uniqueSortedRanks = [...new Set(ranks)].sort((a, b) => a - b);

    if (uniqueSortedRanks.length === n) {
        if (uniqueSortedRanks[n - 1] - uniqueSortedRanks[0] === n - 1) {
            isStraight = true;
        }
        if (n === 5 && uniqueSortedRanks.join(',') === `${CARD_RANKS_MAP['2']},${CARD_RANKS_MAP['3']},${CARD_RANKS_MAP['4']},${CARD_RANKS_MAP['5']},${CARD_RANKS_MAP.ace}`) {
            isStraight = true;
            isAceLowStraight = true;
        }
    }

    let handDetails = {
        type: HAND_TYPES.HIGH_CARD,
        cards: sortedOriginalCards,
        ranks: ranks,
        mainValue: sortedOriginalCards.length > 0 ? sortedOriginalCards[0].rankValue : 0,
        kickers: [],
        isAceLowStraight: isAceLowStraight
    };

    if (isStraight && isFlush) {
        handDetails.type = HAND_TYPES.STRAIGHT_FLUSH;
        handDetails.mainValue = isAceLowStraight ? CARD_RANKS_MAP['5'] : (sortedOriginalCards.length > 0 ? sortedOriginalCards[0].rankValue : 0);
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_TONG_HUA_SHUN;
        else if (dunId === DUN_IDS.BACK) handDetails.type = HAND_TYPES.WEI_DUN_TONG_HUA_SHUN;
    } else if (countsOfRanks.length > 0 && countsOfRanks[0] === 4) {
        handDetails.type = HAND_TYPES.FOUR_OF_A_KIND;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 4));
        handDetails.kickers = countsOfRanks.length > 1 ? [parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1))] : [];
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_TIE_ZHI;
        else if (dunId === DUN_IDS.BACK) handDetails.type = HAND_TYPES.WEI_DUN_TIE_ZHI;
    } else if (countsOfRanks.length > 1 && countsOfRanks[0] === 3 && countsOfRanks[1] === 2) {
        handDetails.type = HAND_TYPES.FULL_HOUSE;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
        handDetails.pairValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2));
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_HU_LU;
    } else if (isFlush) {
        handDetails.type = HAND_TYPES.FLUSH;
        handDetails.kickers = sortedOriginalCards.length > 1 ? sortedOriginalCards.slice(1).map(c => c.rankValue) : [];
    } else if (isStraight) {
        handDetails.type = HAND_TYPES.STRAIGHT;
        handDetails.mainValue = isAceLowStraight ? CARD_RANKS_MAP['5'] : (sortedOriginalCards.length > 0 ? sortedOriginalCards[0].rankValue : 0);
    } else if (countsOfRanks.length > 0 && countsOfRanks[0] === 3) {
        handDetails.type = HAND_TYPES.THREE_OF_A_KIND;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
        handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue);
        if (dunId === DUN_IDS.FRONT) handDetails.type = HAND_TYPES.CHONG_SAN;
    } else if (countsOfRanks.length > 1 && countsOfRanks[0] === 2 && countsOfRanks[1] === 2) {
        handDetails.type = HAND_TYPES.TWO_PAIR;
        const pairRanks = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
        handDetails.mainValue = pairRanks[0];
        handDetails.lowPairRank = pairRanks[1];
        handDetails.kickers = countsOfRanks.length > 2 ? [parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1))] : [];
    } else if (countsOfRanks.length > 0 && countsOfRanks[0] === 2) {
        handDetails.type = HAND_TYPES.ONE_PAIR;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2));
        handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue);
    } else if (sortedOriginalCards.length > 0){
        handDetails.type = HAND_TYPES.HIGH_CARD;
        handDetails.kickers = sortedOriginalCards.length > 1 ? sortedOriginalCards.slice(1).map(c => c.rankValue) : [];
    } else { // No cards
        handDetails.type = HAND_TYPES.INVALID; // Or some other default for empty
    }
    if (typeof handDetails.type === 'string') { // Should not happen
        handDetails.type = HAND_TYPES[handDetails.type] || HAND_TYPES.INVALID;
    }
    return handDetails;
}

// --- compareSingleHands (from previous response, ensure it's complete) ---
export function compareSingleHands(hand1Info, hand2Info) {
    if (!hand1Info || !hand2Info || !hand1Info.type || !hand2Info.type) return 0;
    if (hand1Info.type.value !== hand2Info.type.value) {
        return hand1Info.type.value - hand2Info.type.value;
    }
    if (hand1Info.mainValue !== hand2Info.mainValue) {
        return hand1Info.mainValue - hand2Info.mainValue;
    }
    switch (hand1Info.type.id) {
        case HAND_TYPES.STRAIGHT_FLUSH.id:
        case HAND_TYPES.STRAIGHT.id:
            return 0;
        case HAND_TYPES.FOUR_OF_A_KIND.id:
            return (hand1Info.kickers[0] || 0) - (hand2Info.kickers[0] || 0);
        case HAND_TYPES.FULL_HOUSE.id:
            return (hand1Info.pairValue || 0) - (hand2Info.pairValue || 0);
        case HAND_TYPES.FLUSH.id:
        case HAND_TYPES.HIGH_CARD.id:
            if (!hand1Info.cards || !hand2Info.cards) return 0;
            for (let i = 0; i < Math.min(hand1Info.cards.length, hand2Info.cards.length); i++) {
                if (hand1Info.cards[i].rankValue !== hand2Info.cards[i].rankValue) {
                    return hand1Info.cards[i].rankValue - hand2Info.cards[i].rankValue;
                }
            }
            return hand1Info.cards.length - hand2Info.cards.length; // Longer hand wins if all same (unlikely for fixed size)
        case HAND_TYPES.THREE_OF_A_KIND.id:
        case HAND_TYPES.ONE_PAIR.id:
            for (let i = 0; i < Math.max((hand1Info.kickers||[]).length, (hand2Info.kickers||[]).length); i++) {
                const kicker1 = (hand1Info.kickers||[])[i] || 0;
                const kicker2 = (hand2Info.kickers||[])[i] || 0;
                if (kicker1 !== kicker2) return kicker1 - kicker2;
            }
            return 0;
        case HAND_TYPES.TWO_PAIR.id:
            if ((hand1Info.lowPairRank || 0) !== (hand2Info.lowPairRank || 0)) {
                return (hand1Info.lowPairRank || 0) - (hand2Info.lowPairRank || 0);
            }
            return (hand1Info.kickers[0] || 0) - (hand2Info.kickers[0] || 0);
        default:
            if (hand1Info.type.baseType && hand2Info.type.baseType && hand1Info.type.baseType === hand2Info.type.baseType) {
                return 0;
            }
            return 0;
    }
}


// **修改点：完善 checkOverallSpecialHand**
export function checkOverallSpecialHand(allCardsData, frontResult, middleResult, backResult) {
    if (!Array.isArray(allCardsData) || allCardsData.length !== 13) return null;
    if (!frontResult || !middleResult || !backResult) return null;

    const all13CardsSorted = sortCards([...allCardsData]); // 确保是13张牌的数据
    const stats13 = getCardStats(all13CardsSorted);

    // 1. 一条龙 (A-K 不同花色)
    const isYTL = (() => {
        const uniqueRanks = [...new Set(stats13.ranks)];
        if (uniqueRanks.length !== 13) return false;
        // 检查是否从A到K (点数值2到14)
        const expectedRanks = Array.from({ length: 13 }, (_, i) => CARD_RANKS_MAP['2'] + i);
        return uniqueRanks.sort((a, b) => a - b).every((rank, index) => rank === expectedRanks[index]);
    })();

    if (isYTL) {
        // 检查是否至尊清龙 (同花一条龙)
        if (new Set(stats13.suits).size === 1) {
            return { ...HAND_TYPES.ZHI_ZUN_QING_LONG, cards: all13CardsSorted };
        }
        return { ...HAND_TYPES.YI_TIAO_LONG, cards: all13CardsSorted };
    }

    // 2. 三同花
    // 需要确保各墩确实是同花，而不是同花顺等更高级别但基本类型是同花
    const isFrontFlush = frontResult.type.id === HAND_TYPES.FLUSH.id || (frontResult.type.baseType && HAND_TYPES[frontResult.type.baseType]?.id === HAND_TYPES.FLUSH.id);
    const isMiddleFlush = middleResult.type.id === HAND_TYPES.FLUSH.id || (middleResult.type.baseType && HAND_TYPES[middleResult.type.baseType]?.id === HAND_TYPES.FLUSH.id);
    const isBackFlush = backResult.type.id === HAND_TYPES.FLUSH.id || (backResult.type.baseType && HAND_TYPES[backResult.type.baseType]?.id === HAND_TYPES.FLUSH.id);

    if (isFrontFlush && isMiddleFlush && isBackFlush) {
        return { ...HAND_TYPES.SAN_TONG_HUA };
    }

    // 3. 三顺子
    const isFrontStraight = frontResult.type.id === HAND_TYPES.STRAIGHT.id || (frontResult.type.baseType && HAND_TYPES[frontResult.type.baseType]?.id === HAND_TYPES.STRAIGHT.id);
    const isMiddleStraight = middleResult.type.id === HAND_TYPES.STRAIGHT.id || (middleResult.type.baseType && HAND_TYPES[middleResult.type.baseType]?.id === HAND_TYPES.STRAIGHT.id);
    const isBackStraight = backResult.type.id === HAND_TYPES.STRAIGHT.id || (backResult.type.baseType && HAND_TYPES[backResult.type.baseType]?.id === HAND_TYPES.STRAIGHT.id);

    if (isFrontStraight && isMiddleStraight && isBackStraight) {
        return { ...HAND_TYPES.SAN_SHUN_ZI };
    }
    
    // 4. 六对半 (13张牌中有6个对子和1张单牌)
    const isLiuDuiBan = (() => {
        let pairCount = 0;
        let singleCount = 0;
        let invalid = false;
        Object.values(stats13.rankCounts).forEach(count => {
            if (count === 2) pairCount++;
            else if (count === 1) singleCount++;
            else if (count > 2) invalid = true; // 不能有三条或铁支
        });
        return !invalid && pairCount === 6 && singleCount === 1;
    })();

    if (isLiuDuiBan) {
        return { ...HAND_TYPES.LIU_DUI_BAN };
    }

    // ... 其他特殊牌型判断，例如：
    // 五对三条: 5个对子 + 1个三条
    // 四套三条: (比较复杂，需要 دقیق定义)

    return null; // 没有整手牌的特殊牌型
}
