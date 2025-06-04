// frontend/src/utils/frontendGameLogic.js

// 定义牌型常量 (与后端一致)
const HAND_TYPE_OOLONG = 0;
const HAND_TYPE_PAIR = 1;
const HAND_TYPE_TWO_PAIR = 2;
const HAND_TYPE_THREE_OF_A_KIND = 3;
const HAND_TYPE_STRAIGHT = 4;
const HAND_TYPE_FLUSH = 5;
const HAND_TYPE_FULL_HOUSE = 6;
const HAND_TYPE_FOUR_OF_A_KIND = 7;
const HAND_TYPE_STRAIGHT_FLUSH = 8;

const handTypeNames = {
    [HAND_TYPE_OOLONG]: '乌龙',
    [HAND_TYPE_PAIR]: '一对',
    [HAND_TYPE_TWO_PAIR]: '两对',
    [HAND_TYPE_THREE_OF_A_KIND]: '三条',
    [HAND_TYPE_STRAIGHT]: '顺子',
    [HAND_TYPE_FLUSH]: '同花',
    [HAND_TYPE_FULL_HOUSE]: '葫芦',
    [HAND_TYPE_FOUR_OF_A_KIND]: '铁支',
    [HAND_TYPE_STRAIGHT_FLUSH]: '同花顺',
};

// 简化版 isStraight (与后端逻辑类似)
function isStraight(cardValues) {
    const values = [...cardValues].sort((a, b) => b - a); // 确保降序
    if (values.length !== 5) return { is_straight: false, high_card_display: 0, high_card_raw: 0 };
    const uniqueValues = Array.from(new Set(values));
    if (uniqueValues.length !== 5) return { is_straight: false, high_card_display: 0, high_card_raw: 0 };

    let isNormalStraight = true;
    for (let i = 0; i < 4; i++) {
        if (uniqueValues[i] !== uniqueValues[i+1] + 1) {
            isNormalStraight = false;
            break;
        }
    }
    if (isNormalStraight) return { is_straight: true, high_card_display: uniqueValues[0], high_card_raw: uniqueValues[0] };

    if (JSON.stringify(uniqueValues) === JSON.stringify([14, 5, 4, 3, 2])) { // A,5,4,3,2
        return { is_straight: true, high_card_display: 5, high_card_raw: 14 };
    }
    return { is_straight: false, high_card_display: 0, high_card_raw: 0 };
}


export const GameLogic = {
    getHandType(cards) {
        if (!cards || cards.length === 0) return { type: HAND_TYPE_OOLONG, name: handTypeNames[HAND_TYPE_OOLONG], compare_values: [0] };
        
        const numCards = cards.length;
        if (numCards !== 3 && numCards !== 5) {
            return { type: HAND_TYPE_OOLONG, name: handTypeNames[HAND_TYPE_OOLONG], compare_values: [0], detail: '无效牌数' };
        }

        const sortedCards = [...cards].sort((a, b) => b.value - a.value);
        const cardValues = sortedCards.map(c => c.value);
        const cardSuits = sortedCards.map(c => c.suit);
        
        const valueCounts = {};
        cardValues.forEach(v => { valueCounts[v] = (valueCounts[v] || 0) + 1; });
        
        const sortedValueCounts = Object.entries(valueCounts).sort(([,a],[,b]) => b-a || parseInt(b,10)-parseInt(a,10));


        const isFlush = new Set(cardSuits).size === 1;
        const straightInfo = isStraight(cardValues);
        const isStraightVal = straightInfo.is_straight;

        // 5张牌
        if (numCards === 5) {
            if (isStraightVal && isFlush) return { type: HAND_TYPE_STRAIGHT_FLUSH, name: handTypeNames[HAND_TYPE_STRAIGHT_FLUSH], compare_values: [straightInfo.high_card_raw] };
            
            let fourValue = 0, threeValue = 0, pairForFHValue = 0;
            const pairs = [];

            sortedValueCounts.forEach(([valStr, count]) => {
                const val = parseInt(valStr, 10);
                if (count === 4) fourValue = val;
                if (count === 3 && !threeValue) threeValue = val; // 第一个三条
                if (count === 2) pairs.push(val);
            });
            pairs.sort((a,b) => b-a); // 对子从大到小

            if (fourValue) return { type: HAND_TYPE_FOUR_OF_A_KIND, name: handTypeNames[HAND_TYPE_FOUR_OF_A_KIND], compare_values: [fourValue, ...cardValues.filter(v => v !== fourValue)] };
            
            // 葫芦: 必须有一个三条，并且剩下的牌能凑成一个对子，或者另一个三条中的两张也行
            if (threeValue) {
                 const remainingValues = cardValues.filter(v => v !== threeValue);
                 const remainingValueCounts = {};
                 remainingValues.forEach(v => { remainingValueCounts[v] = (remainingValueCounts[v] || 0) + 1; });
                 for (const val in remainingValueCounts) {
                     if (remainingValueCounts[val] >= 2) {
                         pairForFHValue = parseInt(val, 10);
                         break;
                     }
                 }
                 if (pairForFHValue) return { type: HAND_TYPE_FULL_HOUSE, name: handTypeNames[HAND_TYPE_FULL_HOUSE], compare_values: [threeValue, pairForFHValue] };
            }


            if (isFlush) return { type: HAND_TYPE_FLUSH, name: handTypeNames[HAND_TYPE_FLUSH], compare_values: cardValues };
            if (isStraightVal) return { type: HAND_TYPE_STRAIGHT, name: handTypeNames[HAND_TYPE_STRAIGHT], compare_values: [straightInfo.high_card_raw] };
        }

        // 通用 (3或5张)
        let threeValue = 0;
        const pairs = [];
        sortedValueCounts.forEach(([valStr, count]) => {
            const val = parseInt(valStr, 10);
            if (count === 3 && !threeValue) threeValue = val;
            if (count === 2) pairs.push(val);
        });
        pairs.sort((a,b) => b-a);

        if (threeValue) {
            const kickers = cardValues.filter(v => v !== threeValue).sort((a,b)=>b-a);
            return { type: HAND_TYPE_THREE_OF_A_KIND, name: handTypeNames[HAND_TYPE_THREE_OF_A_KIND], compare_values: [threeValue, ...kickers] };
        }
        if (numCards === 5 && pairs.length === 2) {
            const kicker = cardValues.find(v => v !== pairs[0] && v !== pairs[1]);
            return { type: HAND_TYPE_TWO_PAIR, name: handTypeNames[HAND_TYPE_TWO_PAIR], compare_values: [pairs[0], pairs[1], kicker] };
        }
        if (pairs.length === 1) {
            const kickers = cardValues.filter(v => v !== pairs[0]).sort((a,b)=>b-a);
            return { type: HAND_TYPE_PAIR, name: handTypeNames[HAND_TYPE_PAIR], compare_values: [pairs[0], ...kickers] };
        }
        return { type: HAND_TYPE_OOLONG, name: handTypeNames[HAND_TYPE_OOLONG], compare_values: cardValues };
    },

    compareHandTypes(hand1TypeData, hand2TypeData) {
        if (!hand1TypeData || !hand2TypeData) return 0; // 防御性编程
        if (hand1TypeData.type !== hand2TypeData.type) {
            return hand1TypeData.type - hand2TypeData.type;
        }
        for (let i = 0; i < hand1TypeData.compare_values.length; i++) {
            if (hand2TypeData.compare_values[i] === undefined) return 1; // hand2更短
            if (hand1TypeData.compare_values[i] !== hand2TypeData.compare_values[i]) {
                return hand1TypeData.compare_values[i] - hand2TypeData.compare_values[i];
            }
        }
        if (hand2TypeData.compare_values.length > hand1TypeData.compare_values.length) return -1; // hand1更短
        return 0;
    }
};
