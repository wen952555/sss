// frontend_react/src/logic/gameLogic.js
import { createDeck, shuffleDeck, evaluateHand, compareEvaluatedHands, isValidArrangement } from './cardUtils';

export const GameStates = {
  INIT: 'INIT', // 游戏初始化
  DEALING: 'DEALING', // 发牌中
  ARRANGING: 'ARRANGING', // 玩家理牌中
  COMPARING: 'COMPARING', // 比牌中
  RESULTS: 'RESULTS', // 显示结果
  GAME_OVER: 'GAME_OVER', // 游戏结束
};

export const initialGameState = {
  deck: [],
  players: [
    { id: 'player1', name: '玩家', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: true, score: 0, autoArrange: false, confirmed: false, evalHands: null },
    { id: 'ai1', name: 'AI 1', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, autoArrange: true, confirmed: false, evalHands: null },
    { id: 'ai2', name: 'AI 2', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, autoArrange: true, confirmed: false, evalHands: null },
    { id: 'ai3', name: 'AI 3', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, autoArrange: true, confirmed: false, evalHands: null },
  ],
  gameState: GameStates.INIT,
  currentPlayerId: 'player1', // 通常十三水是同时理牌，这里可能用不上
  roundResults: null, // 本轮比牌结果
};

export function startGame(currentState) {
  let deck = createDeck();
  deck = shuffleDeck(deck);

  const newPlayers = currentState.players.map(player => ({
    ...player,
    hand: [],
    arranged: { tou: [], zhong: [], wei: [] },
    confirmed: false,
    evalHands: null,
  }));

  // 发牌
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      newPlayers[j].hand.push(deck.pop());
    }
  }
  
  // 对手牌进行排序，方便查看
  newPlayers.forEach(player => {
    player.hand.sort((a,b) => a.rankValue - b.rankValue || a.suitRank - b.suitRank);
  });


  return {
    ...currentState,
    deck: deck, // 剩余的牌，理论上十三水发完就没了
    players: newPlayers,
    gameState: GameStates.ARRANGING,
    roundResults: null,
  };
}

// 玩家确认墩牌
export function confirmArrangement(currentState, playerId, arrangedCards) {
  // arrangedCards: { tou: [...], zhong: [...], wei: [...] }
  if (!isValidArrangement(arrangedCards.tou, arrangedCards.zhong, arrangedCards.wei)) {
    alert('墩牌不合法！头墩必须小于等于中墩，中墩必须小于等于尾墩。');
    return currentState;
  }

  const playerIndex = currentState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return currentState;

  const updatedPlayers = [...currentState.players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    arranged: arrangedCards,
    evalHands: {
        tou: evaluateHand(arrangedCards.tou),
        zhong: evaluateHand(arrangedCards.zhong),
        wei: evaluateHand(arrangedCards.wei),
    },
    confirmed: true,
  };
  
  // 检查是否所有玩家都已确认
  const allConfirmed = updatedPlayers.every(p => p.confirmed);

  return {
    ...currentState,
    players: updatedPlayers,
    gameState: allConfirmed ? GameStates.COMPARING : currentState.gameState,
  };
}


// 比牌逻辑 (简化版，仅两两比较，没有计算特殊牌型的额外得分)
export function compareAllHands(currentState) {
  if (currentState.gameState !== GameStates.COMPARING) return currentState;

  const players = currentState.players;
  const numPlayers = players.length;
  let newScores = players.map(p => p.score); // 复制当前分数
  const roundResultsDetails = []; // 记录每墩比较的详细信息

  // 1. 每位玩家和其他所有玩家比较
  for (let i = 0; i < numPlayers; i++) {
    if (!players[i].evalHands) continue; // 未摆牌的玩家不参与比较

    for (let j = i + 1; j < numPlayers; j++) {
      if (!players[j].evalHands) continue;

      let scorePlayerI = 0; // 玩家i相对于玩家j的得分
      let scorePlayerJ = 0; // 玩家j相对于玩家i的得分
      const comparisonDetail = {
        playerA: players[i].name,
        playerB: players[j].name,
        tou: '', zhong: '', wei: '', totalScoreA: 0, totalScoreB: 0
      };

      // 比较头墩
      const touCompare = compareEvaluatedHands(players[i].evalHands.tou, players[j].evalHands.tou);
      if (touCompare > 0) { scorePlayerI++; comparisonDetail.tou = `${players[i].name} 胜`; }
      else if (touCompare < 0) { scorePlayerJ++; comparisonDetail.tou = `${players[j].name} 胜`; }
      else { comparisonDetail.tou = '平';}

      // 比较中墩
      const zhongCompare = compareEvaluatedHands(players[i].evalHands.zhong, players[j].evalHands.zhong);
      if (zhongCompare > 0) { scorePlayerI++; comparisonDetail.zhong = `${players[i].name} 胜`; }
      else if (zhongCompare < 0) { scorePlayerJ++; comparisonDetail.zhong = `${players[j].name} 胜`; }
      else { comparisonDetail.zhong = '平';}
      
      // 比较尾墩
      const weiCompare = compareEvaluatedHands(players[i].evalHands.wei, players[j].evalHands.wei);
      if (weiCompare > 0) { scorePlayerI++; comparisonDetail.wei = `${players[i].name} 胜`; }
      else if (weiCompare < 0) { scorePlayerJ++; comparisonDetail.wei = `${players[j].name} 胜`; }
      else { comparisonDetail.wei = '平';}

      // "打枪" (三墩全胜) 逻辑，得分翻倍 (基础是赢2墩算赢1水，赢3墩算赢2水，打枪再翻倍)
      // 简化：赢一墩得1分，输一墩扣1分。打枪则总分*2
      let points = 0;
      if (scorePlayerI > scorePlayerJ) { // 玩家i赢了玩家j
        points = scorePlayerI - scorePlayerJ; // 基础水数
        if (scorePlayerI === 3) points *= 2; // 打枪
        newScores[i] += points;
        newScores[j] -= points;
        comparisonDetail.totalScoreA = points;
        comparisonDetail.totalScoreB = -points;
      } else if (scorePlayerJ > scorePlayerI) { // 玩家j赢了玩家i
        points = scorePlayerJ - scorePlayerI;
        if (scorePlayerJ === 3) points *= 2; // 打枪
        newScores[j] += points;
        newScores[i] -= points;
        comparisonDetail.totalScoreB = points;
        comparisonDetail.totalScoreA = -points;
      }
      // 如果scorePlayerI === scorePlayerJ (比如1:1墩)，则平局，不计分
      roundResultsDetails.push(comparisonDetail);
    }
  }

  // TODO: 实现特殊牌型加分（如三顺子、三同花、铁支、同花顺等有额外加分）
  // 这部分逻辑复杂，需要根据具体规则添加。例如：
  // players.forEach((player, index) => {
  //   if (player.evalHands) {
  //     // 检查尾墩是否有特殊牌型
  //     if (player.evalHands.wei.type === 'four_of_a_kind') newScores[index] += 4; // 铁支在尾墩加4水 (示例)
  //     if (player.evalHands.wei.type === 'straight_flush') newScores[index] += 5; // 同花顺在尾墩加5水 (示例)
  //     // 检查中墩
  //     if (player.evalHands.zhong.type === 'full_house') newScores[index] += 2; // 葫芦在中墩加2水 (示例)
  //     // ... 更多特殊牌型和墩位的加分规则
  //   }
  // });


  const updatedPlayers = currentState.players.map((p, idx) => ({ ...p, score: newScores[idx] }));

  return {
    ...currentState,
    players: updatedPlayers,
    gameState: GameStates.RESULTS,
    roundResults: {
        summary: `比牌结束! 各玩家得分已更新。`,
        details: roundResultsDetails
    }
  };
}
