// frontend/js/scoreCalculator.js
import { HAND_TYPES, SHOOTING_BENCHMARK, DUN_IDS } from './constants.js'; // 引入 SHOOTING_BENCHMARK
import { compareSingleHands, checkOverallSpecialHand } from './handEvaluator.js';

export function calculateRoundScore(playerHandResults, allPlayerCards, opponentHandResults = null) {
    let score = 0;
    let messageLog = [];
    let isDaoshui = false;
    let finalOverallHandType = null; // 用于记录最终生效的整体特殊牌型

    const { front: pFront, middle: pMiddle, back: pBack } = playerHandResults;

    // 0. 检查是否有整手牌的特殊牌型
    finalOverallHandType = checkOverallSpecialHand(allPlayerCards, pFront, pMiddle, pBack);
    if (finalOverallHandType && finalOverallHandType.isOverallSpecial) {
        messageLog.push(`恭喜! 特殊牌型: ${finalOverallHandType.name}!`);
        score = finalOverallHandType.score; // 特殊牌型直接计分
        // 一般特殊牌型会覆盖墩位比较和打枪，直接结算
        messageLog.push(`特殊牌型得分: ${score}`);
        return { score, messageLog, isDaoshui: false, finalOverallHandType };
    }

    // 1. 检查倒水
    if (compareSingleHands(pFront, pMiddle) > 0) {
        isDaoshui = true;
        messageLog.push("倒水：头墩大于中墩!");
    } else if (compareSingleHands(pMiddle, pBack) > 0) {
        isDaoshui = true;
        messageLog.push("倒水：中墩大于尾墩!");
    }

    if (isDaoshui) {
        score = HAND_TYPES.DAO_SHUI.score;
        messageLog.push(`倒水罚分: ${score}`);
        return { score, messageLog, isDaoshui, finalOverallHandType };
    }

    // 2. 计算各墩基础分 (如果不是整体特殊牌型或倒水)
    let dunScores = {
        front: pFront.type.score || 0,
        middle: pMiddle.type.score || 0,
        back: pBack.type.score || 0,
    };
    score = dunScores.front + dunScores.middle + dunScores.back;

    messageLog.push(`头墩 (${pFront.type.name}): ${dunScores.front}分`);
    messageLog.push(`中墩 (${pMiddle.type.name}): ${dunScores.middle}分`);
    messageLog.push(`尾墩 (${pBack.type.name}): ${dunScores.back}分`);
    messageLog.push(`牌墩基础总分: ${score}`);

    // 3. 模拟打枪 (非常简化版：三墩都比预设基准大)
    // 实际打枪是和对手比，这里仅作演示
    // 并且实际打枪是赢了对手的墩位分之后再翻倍，而不是总分翻倍
    // 这里为了简化，我们先判断是否三墩都“赢了空气”（即牌型分都>0或比某个基准大）
    
    let playerWinsFront = compareSingleHands(pFront, {type: HAND_TYPES[Object.keys(HAND_TYPES).find(k => HAND_TYPES[k].value === SHOOTING_BENCHMARK[DUN_IDS.FRONT])], mainValue: 0 /*dummy*/ }) > 0;
    let playerWinsMiddle = compareSingleHands(pMiddle, {type: HAND_TYPES[Object.keys(HAND_TYPES).find(k => HAND_TYPES[k].value === SHOOTING_BENCHMARK[DUN_IDS.MIDDLE])], mainValue: 0 }) > 0;
    let playerWinsBack = compareSingleHands(pBack, {type: HAND_TYPES[Object.keys(HAND_TYPES).find(k => HAND_TYPES[k].value === SHOOTING_BENCHMARK[DUN_IDS.BACK])], mainValue: 0 }) > 0;

    // 另一种简化打枪：如果三墩牌型分数都大于0 (即不是乌龙或0分牌型)
    // playerWinsFront = dunScores.front > 0;
    // playerWinsMiddle = dunScores.middle > 0;
    // playerWinsBack = dunScores.back > 0;


    if (opponentHandResults) { // 如果有对手数据，按真实比较
        const { front: oFront, middle: oMiddle, back: oBack } = opponentHandResults;
        playerWinsFront = compareSingleHands(pFront, oFront) > 0;
        playerWinsMiddle = compareSingleHands(pMiddle, oMiddle) > 0;
        playerWinsBack = compareSingleHands(pBack, oBack) > 0;
        
        const opponentLosesFront = compareSingleHands(pFront, oFront) < 0;
        const opponentLosesMiddle = compareSingleHands(pMiddle, oMiddle) < 0;
        const opponentLosesBack = compareSingleHands(pBack, oBack) < 0;

        if (playerWinsFront && playerWinsMiddle && playerWinsBack) {
            messageLog.push("打枪对手! 本局墩位得分翻倍!");
            score *= 2; // 假设打枪是总墩位分翻倍 (实际规则可能更复杂)
        } else if (opponentLosesFront && opponentLosesMiddle && opponentLosesBack) {
            messageLog.push("被对手打枪! 本局墩位失分翻倍 (或罚分)!");
            // 如果是负分，翻倍会更负。如果是正分，说明逻辑有误。
            // 真实打枪是按墩结算，然后输家给赢家特定倍数。
            // 这里简化：如果被打枪，分数清零或罚固定分
            score = -Math.abs(score) * 2; // 简单示例
        }

    } else { // 单人模式，模拟打枪空气
        if (playerWinsFront && playerWinsMiddle && playerWinsBack) {
            messageLog.push("完美牌型 (模拟打枪)! 墩位基础总分翻倍!");
            score *= 2; 
        }
    }
    
    messageLog.push(`最终得分: ${score}`);

    return { score, messageLog, isDaoshui, finalOverallHandType };
}
