// frontend/js/handEvaluator.js
import { HAND_TYPES, CARD_RANKS_MAP, DUN_IDS } from './constants.js';
import { sortCards } from './cardUtils.js'; // sortCards现在也在这里用

// 辅助函数：获取牌的点数和花色统计
function getCardStats(cards) {
    const ranks = cards.map(c => c.rankValue);
    const suits = cards.map(c => c.suitValue);
    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {});
    // 按出现次数降序排列点数计数，例如葫芦 [3, 2], 铁支 [4, 1]
    const countsOfRanks = Object.values(rankCounts).sort((a, b) => b - a);
    return { ranks, suits, rankCounts, countsOfRanks };
}

// 核心牌型判断函数
export function evaluateHand(cards, dunId = null) {
    const n = cards.length;

    // 基本墩牌数检查
    if (dunId === DUN_IDS.FRONT && n !== 3) return { ...HAND_TYPES.INVALID, cards };
    if ((dunId === DUN_IDS.MIDDLE || dunId === DUN_IDS.BACK) && n !== 5) return { ...HAND_TYPES.INVALID, cards };
    if (n === 0) return { ...HAND_TYPES.HIGH_CARD, cards }; // 空也算乌龙

    const sortedOriginalCards = sortCards([...cards]); // 用于返回，保留原始A值
    const { ranks, suits, rankCounts, countsOfRanks } = getCardStats(sortedOriginalCards);

    const isFlush = new Set(suits).size === 1;

    // 顺子判断 (包括A2345)
    let isStraight = false;
    let isAceLowStraight = false; // 标记A2345顺子 (A为14，但在顺子中表现为最小)
    const uniqueSortedRanks = [...new Set(ranks)].sort((a, b) => a - b); // 升序的点数

    if (uniqueSortedRanks.length === n) { // 必须是n张不同点数的牌
        // 标准顺子 (非A2345)
        if (uniqueSortedRanks[n - 1] - uniqueSortedRanks[0] === n - 1) {
            isStraight = true;
        }
        // A2345顺子: 牌面是 A,2,3,4,5 (ranks 14,2,3,4,5)
        if (n === 5 && uniqueSortedRanks.join(',') === `${CARD_RANKS_MAP['2']},${CARD_RANKS_MAP['3']},${CARD_RANKS_MAP['4']},${CARD_RANKS_MAP['5']},${CARD_RANKS_MAP.ace}`) {
            isStraight = true;
            isAceLowStraight = true;
        }
    }

    // 构造返回的牌型细节
    let handDetails = {
        type: HAND_TYPES.HIGH_CARD, // 默认为乌龙
        cards: sortedOriginalCards,
        ranks: ranks, // 排序后的点数数组，用于比较
        mainValue: sortedOriginalCards[0].rankValue, // 默认主要比较值为最大牌的点数
        kickers: [], // 用于存储踢脚牌的点数
        isAceLowStraight: isAceLowStraight
    };

    // --- 判断牌型，从大到小 ---
    if (isStraight && isFlush) {
        handDetails.type = HAND_TYPES.STRAIGHT_FLUSH;
        handDetails.mainValue = isAceLowStraight ? CARD_RANKS_MAP['5'] : sortedOriginalCards[0].rankValue; // A2345同花顺头是5
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_TONG_HUA_SHUN;
        else if (dunId === DUN_IDS.BACK) handDetails.type = HAND_TYPES.WEI_DUN_TONG_HUA_SHUN;
    } else if (countsOfRanks[0] === 4) {
        handDetails.type = HAND_TYPES.FOUR_OF_A_KIND;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 4));
        handDetails.kickers = [parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1))];
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_TIE_ZHI;
        else if (dunId === DUN_IDS.BACK) handDetails.type = HAND_TYPES.WEI_DUN_TIE_ZHI;
    } else if (countsOfRanks[0] === 3 && countsOfRanks[1] === 2) {
        handDetails.type = HAND_TYPES.FULL_HOUSE;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3)); // 三条的rank
        handDetails.pairValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2)); // 对子的rank (用于同葫芦比较)
        if (dunId === DUN_IDS.MIDDLE) handDetails.type = HAND_TYPES.ZHONG_DUN_HU_LU;
    } else if (isFlush) {
        handDetails.type = HAND_TYPES.FLUSH;
        // mainValue已经是最大牌点数, kickers是剩余牌
        handDetails.kickers = sortedOriginalCards.slice(1).map(c => c.rankValue);
    } else if (isStraight) {
        handDetails.type = HAND_TYPES.STRAIGHT;
        handDetails.mainValue = isAceLowStraight ? CARD_RANKS_MAP['5'] : sortedOriginalCards[0].rankValue;
    } else if (countsOfRanks[0] === 3) {
        handDetails.type = HAND_TYPES.THREE_OF_A_KIND;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 3));
        handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue);
        if (dunId === DUN_IDS.FRONT) handDetails.type = HAND_TYPES.CHONG_SAN;
    } else if (countsOfRanks[0] === 2 && countsOfRanks[1] === 2) {
        handDetails.type = HAND_TYPES.TWO_PAIR;
        const pairRanks = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
        handDetails.mainValue = pairRanks[0]; // 大对的rank
        handDetails.lowPairRank = pairRanks[1]; // 小对的rank
        handDetails.kickers = [parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 1))];
    } else if (countsOfRanks[0] === 2) {
        handDetails.type = HAND_TYPES.ONE_PAIR;
        handDetails.mainValue = parseInt(Object.keys(rankCounts).find(k => rankCounts[k] === 2)); // 对子的rank
        handDetails.kickers = sortedOriginalCards.filter(c => c.rankValue !== handDetails.mainValue).map(c => c.rankValue);
    } else { // 乌龙
        handDetails.type = HAND_TYPES.HIGH_CARD;
        handDetails.kickers = sortedOriginalCards.slice(1).map(c => c.rankValue);
    }
    // 确保 handDetails.type 指向 HAND_TYPES 中的对象，而不是字符串
    if (typeof handDetails.type === 'string') {
        handDetails.type = HAND_TYPES[handDetails.type];
    }
    return handDetails;
}

// 比较两个已评估的牌墩 (hand1Info, hand2Info 是 evaluateHand 返回的对象)
export function compareSingleHands(hand1Info, hand2Info) {
    if (!hand1Info || !hand2Info || !hand1Info.type || !hand2Info.type) return 0;

    // 1. 牌型等级不同 (type.value)
    if (hand1Info.type.value !== hand2Info.type.value) {
        return hand1Info.type.value - hand2Info.type.value;
    }

    // 2. 牌型等级相同，比较主要点数 (mainValue)
    if (hand1Info.mainValue !== hand2Info.mainValue) {
        return hand1Info.mainValue - hand2Info.mainValue;
    }

    // 3. 牌型等级、主要点数都相同，根据具体牌型比较次要部分或Kickers
    switch (hand1Info.type.id) { // 使用id比较，因为type对象可能不同实例
        case HAND_TYPES.STRAIGHT_FLUSH.id:
        case HAND_TYPES.STRAIGHT.id:
            // A2345 vs A2345 视为平手 (如果mainValue都是5)
            // 普通顺子/同花顺，如果最大牌相同，视为平手 (十三水不比花色定顺子大小)
            return 0;

        case HAND_TYPES.FOUR_OF_A_KIND.id:
            return (hand1Info.kickers[0] || 0) - (hand2Info.kickers[0] || 0); // 比较单张

        case HAND_TYPES.FULL_HOUSE.id:
            return (hand1Info.pairValue || 0) - (hand2Info.pairValue || 0); // 比较对子

        case HAND_TYPES.FLUSH.id:
        case HAND_TYPES.HIGH_CARD.id:
            // 逐张比较所有牌 (cards 已经是排序好的)
            for (let i = 0; i < hand1Info.cards.length; i++) {
                if (hand1Info.cards[i].rankValue !== hand2Info.cards[i].rankValue) {
                    return hand1Info.cards[i].rankValue - hand2Info.cards[i].rankValue;
                }
            }
            return 0; // 完全相同

        case HAND_TYPES.THREE_OF_A_KIND.id:
        case HAND_TYPES.ONE_PAIR.id:
            // 比较Kickers (已经是排序好的)
            for (let i = 0; i < Math.max(hand1Info.kickers.length, hand2Info.kickers.length); i++) {
                const kicker1 = hand1Info.kickers[i] || 0;
                const kicker2 = hand2Info.kickers[i] || 0;
                if (kicker1 !== kicker2) return kicker1 - kicker2;
            }
            return 0;

        case HAND_TYPES.TWO_PAIR.id:
            // 主要点数(大对)相同，比较小对
            if ((hand1Info.lowPairRank || 0) !== (hand2Info.lowPairRank || 0)) {
                return (hand1Info.lowPairRank || 0) - (hand2Info.lowPairRank || 0);
            }
            // 小对也相同，比较单张
            return (hand1Info.kickers[0] || 0) - (hand2Info.kickers[0] || 0);

        default:
            // 对于墩位特殊加分牌型，如果基础牌型和点数都一样，则平手
            if (hand1Info.type.baseType && hand2Info.type.baseType && hand1Info.type.baseType === hand2Info.type.baseType) {
                // 理论上 mainValue 已经比较过了，这里应该是0
                return 0;
            }
            return 0; // 未知情况或完全相同
    }
}

// 检查整手牌是否构成特殊牌型 (如三同花、三顺子、一条龙等)
// allCards 是13张手牌数据, front/middle/backResult是各墩评估结果
export function checkOverallSpecialHand(allCards, frontResult, middleResult, backResult) {
    if (!frontResult || !middleResult || !backResult) return null;

    const all13CardsSorted = sortCards([...allCards]);

    // 1. 一条龙 (A-K 不同花)
    const isYTL = (() => {
        if (all13CardsSorted.length !== 13) return false;
        const ranks = all13CardsSorted.map(c => c.rankValue);
        const uniqueRanks = [...new Set(ranks)];
        if (uniqueRanks.length !== 13) return false; // 必须是13张不同点数的牌
        // 检查是否从A到K (2到14)
        const expectedRanks = Array.from({length: 13}, (_, i) => i + CARD_RANKS_MAP['2']); // 2 to 14
        return uniqueRanks.sort((a,b)=>a-b).every((rank, index) => rank === expectedRanks[index]);
    })();
    if (isYTL) return { ...HAND_TYPES.YI_TIAO_LONG, cards: all13CardsSorted };

    // 2. 至尊清龙 (A-K 同花) - 理论上发牌阶段几乎不可能，但作为规则可以有
    const isZZQL = (() => {
        if (!isYTL) return false; // 必须先是一条龙
        const suits = all13CardsSorted.map(c => c.suitValue);
        return new Set(suits).size === 1; // 所有牌花色相同
    })();
    if (isZZQL) return { ...HAND_TYPES.ZHI_ZUN_QING_LONG, cards: all13CardsSorted };


    // 3. 三同花
    const isSanTongHua = frontResult.type.id === HAND_TYPES.FLUSH.id &&
                         middleResult.type.id === HAND_TYPES.FLUSH.id &&
                         backResult.type.id === HAND_TYPES.FLUSH.id;
    if (isSanTongHua) return { ...HAND_TYPES.SAN_TONG_HUA };

    // 4. 三顺子
    const isSanShunZi = (frontResult.type.id === HAND_TYPES.STRAIGHT.id || (frontResult.type.baseType && HAND_TYPES[frontResult.type.baseType].id === HAND_TYPES.STRAIGHT.id) ) &&
                        (middleResult.type.id === HAND_TYPES.STRAIGHT.id || (middleResult.type.baseType && HAND_TYPES[middleResult.type.baseType].id === HAND_TYPES.STRAIGHT.id) ) &&
                        (backResult.type.id === HAND_TYPES.STRAIGHT.id || (backResult.type.baseType && HAND_TYPES[backResult.type.baseType].id === HAND_TYPES.STRAIGHT.id) );
    if (isSanShunZi) return { ...HAND_TYPES.SAN_SHUN_ZI };
    
    // 5. 六对半 (13张牌中有6个对子和1张单牌)
    const isLiuDuiBan = (() => {
        if (allCards.length !== 13) return false;
        const { rankCounts } = getCardStats(allCards);
        let pairCount = 0;
        let singleCount = 0;
        Object.values(rankCounts).forEach(count => {
            if (count === 2) pairCount++;
            else if (count === 1) singleCount++;
            // 如果有3张或4张一样的，则不是六对半
            else if (count > 2) { pairCount = -1; return; } //标记无效
        });
        return pairCount === 6 && singleCount === 1;
    })();
    if (isLiuDuiBan) return { ...HAND_TYPES.LIU_DUI_BAN };

    // ... 可以继续添加其他特殊牌型判断

    return null; // 没有整手牌的特殊牌型
}
