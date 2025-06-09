// frontend/src/utils/thirteenWaterLogic.js

// Helper to get numerical value for sorting (A=14, K=13 ...)
// 这个函数假设 cardIdString 的值部分确实是数字字符串，例如 "14s", "2c", "10d"
// 如果 cardIdString 是 "As", "Kc" 这种，需要配合 getCardDetails
function getCardNumericValue(cardIdString) { // 函数参数是 cardIdString
    if (typeof cardIdString !== 'string' || cardIdString.length < 2) return 0; // 修正: cardString -> cardIdString
    const valuePart = cardIdString.slice(0, -1); // 修正: cardString -> cardIdString
    const numericValue = parseInt(valuePart, 10);
    return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * 十三水AI简易分牌逻辑
 * @param {string[]} thirteenCards - 13张牌的ID字符串数组 (例如: ["14s", "2c", ...])
 * @returns {{front: string[], middle: string[], back: string[]}}
 */
export function 十三水AI简易分牌(thirteenCards) {
    if (!thirteenCards || thirteenCards.length !== 13) {
        console.error("AI分牌需要13张牌", thirteenCards);
        return { front: [], middle: [], back: [] };
    }

    // 基于点数进行排序 (从大到小)
    // 注意：一个更完善的AI需要考虑花色来组合顺子和同花
    const sortedCards = [...thirteenCards].sort((a, b) => {
        const valA = getCardNumericValue(a);
        const valB = getCardNumericValue(b);
        return valB - valA; // 降序排列
    });

    // 简单的分割策略 (不考虑牌型，不保证头道<中道<尾道)
    // 尾道: 最强的5张
    // 中道: 次强的5张
    // 头道: 剩下的3张
    // 这种分法非常初级，仅作为占位符，后续需要替换为真正的十三水AI逻辑
    const back = sortedCards.slice(0, 5);
    const middle = sortedCards.slice(5, 10);
    const front = sortedCards.slice(10, 13);

    // TODO: 真正的AI需要：
    // 1. 识别所有可能的牌型 (对子, 两对, 三条, 顺子, 同花, 葫芦, 铁支, 同花顺)
    // 2. 尝试多种组合方式
    // 3. 评估每种组合的得分潜力
    // 4. 确保最终的牌型满足 头道 <= 中道 <= 尾道 的规则 (避免“倒水”)
    // 5. 考虑特殊牌型

    return {
        front,
        middle,
        back,
    };
}

// TODO: 在这里或 cardUtils.js 中添加牌型判断函数、比牌函数等核心逻辑
// 例如：
// function evaluateHand(cards) { /* 返回牌型和主要牌点数 */ }
// function comparePokerHands(hand1Details, hand2Details) { /* 比较两个已评估的牌型 */ }
