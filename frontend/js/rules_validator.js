// frontend/js/rules_validator.js

export const TYPE_OOLONG = 1;
export const TYPE_PAIR = 2;
export const TYPE_TWO_PAIR = 3;
export const TYPE_THREE_OF_A_KIND = 4;
export const TYPE_STRAIGHT = 5;
export const TYPE_FLUSH = 6;
export const TYPE_FULL_HOUSE = 7;
export const TYPE_FOUR_OF_A_KIND = 8;
export const TYPE_STRAIGHT_FLUSH = 9;

const RANK_ORDER = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
};

const SUIT_ORDER = { // For tie-breaking flushes or identical straights if needed by rules
    'spades': 4, 'hearts': 3, 'diamonds': 2, 'clubs': 1
};


/**
 * 评估一手牌(3张或5张)的牌型
 * @param {Array<{rank: string, suit: string}>} cardsArray - 卡牌对象数组
 * @returns {{type: number, values: Array<number>, name: string, cards: Array<{rank: string, suit: string}>}}
 *           values 用于同牌型比较大小，cards 是排序后的牌
 */
export function evaluateHand(cardsArray) {
    if (!cardsArray || (cardsArray.length !== 3 && cardsArray.length !== 5)) {
        return { type: TYPE_OOLONG, values: getCardValues(cardsArray, true), name: "无效牌数", cards: cardsArray };
    }

    // Create a mutable copy and add 'value' and 'suitValue' for sorting
    let cards = cardsArray.map(c => ({
        ...c,
        value: RANK_ORDER[c.rank.toLowerCase()],
        suitValue: SUIT_ORDER[c.suit.toLowerCase()]
    }));

    // 按点数从大到小排序，同点数按花色 (虽然十三水比牌通常不比花色，但排序时可以一致)
    cards.sort((a, b) => {
        if (b.value === a.value) {
            return b.suitValue - a.suitValue;
        }
        return b.value - a.value;
    });

    const numCards = cards.length;
    const isFlush = checkFlush(cards);
    // 顺子只针对5张牌，十三水头墩3张牌没有顺子概念（除非特殊规则）
    const isStraight = (numCards === 5) ? checkStraight(cards) : false;

    const rankCounts = {};
    cards.forEach(card => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
    });

    if (numCards === 5) {
        if (isStraight && isFlush) {
            // A2345同花顺的比较值以5为首
            const highValue = (cards[0].value === RANK_ORDER.ace && cards[1].value === RANK_ORDER['5']) ? RANK_ORDER['5'] : cards[0].value;
            return { type: TYPE_STRAIGHT_FLUSH, values: [highValue, ...getCardValues(cards).slice(1)], name: "同花顺", cards };
        }
        const fours = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 4).map(Number);
        if (fours.length > 0) {
            const kicker = cards.find(c => c.value !== fours[0]).value;
            return { type: TYPE_FOUR_OF_A_KIND, values: [fours[0], kicker], name: "铁支", cards };
        }
        const threes = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 3).map(Number);
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2).map(Number);
        if (threes.length > 0 && pairs.length > 0) {
            return { type: TYPE_FULL_HOUSE, values: [threes[0], pairs[0]], name: "葫芦", cards };
        }
        if (isFlush) {
            return { type: TYPE_FLUSH, values: getCardValues(cards), name: "同花", cards };
        }
        if (isStraight) {
            const highValue = (cards[0].value === RANK_ORDER.ace && cards[1].value === RANK_ORDER['5']) ? RANK_ORDER['5'] : cards[0].value;
            return { type: TYPE_STRAIGHT, values: [highValue, ...getCardValues(cards).slice(1)], name: "顺子", cards };
        }
        if (threes.length > 0) {
            const kickers = cards.filter(c => c.value !== threes[0]).map(c => c.value).slice(0, 2);
            return { type: TYPE_THREE_OF_A_KIND, values: [threes[0], ...kickers], name: "三条", cards };
        }
        if (pairs.length === 2) {
            pairs.sort((a, b) => b - a); // 大对在前
            const kicker = cards.find(c => c.value !== pairs[0] && c.value !== pairs[1]).value;
            return { type: TYPE_TWO_PAIR, values: [pairs[0], pairs[1], kicker], name: "两对", cards };
        }
        if (pairs.length === 1) {
            const kickers = cards.filter(c => c.value !== pairs[0]).map(c => c.value).slice(0, 3);
            return { type: TYPE_PAIR, values: [pairs[0], ...kickers], name: "一对", cards };
        }
    } else if (numCards === 3) { // 头墩
        const threes = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 3).map(Number);
        if (threes.length > 0) {
            return { type: TYPE_THREE_OF_A_KIND, values: [threes[0]], name: "三条", cards };
        }
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2).map(Number);
        if (pairs.length > 0) {
            const kicker = cards.find(c => c.value !== pairs[0]).value;
            return { type: TYPE_PAIR, values: [pairs[0], kicker], name: "一对", cards };
        }
    }
    return { type: TYPE_OOLONG, values: getCardValues(cards), name: "乌龙", cards };
}

function getCardValues(cards, forceAll = false) {
    if (!cards || cards.length === 0) return [];
    // Assuming cards are already sorted by value desc if coming from evaluateHand
    // If not, or if directly called, ensure they have 'value' property
    let values = cards.map(c => c.value || RANK_ORDER[c.rank.toLowerCase()]);
    values.sort((a,b) => b-a); // Ensure descending for direct calls
    return forceAll ? values : values.slice(0, 5);
}

function checkFlush(cards) {
    if (!cards || cards.length === 0) return false;
    const firstSuit = cards[0].suit;
    return cards.every(card => card.suit === firstSuit);
}

function checkStraight(cards) { // cards should be sorted by value desc
    if (!cards || cards.length !== 5) return false;
    // Check for A,2,3,4,5 (Ace as 1) - cards[0] is Ace, cards[4] is 2
    const isAceLowStraight = cards[0].value === RANK_ORDER.ace &&
                           cards[1].value === RANK_ORDER['5'] &&
                           cards[2].value === RANK_ORDER['4'] &&
                           cards[3].value === RANK_ORDER['3'] &&
                           cards[4].value === RANK_ORDER['2'];
    if (isAceLowStraight) return true;

    // Check for normal straight
    for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].value - cards[i+1].value !== 1) {
            return false;
        }
    }
    return true;
}

/**
 * 比较两个已评估的牌墩 (来自 evaluateHand 的结果)
 * @param {object} eval1 - {type, values, name, cards}
 * @param {object} eval2 - {type, values, name, cards}
 * @returns {number} -1 (eval1 < eval2), 0 (eval1 == eval2), 1 (eval1 > eval2)
 */
export function compareEvaluatedHands(eval1, eval2) {
    if (!eval1 || !eval2) return 0; // Or throw error
    if (eval1.type < eval2.type) return -1;
    if (eval1.type > eval2.type) return 1;

    // 牌型相同，比较 tieBreakerValues (values)
    for (let i = 0; i < Math.min(eval1.values.length, eval2.values.length); i++) {
        if (eval1.values[i] < eval2.values[i]) return -1;
        if (eval1.values[i] > eval2.values[i]) return 1;
    }
    // 如果所有主要比较值都相同，十三水通常不比较花色定胜负 (除非特殊规则)
    return 0; // 完全相同
}

/**
 * 验证三墩牌是否符合十三水规则 (头 <= 中 <= 尾，不倒水)
 * @param {Array<{rank: string, suit: string}>} headCardsRaw
 * @param {Array<{rank: string, suit: string}>} middleCardsRaw
 * @param {Array<{rank: string, suit: string}>} tailCardsRaw
 * @returns {{isValid: boolean, message: string, details: {head: object, middle: object, tail: object}|null}}
 */
export function validateArrangement(headCardsRaw, middleCardsRaw, tailCardsRaw) {
    if (headCardsRaw.length !== 3) return { isValid: false, message: "头墩必须是3张牌。", details: null };
    if (middleCardsRaw.length !== 5) return { isValid: false, message: "中墩必须是5张牌。", details: null };
    if (tailCardsRaw.length !== 5) return { isValid: false, message: "尾墩必须是5张牌。", details: null };

    const headEval = evaluateHand(headCardsRaw);
    const middleEval = evaluateHand(middleCardsRaw);
    const tailEval = evaluateHand(tailCardsRaw);

    const details = { head: headEval, middle: middleEval, tail: tailEval };

    if (compareEvaluatedHands(headEval, middleEval) === 1) { // head > middle
        return { isValid: false, message: `倒水：头墩 (${headEval.name}) 大于中墩 (${middleEval.name})。`, details };
    }
    if (compareEvaluatedHands(middleEval, tailEval) === 1) { // middle > tail
        return { isValid: false, message: `倒水：中墩 (${middleEval.name}) 大于尾墩 (${tailEval.name})。`, details };
    }

    return { isValid: true, message: '牌型有效。', details };
}

/**
 * 检查提交的牌是否都来自玩家手牌，并且没有重复使用。
 * @param {Array<{rank: string, suit: string}>} originalHand - 玩家原始13张手牌
 * @param {Array<{rank: string, suit: string}>} headCards
 * @param {Array<{rank: string, suit: string}>} middleCards
 * @param {Array<{rank: string, suit: string}>} tailCards
 * @returns {boolean}
 */
export function verifyCardsAreFromHand(originalHand, headCards, middleCards, tailCards) {
    const submittedCards = [...headCards, ...middleCards, ...tailCards];
    if (submittedCards.length !== 13) return false; // 总数不对

    const originalHandStrings = originalHand.map(c => `${c.rank}_${c.suit}`).sort();
    const submittedCardStrings = submittedCards.map(c => `${c.rank}_${c.suit}`).sort();

    return JSON.stringify(originalHandStrings) === JSON.stringify(submittedCardStrings);
}
