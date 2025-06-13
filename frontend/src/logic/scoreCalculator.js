// frontend/src/logic/scoreCalculator.js
import { compareEvaluatedHands, HAND_TYPES } from './handEvaluator';

// getPointsForWinningHand 函数保持不变 (此处省略，参考上一版本)
function getPointsForWinningHand(道Key, handEval) {
  if (!handEval || typeof handEval.type !== 'number') return 1;
  if (道Key === 'TOP') {
    if (handEval.type === HAND_TYPES.THREE_OF_A_KIND) return 3;
  } else if (道Key === 'MIDDLE') {
    if (handEval.type === HAND_TYPES.FULL_HOUSE) return 2;
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 8;
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 10;
  } else if (道Key === 'BOTTOM') {
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 5;
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 7;
  }
  return 1;
}

// compareTwoPlayers 函数保持不变 (此处省略，参考上一版本)
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

  if (aWinsTop === 1 && aWinsMiddle === 1 && aWinsBottom === 1) {
    details.push(`${playerA.name} 打枪 ${playerB.name}! 总得分翻倍.`);
    scoreChangeForA *= 2;
  } else if (aWinsTop === -1 && aWinsMiddle === -1 && aWinsBottom === -1) {
    details.push(`${playerB.name} 打枪 ${playerA.name}! ${playerA.name}总失分翻倍.`);
    scoreChangeForA *= 2;
  }
  return { scoreChangeA: scoreChangeForA, details }; // scoreChangeA 重命名为 scoreChangeForA
}


export function calculateAllPlayerScores(originalPlayers, handTypeNames) {
  const numPlayers = originalPlayers.length;
  if (numPlayers < 2) return originalPlayers;

  let playersWithScores = JSON.parse(JSON.stringify(originalPlayers));
  playersWithScores.forEach(p => {
    p.score = p.score || 0; // 保留多局累加的总分，如果不存在则初始化为0
    p.roundScore = 0;       // 本轮得分初始化为0
    p.comparisonResults = {};
  });

  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      const playerA_ref = playersWithScores[i]; // 使用引用以确保分数更新到正确的对象
      const playerB_ref = playersWithScores[j];
      let currentRoundScoreForA = 0; // 本轮A对B的得分
      let currentRoundDetails = [];

      const misArrangedA = playerA_ref.isMisArranged;
      const misArrangedB = playerB_ref.isMisArranged;

      if (misArrangedA && !misArrangedB) {
        let penaltyForA = -(getPointsForWinningHand('TOP', playerB_ref.finalArrangement.topEval) +
                            getPointsForWinningHand('MIDDLE', playerB_ref.finalArrangement.middleEval) +
                            getPointsForWinningHand('BOTTOM', playerB_ref.finalArrangement.bottomEval));
        penaltyForA *= 2;
        currentRoundScoreForA = penaltyForA;
        currentRoundDetails.push(`${playerA_ref.name} 倒水，输给 ${playerB_ref.name} ${-penaltyForA} 水 (打枪)`);
      } else if (!misArrangedA && misArrangedB) {
        let winForA = (getPointsForWinningHand('TOP', playerA_ref.finalArrangement.topEval) +
                       getPointsForWinningHand('MIDDLE', playerA_ref.finalArrangement.middleEval) +
                       getPointsForWinningHand('BOTTOM', playerA_ref.finalArrangement.bottomEval));
        winForA *= 2;
        currentRoundScoreForA = winForA;
        currentRoundDetails.push(`${playerA_ref.name} 胜 ${playerB_ref.name} (对方倒水) ${winForA} 水 (打枪)`);
      } else if (misArrangedA && misArrangedB) {
        currentRoundDetails.push(`${playerA_ref.name} 与 ${playerB_ref.name} 双方均倒水，平局`);
      } else {
        // 正常比牌，调用 compareTwoPlayers
        // 注意：compareTwoPlayers 返回的是 scoreChangeA (playerA相对于playerB的得分变化)
        const result = compareTwoPlayers(playerA_ref, playerB_ref, handTypeNames);
        currentRoundScoreForA = result.scoreChangeA; // result.scoreChangeA 是 playerA 相对于 playerB 的得分
        currentRoundDetails = result.details;
      }

      playerA_ref.roundScore += currentRoundScoreForA; // 累加A的本轮得分
      playerB_ref.roundScore -= currentRoundScoreForA; // B的本轮得分是A的相反数

      // 记录对战详情
      playerA_ref.comparisonResults[playerB_ref.id] = { score: currentRoundScoreForA, details: currentRoundDetails };
      
      // 生成B对A的详情 (反转描述)
      const bDetailsForA = currentRoundDetails.map(detail => {
        let tempDetail = detail;
        // 替换名字
        tempDetail = tempDetail.replace(new RegExp(playerA_ref.name, 'g'), 'TEMP_PLAYER_A_NAME');
        tempDetail = tempDetail.replace(new RegExp(playerB_ref.name, 'g'), playerA_ref.name);
        tempDetail = tempDetail.replace(/TEMP_PLAYER_A_NAME/g, playerB_ref.name);
        // 反转胜负关系 (这是一个简化的替换，可能不完美覆盖所有情况)
        if (tempDetail.includes("胜")) {
            tempDetail = tempDetail.replace("胜", "被胜于"); // 或 "负于"
        } else if (tempDetail.includes("被胜于")) {
            tempDetail = tempDetail.replace("被胜于", "胜");
        }
        // 反转得分符号 (+/-)
        tempDetail = tempDetail.replace(/\+(\d+)/g, (match, p1) => `-${p1}`);
        tempDetail = tempDetail.replace(/-(\d+)/g, (match, p1) => `+${p1}`);
        return tempDetail;
      });
      playerB_ref.comparisonResults[playerA_ref.id] = { score: -currentRoundScoreForA, details: bDetailsForA };
    }
  }

  // 将本轮得分累加到总分
  playersWithScores.forEach(p => {
    p.score += p.roundScore;
  });

  // TODO: 全垒打逻辑 (需要基于每个玩家对其他所有对手的 roundScore 和打枪情况判断)
  // ...

  return playersWithScores;
}
