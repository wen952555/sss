// frontend/src/logic/scoreCalculator.js
import { compareEvaluatedHands, HAND_TYPES } from './handEvaluator';

/**
 * 获取特定牌道和牌型的基础得分和特殊牌型得分。
 * 注意：这些得分规则可以根据你的具体游戏设定进行调整。
 * @param {string}道 ('TOP', 'MIDDLE', 'BOTTOM')
 * @param {object} handEval - 牌型评估结果 { type, kickers, ... }
 * @returns {number} 特殊牌型应得的水数 (如果普通赢则为1)
 */
function getSpecialHandScore(道, handEval) {
  if (!handEval || typeof handEval.type !== 'number') return 1; // 默认普通赢1水

  if (道 === 'TOP') {
    if (handEval.type === HAND_TYPES.THREE_OF_A_KIND) return 3; // 头道冲三，得3水
  } else if (道 === 'MIDDLE') {
    if (handEval.type === HAND_TYPES.FULL_HOUSE) return 2;    // 中道葫芦，得2水
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 8; // 中道铁支，得8水 (有些规则是4或5)
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 10; // 中道同花顺，得10水 (有些规则是5或7)
  } else if (道 === 'BOTTOM') {
    if (handEval.type === HAND_TYPES.FOUR_OF_A_KIND) return 5; // 尾道铁支，得5水 (有些规则是4)
    if (handEval.type >= HAND_TYPES.STRAIGHT_FLUSH) return 7; // 尾道同花顺，得7水 (有些规则是5)
  }
  return 1; // 普通牌型赢，得1水
}

/**
 * 比较两个玩家的三道牌，并计算 playerA 相对于 playerB 的得分。
 * @param {object} playerA - 玩家A的状态对象，包含 finalArrangement: {topEval, middleEval, bottomEval}
 * @param {object} playerB - 玩家B的状态对象
 * @returns {{scoreA: number, scoreB: number, details: string[]}} 返回A和B的得分变化，以及比牌详情
 */
export function compareTwoPlayers(playerA, playerB) {
  let scoreChangeA = 0;
  const details = [];

  if (!playerA.finalArrangement || !playerB.finalArrangement) {
    console.error("One or both players have no final arrangement for comparison.");
    return { scoreA: 0, scoreB: 0, details: ["比牌错误: 玩家牌型未确定"] };
  }

  const { topEval: topA, middleEval: middleA, bottomEval: bottomA } = playerA.finalArrangement;
  const { topEval: topB, middleEval: middleB, bottomEval: bottomB } = playerB.finalArrangement;

  let aWinsTop = 0, aWinsMiddle = 0, aWinsBottom = 0;

  // 1. 头道比较
  const topComparison = compareEvaluatedHands(topA, topB);
  if (topComparison > 0) { // A赢头道
    const points = getSpecialHandScore('TOP', topA);
    scoreChangeA += points;
    aWinsTop = 1;
    details.push(`${playerA.name} 头道(${topA.name}) 胜 ${playerB.name} (${topB.name}) 得 ${points} 水`);
  } else if (topComparison < 0) { // B赢头道
    const points = getSpecialHandScore('TOP', topB);
    scoreChangeA -= points;
    aWinsTop = -1;
    details.push(`${playerB.name} 头道(${topB.name}) 胜 ${playerA.name} (${topA.name}) 得 ${points} 水`);
  } else {
    details.push(`${playerA.name} 头道 与 ${playerB.name} 平手`);
  }

  // 2. 中道比较
  const middleComparison = compareEvaluatedHands(middleA, middleB);
  if (middleComparison > 0) { // A赢中道
    const points = getSpecialHandScore('MIDDLE', middleA);
    scoreChangeA += points;
    aWinsMiddle = 1;
    details.push(`${playerA.name} 中道(${middleA.name}) 胜 ${playerB.name} (${middleB.name}) 得 ${points} 水`);
  } else if (middleComparison < 0) { // B赢中道
    const points = getSpecialHandScore('MIDDLE', middleB);
    scoreChangeA -= points;
    aWinsMiddle = -1;
    details.push(`${playerB.name} 中道(${middleB.name}) 胜 ${playerA.name} (${middleA.name}) 得 ${points} 水`);
  } else {
    details.push(`${playerA.name} 中道 与 ${playerB.name} 平手`);
  }

  // 3. 尾道比较
  const bottomComparison = compareEvaluatedHands(bottomA, bottomB);
  if (bottomComparison > 0) { // A赢尾道
    const points = getSpecialHandScore('BOTTOM', bottomA);
    scoreChangeA += points;
    aWinsBottom = 1;
    details.push(`${playerA.name} 尾道(${bottomA.name}) 胜 ${playerB.name} (${bottomB.name}) 得 ${points} 水`);
  } else if (bottomComparison < 0) { // B赢尾道
    const points = getSpecialHandScore('BOTTOM', bottomB);
    scoreChangeA -= points;
    aWinsBottom = -1;
    details.push(`${playerB.name} 尾道(${bottomB.name}) 胜 ${playerA.name} (${bottomA.name}) 得 ${points} 水`);
  } else {
    details.push(`${playerA.name} 尾道 与 ${playerB.name} 平手`);
  }

  // 4. 处理打枪 (A打枪B 或 B打枪A)
  // 打枪定义：三道全胜 (1, 1, 1) 或三道全输 (-1, -1, -1)
  if (aWinsTop === 1 && aWinsMiddle === 1 && aWinsBottom === 1) {
    details.push(`${playerA.name} 打枪 ${playerB.name}! 得分翻倍!`);
    scoreChangeA *= 2; // 基础分翻倍
  } else if (aWinsTop === -1 && aWinsMiddle === -1 && aWinsBottom === -1) {
    details.push(`${playerB.name} 打枪 ${playerA.name}! ${playerA.name}失分翻倍!`);
    scoreChangeA *= 2; // A的失分翻倍
  }
  
  // 返回 playerA 的得分变化，playerB 的得分变化是其相反数
  return { scoreA: scoreChangeA, scoreB: -scoreChangeA, details };
}


/**
 * 计算所有玩家的最终得分。
 * @param {Array<object>} playersArray - 包含所有玩家状态的数组。
 * @returns {Array<object>} 返回更新了 score 和 comparisonDetails 的玩家数组。
 */
export function calculateAllPlayerScores(playersArray) {
  const numPlayers = playersArray.length;
  if (numPlayers < 2) return playersArray; // 少于2个玩家无法比牌

  // 复制玩家数组以避免直接修改原状态，并初始化比较详情
  let playersWithScores = playersArray.map(p => ({ ...p, score: 0, comparisonDetails: [] }));

  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      const playerA = playersWithScores[i];
      const playerB = playersWithScores[j];

      // 确保玩家都已摆好牌且没有倒水 (AI默认不倒水)
      // 如果一个玩家倒水，则算自动输给未倒水的玩家，通常是输掉每道的基础分或特定惩罚分
      if (playerA.isMisArranged && !playerB.isMisArranged) {
        const penalty = - (getSpecialHandScore('TOP', playerB.finalArrangement.topEval) +
                           getSpecialHandScore('MIDDLE', playerB.finalArrangement.middleEval) +
                           getSpecialHandScore('BOTTOM', playerB.finalArrangement.bottomEval)) * 2; // 倒水通常输打枪
        playerA.score += penalty;
        playerB.score -= penalty;
        playerA.comparisonDetails.push(`对 ${playerB.name}: 倒水，输 ${-penalty} 水`);
        playerB.comparisonDetails.push(`对 ${playerA.name}: 对方倒水，赢 ${-penalty} 水`);
        continue; // 跳过正常比牌
      }
      if (playerB.isMisArranged && !playerA.isMisArranged) {
        const penalty = - (getSpecialHandScore('TOP', playerA.finalArrangement.topEval) +
                           getSpecialHandScore('MIDDLE', playerA.finalArrangement.middleEval) +
                           getSpecialHandScore('BOTTOM', playerA.finalArrangement.bottomEval)) * 2;
        playerB.score += penalty;
        playerA.score -= penalty;
        playerB.comparisonDetails.push(`对 ${playerA.name}: 倒水，输 ${-penalty} 水`);
        playerA.comparisonDetails.push(`对 ${playerB.name}: 对方倒水，赢 ${-penalty} 水`);
        continue;
      }
      // 如果双方都倒水，可以算平局或按其他规则处理，这里简化为不计分
      if (playerA.isMisArranged && playerB.isMisArranged) {
        playerA.comparisonDetails.push(`对 ${playerB.name}: 双方均倒水`);
        playerB.comparisonDetails.push(`对 ${playerA.name}: 双方均倒水`);
        continue;
      }


      const result = compareTwoPlayers(playerA, playerB);
      playerA.score += result.scoreA;
      playerB.score += result.scoreB;
      
      // 存储详细比牌过程，可选
      playerA.comparisonDetails.push(`对 ${playerB.name}: ${result.details.join('; ')} -> 得分变化: ${result.scoreA}`);
      playerB.comparisonDetails.push(`对 ${playerA.name}: ${result.details.map(d => d.includes(playerA.name + " ") ? d.replace(playerA.name + " ", playerB.name + " TEMP_SWAP_PLAYER ").replace(playerB.name + " ", playerA.name + " ").replace("TEMP_SWAP_PLAYER", "") : d.includes(playerB.name + " ") ? d.replace(playerB.name + " ", playerA.name + " TEMP_SWAP_PLAYER ").replace(playerA.name + " ", playerB.name + " ").replace("TEMP_SWAP_PLAYER", "") : d ).join('; ')} -> 得分变化: ${result.scoreB}`);
    }
  }

  // TODO: 处理全垒打 (Home Run / Scoop)
  // 如果一个玩家打枪了其他所有三个玩家，则其总得分可能会再次翻倍或获得额外奖励。
  // 例如，检查 playersWithScores 中是否有玩家的 score 是通过3次打枪累积的。
  // 这部分逻辑可以根据具体规则添加。

  return playersWithScores;
}
