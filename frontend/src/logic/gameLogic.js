// frontend_react/src/logic/gameLogic.js
import { createDeck, shuffleDeck, evaluateHand, compareEvaluatedHands } from './cardUtils'; // Removed isValidArrangement
import { t } from '../i18n';

export const GameStates = {
  INIT: 'INIT',
  DEALING: 'DEALING',
  COMPARING: 'COMPARING',
  RESULTS: 'RESULTS',
};

export const initialGameState = {
  deck: [],
  players: [
    { id: 'player1', name: '玩家', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: true, score: 0, evalHands: null, confirmed: false },
    { id: 'ai1', name: 'AI 1', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, evalHands: null, confirmed: false },
    { id: 'ai2', name: 'AI 2', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, evalHands: null, confirmed: false },
    { id: 'ai3', name: 'AI 3', hand: [], arranged: { tou: [], zhong: [], wei: [] }, isHuman: false, score: 0, evalHands: null, confirmed: false },
  ],
  gameState: GameStates.INIT,
  roundResults: null,
};

export function startGame(currentState) {
  console.time("shuffleAndDeal");
  let deck = createDeck();
  deck = shuffleDeck(deck);

  const newPlayers = currentState.players.map(player => ({
    ...player,
    hand: [],
    arranged: { tou: [], zhong: [], wei: [] },
    evalHands: null,
    confirmed: false,
  }));

  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      if (deck.length > 0) {
        newPlayers[j].hand.push(deck.pop());
      } else {
        console.error("Deck ran out of cards during dealing!");
        break;
      }
    }
    if (deck.length === 0 && i < 12) break; 
  }
  console.timeEnd("shuffleAndDeal");
  
  return {
    ...currentState,
    deck: deck,
    players: newPlayers,
    gameState: GameStates.DEALING,
    roundResults: null,
  };
}

export function confirmArrangement(currentState, playerId, arrangedCards) {
  const playerIndex = currentState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return currentState;

  const updatedPlayers = [...currentState.players];
  const playerToUpdate = { ...updatedPlayers[playerIndex] };

  playerToUpdate.arranged = arrangedCards;
  playerToUpdate.evalHands = {
      tou: evaluateHand(arrangedCards.tou),
      zhong: evaluateHand(arrangedCards.zhong),
      wei: evaluateHand(arrangedCards.wei),
  };
  playerToUpdate.confirmed = true;
  updatedPlayers[playerIndex] = playerToUpdate;
  
  return {
    ...currentState,
    players: updatedPlayers,
  };
}

export function compareAllHands(currentState) {
  console.time("compareAllHandsLogic");
  const players = currentState.players.filter(p => p.confirmed && p.evalHands);
  const numPlayers = players.length;

  if (numPlayers < 2) {
    console.warn("Not enough confirmed players with hands to compare.");
    return { ...currentState, gameState: GameStates.RESULTS, roundResults: { summary: t("等待玩家..."), details: [] } };
  }

  const playerScoresMap = new Map(currentState.players.map(p => [p.id, p.score]));
  const roundResultsDetails = [];

  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      const playerA = players[i];
      const playerB = players[j];
      let scorePlayerA_vs_B = 0;
      let scorePlayerB_vs_A = 0;
      const comparisonDetail = {
        playerA_id: playerA.id, playerA_name: playerA.name,
        playerB_id: playerB.id, playerB_name: playerB.name,
        tou: '', zhong: '', wei: '',
        pointsPlayerA: 0, pointsPlayerB: 0
      };

      const touCompare = compareEvaluatedHands(playerA.evalHands.tou, playerB.evalHands.tou);
      if (touCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.tou = t("%s 胜", playerA.name); }
      else if (touCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.tou = t("%s 胜", playerB.name); }
      else { comparisonDetail.tou = t('平'); }

      const zhongCompare = compareEvaluatedHands(playerA.evalHands.zhong, playerB.evalHands.zhong);
      if (zhongCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.zhong = t("%s 胜", playerA.name); }
      else if (zhongCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.zhong = t("%s 胜", playerB.name); }
      else { comparisonDetail.zhong = t('平'); }

      const weiCompare = compareEvaluatedHands(playerA.evalHands.wei, playerB.evalHands.wei);
      if (weiCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.wei = t("%s 胜", playerA.name); }
      else if (weiCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.wei = t("%s 胜", playerB.name); }
      else { comparisonDetail.wei = t('平'); }

      let pointsEarned = 0;
      if (scorePlayerA_vs_B > scorePlayerB_vs_A) {
        pointsEarned = scorePlayerA_vs_B - scorePlayerB_vs_A;
        if (scorePlayerA_vs_B === 3) pointsEarned *= 2;
        playerScoresMap.set(playerA.id, (playerScoresMap.get(playerA.id) || 0) + pointsEarned);
        playerScoresMap.set(playerB.id, (playerScoresMap.get(playerB.id) || 0) - pointsEarned);
        comparisonDetail.pointsPlayerA = pointsEarned;
        comparisonDetail.pointsPlayerB = -pointsEarned;
      } else if (scorePlayerB_vs_A > scorePlayerA_vs_B) {
        pointsEarned = scorePlayerB_vs_A - scorePlayerA_vs_B;
        if (scorePlayerB_vs_A === 3) pointsEarned *= 2;
        playerScoresMap.set(playerB.id, (playerScoresMap.get(playerB.id) || 0) + pointsEarned);
        playerScoresMap.set(playerA.id, (playerScoresMap.get(playerA.id) || 0) - pointsEarned);
        comparisonDetail.pointsPlayerB = pointsEarned;
        comparisonDetail.pointsPlayerA = -pointsEarned;
      }
      roundResultsDetails.push(comparisonDetail);
    }
  }

  const updatedPlayers = currentState.players.map(p => ({
    ...p,
    score: playerScoresMap.get(p.id) || p.score,
  }));
  console.timeEnd("compareAllHandsLogic");

  return {
    ...currentState,
    players: updatedPlayers,
    gameState: GameStates.RESULTS,
    roundResults: {
        summary: t(`比牌结束! 各玩家得分已更新。`),
        details: roundResultsDetails
    }
  };
}
