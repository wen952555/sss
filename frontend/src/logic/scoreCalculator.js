// frontend/src/logic/scoreCalculator.js
import { compareEvaluatedHands, HAND_TYPES } from './handEvaluator'; // 确保 HAND_TYPES 被正确导入

/**
 * 获取特定牌道和牌型的基础得分和特殊牌型得分。
 * 这些规则是示例，请根据您的具体游戏规则调整。
 * @param {string}道Key ('TOP', 'MIDDLE', 'BOTTOM')
 * @param {object} handEval - 牌型评估结果 { type, kickers, ... }
 * @returns {number} 该道胜利时应得的基础水数 (考虑特殊牌型加成)
 */
function getPointsForWinningHand(道Key, handEval) {
  if (!handEval || typeof handEval.type !== 'number') return 1; // 默认普通赢1水

  // 示例得分规则:
  if (道Key === 'TOP') {
    if (handEval.type === HAND_TYPES.THREE_OF_A_KIND) return 3; // 头道三条（冲三）
  } else if (道Key === 'MIDDLE') {
    // 注意：十三水中道铁支和同花顺的加分通常非常高
    if (handEval.type === HAND_TYPES.FULL_HOUSE) return 2;    // 中道葫芦
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 8; // 中道铁支 (示例分)
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 10; // 中道同花顺 (示例分)
  } else if (道Key === 'BOTTOM') {
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 5; // 尾道铁支 (示例分)
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 7; // 尾道同花顺 (示例分)
  }
  return 1; // 普通牌型赢，得1水
}

/**
 * 比较两个玩家的三道牌，并计算 playerA 相对于 playerB 的得分。
 * @param {object} playerA - 玩家A的状态对象
 * @param {object} playerB - 玩家B的状态对象
 * @param {object} handTypeNames - 包含牌型名称的对象，用于生成详情
 * @returns {{scoreChangeA: number, details: string[]}} 返回A的得分变化和比牌详情
 */
export function compareTwoPlayers(playerA, playerB, handTypeNames) {
  let scoreChangeForA = 0;
  const details = [];

  if (!playerA.finalArrangement || !playerB.finalArrangement) {
    details.push("比牌错误: 一方或双方牌型未确定。");
    return { scoreChangeA: 0, details };
  }

  const getEvalName = (evalObj) => evalObj && handTypeNames[evalObj.type] ? handTypeNames[evalObj.type] : '未知牌型';

  const { topEval: topA, middleEval: middleA, bottomEval: bottomA } = playerA.finalArrangement;
  const { topEval: topB, middleEval: middleB, bottomEval: bottomB } = playerB.finalArrangement;

  let aWinsTop = 0, aWinsMiddle = 0, aWinsBottom = 0;

  // 头道比较
  const topComparison = compareEvaluatedHands(topA, topB);
  if (topComparison > 0) {
    const points = getPointsForWinningHand('TOP', topA);
    scoreChangeForA += points; aWinsTop = 1;
    details.push(`头道: ${playerA.name}(${getEvalName(topA)}) 胜 ${playerB.name}(${getEvalName(topB)}) +${points}`);
  } else if (topComparison < 0) {
    const points = getPointsForWinningHand('TOP', topB);
    scoreChangeForA -= points; aWinsTop = -1;
    details.push(`头道: ${playerB.name}(${getEvalName(topB)}) 胜 ${playerA.name}(${getEvalName(topA)}) -${points}`);
  } else {
    details.push(`头道: ${playerA.name}(${getEvalName(topA)}) 平 ${playerB.name}(${getEvalName(topB)})`);
  }

  // 中道比较
  const middleComparison = compareEvaluatedHands(middleA, middleB);
  if (middleComparison > 0) {
    const points = getPointsForWinningHand('MIDDLE', middleA);
    scoreChangeForA += points; aWinsMiddle = 1;
    details.push(`中道: ${playerA.name}(${getEvalName(middleA)}) 胜 ${playerB.name}(${getEvalName(middleB)}) +${points}`);
  } else if (middleComparison < 0) {
    const points = getPointsForWinningHand('MIDDLE', middleB);
    scoreChangeForA -= points; aWinsMiddle = -1;
    details.push(`中道: ${playerB.name}(${getEvalName(middleB)}) 胜 ${playerA.name}(${getEvalName(middleA)}) -${points}`);
  } else {
    details.push(`中道: ${playerA.name}(${getEvalName(middleA)}) 平 ${playerB.name}(${getEvalName(middleB)})`);
  }

  // 尾道比较
  const bottomComparison = compareEvaluatedHands(bottomA, bottomB);
  if (bottomComparison > 0) {
    const points = getPointsForWinningHand('BOTTOM', bottomA);
    scoreChangeForA += points; aWinsBottom = 1;
    details.push(`尾道: ${playerA.name}(${getEvalName(bottomA)}) 胜 ${playerB.name}(${getEvalName(bottomB)}) +${points}`);
  } else if (bottomComparison < 0) {
    const points = getPointsForWinningHand('BOTTOM', bottomB);
    scoreChangeForA -= points; aWinsBottom = -1;
    details.push(`尾道: ${playerB.name}(${getEvalName(bottomB)}) 胜 ${playerA.name}(${getEvalName(bottomA)}) -${points}`);
  } else {
    details.push(`尾道: ${playerA.name}(${getEvalName(bottomA)}) 平 ${playerB.name}(${getEvalName(bottomB)})`);
  }

  // 处理打枪: 如果一方三道全胜，则总得分翻倍
  if (aWinsTop === 1 && aWinsMiddle === 1 && aWinsBottom === 1) {
    details.push(`${playerA.name} 打枪 ${playerB.name}! 总得分翻倍.`);
    scoreChangeForA *= 2;
  } else if (aWinsTop === -1 && aWinsMiddle === -1 && aWinsBottom === -1) {
    details.push(`${playerB.name} 打枪 ${playerA.name}! ${playerA.name}总失分翻倍.`);
    scoreChangeForA *= 2; // scoreChangeForA 此时是负数，翻倍后依然是负数
  }
  
  return { scoreChangeA, details };
}

/**
 * 计算所有玩家的最终得分。
 * @param {Array<object>} originalPlayers - 包含所有玩家状态的数组。
 * @param {object} handTypeNames - 包含牌型名称的对象，用于生成详情。
 * @returns {Array<object>} 返回更新了 score 和 comparisonResults (对每个对手的详情) 的玩家数组。
 */
export function calculateAllPlayerScores(originalPlayers, handTypeNames) {
  const numPlayers = originalPlayers.length;
  if (numPlayers < 2) return originalPlayers;

  // 创建玩家数据的深拷贝副本进行操作，并初始化分数和比较结果
  let playersWithScores = JSON.parse(JSON.stringify(originalPlayers)); // 简易深拷贝
  playersWithScores.forEach(p => {
    p.score = 0; // 初始化本轮得分为0
    p.comparisonResults = {}; // 用于存储对每个其他玩家的比牌详情和得分
  });

  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      const playerA = playersWithScores[i];
      const playerB = playersWithScores[j];
      let roundScoreA = 0;
      let roundDetails = [];

      // 处理倒水：倒水方直接输给未倒水方（通常算被打枪）
      const misArrangedA = playerA.isMisArranged;
      const misArrangedB = playerB.isMisArranged;

      if (misArrangedA && !misArrangedB) {
        // A倒水，B未倒水：A输给B，通常按B每道普通赢，然后打枪计算
        let penaltyForA = -(getPointsForWinningHand('TOP', playerB.finalArrangement.topEval) +
                            getPointsForWinningHand('MIDDLE', playerB.finalArrangement.middleEval) +
                            getPointsForWinningHand('BOTTOM', playerB.finalArrangement.bottomEval));
        penaltyForA *= 2; // 打枪翻倍
        roundScoreA = penaltyForA;
        roundDetails.push(`${playerA.name} 倒水，输给 ${playerB.name} ${-penaltyForA} 水 (打枪)`);
      } else if (!misArrangedA && misArrangedB) {
        // B倒水，A未倒水：A赢B
        let winForA = (getPointsForWinningHand('TOP', playerA.finalArrangement.topEval) +
                       getPointsForWinningHand('MIDDLE', playerA.finalArrangement.middleEval) +
                       getPointsForWinningHand('BOTTOM', playerA.finalArrangement.bottomEval));
        winForA *= 2; // 打枪翻倍
        roundScoreA = winForA;
        roundDetails.push(`${playerA.name} 胜 ${playerB.name} (对方倒水) ${winForA} 水 (打枪)`);
      } else if (misArrangedA && misArrangedB) {
        // 双方都倒水，平局，不得分
        roundDetails.push(`${playerA.name} 与 ${playerB.name} 双方均倒水，平局`);
      } else {
        // 双方均未倒水，正常比牌
        const result = compareTwoPlayers(playerA, playerB, handTypeNames);
        roundScoreA = result.scoreChangeA;
        roundDetails = result.details;
      }

      playerA.score += roundScoreA;
      playerB.score -= roundScoreA; // B的得分是A的相反数

      // 记录对战详情
      playerA.comparisonResults[playerB.id] = { score: roundScoreA, details: roundDetails };
      // B对A的详情可以从A对B的详情反推，或者也记录下来
      const bDetails = roundDetails.map(detail => {
         // 简单替换名字，实际可能需要更复杂的逻辑来反转胜负描述
        return detail.replace(new RegExp(playerA.name, 'g'), 'TEMP_NAME_B')
                     .replace(new RegExp(playerB.name, 'g'), playerA.name)
                     .replace(/TEMP_NAME_B/g, playerB.name)
                     // 反转得分符号的描述
                     .replace(/\+\d+/g, (match) => `-${match.substring(1)}`)
                     .replace(/-\d+/g, (match) => `+${match.substring(1)}`);

      });
      playerB.comparisonResults[playerA.id] = { score: -roundScoreA, details: bDetails };
    }
  }
  
  // TODO: 实现全垒打逻辑。
  // 全垒打：如果一个玩家打枪了其他所有三个玩家（即对其他每个玩家的 scoreChange 都是正数且是打枪的情况）。
  // 需要检查每个玩家的 comparisonResults。如果一个玩家对其他所有玩家的 individual scoreChange 都是通过打枪赢的，
  // 则该玩家的总 score 可能会再次翻倍。
  // 例如：
  // playersWithScores.forEach(player => {
  //   let shootCount = 0;
  //   if (numPlayers > 1) { // 至少要有对手
  //       Object.keys(player.comparisonResults).forEach(opponentId => {
  //           const res = player.comparisonResults[opponentId];
  //           // 假设打枪会在 details 包含 "打枪" 并且 score > 0
  //           if (res.score > 0 && res.details.some(d => d.includes("打枪"))) {
  //               shootCount++;
  //           }
  //       });
  //   }
  //   if (shootCount === numPlayers - 1 && numPlayers > 1) { // 打枪了所有对手
  //       player.score *= 2; // 全垒打得分再翻倍 (这是一个示例规则)
  //       player.comparisonResults["all"] = { score: player.score, details: ["全垒打！最终得分翻倍！"]};
  //   }
  // });


  return playersWithScores;
}
