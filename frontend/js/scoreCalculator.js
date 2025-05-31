// frontend/js/scoreCalculator.js
import { HAND_TYPES } from './constants.js';
import { compareSingleHands, checkOverallSpecialHand } from './handEvaluator.js'; // 需要引入比较函数

// 计算单局得分
// playerHandResults: { front: evaluateHandResult, middle: evaluateHandResult, back: evaluateHandResult }
// opponentHandResults: (可选) 对手的牌墩结果，用于打枪等比较
// allPlayerCards: 玩家的13张原始手牌数据，用于判断整手特殊牌型
export function calculateRoundScore(playerHandResults, allPlayerCards, opponentHandResults = null) {
    let score = 0;
    let messageLog = [];
    let isDaoshui = false;

    const { front: pFront, middle: pMiddle, back: pBack } = playerHandResults;

    // 0. 检查是否有整手牌的特殊牌型 (一条龙等)
    const overallSpecial = checkOverallSpecialHand(allPlayerCards, pFront, pMiddle, pBack);
    if (overallSpecial && overallSpecial.isOverallSpecial) {
        messageLog.push(`特殊牌型: ${overallSpecial.name}!`);
        score += overallSpecial.score;
        // 通常特殊牌型直接结算，不进行后续墩位比较和计分
        // (但不同规则处理方式不同，这里我们简单地加上分数)
        // 如果需要覆盖其他分数，可以在这里返回
        // return { score, messageLog, isDaoshui: false, finalOverallHandType: overallSpecial };
    }


    // 1. 检查倒水 (自己的牌墩顺序)
    if (compareSingleHands(pFront, pMiddle) > 0) {
        isDaoshui = true;
        messageLog.push("倒水：头墩大于中墩!");
    } else if (compareSingleHands(pMiddle, pBack) > 0) {
        isDaoshui = true;
        messageLog.push("倒水：中墩大于尾墩!");
    }

    if (isDaoshui) {
        score = HAND_TYPES.DAO_SHUI.score; // 倒水罚固定分
        messageLog.push(`倒水罚分: ${score}`);
        return { score, messageLog, isDaoshui, finalOverallHandType: overallSpecial };
    }

    // 2. 计算各墩基础分 (如果不是因为整手特殊牌型而提前结束)
    // 确保取的是牌型对象中的score
    score += pFront.type.score || 0;
    score += pMiddle.type.score || 0;
    score += pBack.type.score || 0;
    messageLog.push(`头墩 (${pFront.type.name}): ${pFront.type.score || 0}分`);
    messageLog.push(`中墩 (${pMiddle.type.name}): ${pMiddle.type.score || 0}分`);
    messageLog.push(`尾墩 (${pBack.type.name}): ${pBack.type.score || 0}分`);


    // 3. 与对手比较，计算打枪 (目前简化，假设单人游戏或与一个标准对手)
    // 在实际多人游戏中，这里会循环对比每个对手
    if (opponentHandResults) { // 如果有对手数据
        const { front: oFront, middle: oMiddle, back: oBack } = opponentHandResults;
        let winCount = 0;
        let loseCount = 0;
        let drawCount = 0;
        let roundVsOpponentScore = 0;

        const compareAndScoreDun = (playerDun, opponentDun, dunName) => {
            const comparison = compareSingleHands(playerDun, opponentDun);
            let dunScore = 0;
            if (comparison > 0) { // 玩家胜
                dunScore = playerDun.type.score || 1; // 至少赢1分
                messageLog.push(`${dunName}: 胜 (+${dunScore})`);
                winCount++;
            } else if (comparison < 0) { // 玩家负
                dunScore = -(opponentDun.type.score || 1); // 至少输1分
                messageLog.push(`${dunName}: 负 (${dunScore})`);
                loseCount++;
            } else { // 平
                messageLog.push(`${dunName}: 平`);
                drawCount++;
            }
            return dunScore;
        };
        
        // 这里暂时不使用墩位分，直接比较输赢墩，每墩1分，打枪翻倍
        // 实际十三水比法是，先算各墩牌型对应分数，再按输赢墩数结算
        let frontDunPoints = compareSingleHands(pFront, oFront) > 0 ? 1 : (compareSingleHands(pFront, oFront) < 0 ? -1 : 0);
        let middleDunPoints = compareSingleHands(pMiddle, oMiddle) > 0 ? 1 : (compareSingleHands(pMiddle, oMiddle) < 0 ? -1 : 0);
        let backDunPoints = compareSingleHands(pBack, oBack) > 0 ? 1 : (compareSingleHands(pBack, oBack) < 0 ? -1 : 0);

        // 根据墩位牌型加分
        if (frontDunPoints > 0) frontDunPoints += (pFront.type.score || 0);
        else if (frontDunPoints < 0) frontDunPoints -= (oFront.type.score || 0);
        // ... (middle 和 back 类似)
        // 简化版，先不把这个加回去，十三水计分很复杂

        roundVsOpponentScore = frontDunPoints + middleDunPoints + backDunPoints;


        if (winCount === 3) { // 打枪
            messageLog.push("打枪! 得分翻倍!");
            roundVsOpponentScore *= 2; // 假设打枪翻倍
        } else if (loseCount === 3) { // 被打枪
            messageLog.push("被对手打枪! 失分翻倍!");
            roundVsOpponentScore *= 2; //
        }
        score += roundVsOpponentScore; // 将与对手比较的得分加入总分
    } else {
        // 单人游戏，没有对手，得分就是牌型分总和
        messageLog.push(`牌型总基础分: ${score}`);
    }


    return { score, messageLog, isDaoshui, finalOverallHandType: overallSpecial };
}
