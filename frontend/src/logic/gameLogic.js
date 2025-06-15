// frontend_react/src/logic/gameLogic.js
import { createDeck, shuffleDeck, evaluateHand, compareEvaluatedHands, isValidArrangement } from './cardUtils';

export const GameStates = {
  INIT: 'INIT',
  DEALING: 'DEALING', // Potentially very short or skipped if cards dealt immediately
  // HUMAN_ARRANGING is a custom state used in App.js
  COMPARING: 'COMPARING', // Marks the start of comparison logic
  RESULTS: 'RESULTS', // Indicates results are ready to be shown (e.g., in modal)
  // GAME_OVER: 'GAME_OVER', // If you want an explicit game over state
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
  deck = shuffleDeck(deck); // This should be efficient

  const newPlayers = currentState.players.map(player => ({
    ...player, // Preserve ID, name, isHuman, score
    hand: [], // Reset hand
    arranged: { tou: [], zhong: [], wei: [] }, // Reset arrangement
    evalHands: null, // Reset evaluated hands
    confirmed: false, // Reset confirmation
  }));

  // Deal 13 cards to each player
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
  
  // Sort player hands for easier AI processing / display if needed (optional for performance)
  // newPlayers.forEach(player => {
  //   player.hand.sort((a,b) => a.rankValue - b.rankValue || a.suitRank - b.suitRank);
  // });

  return {
    ...currentState, // Keep other potential top-level state properties
    deck: deck, // Remaining deck (should be empty or nearly empty)
    players: newPlayers,
    gameState: GameStates.DEALING, // Or directly to HUMAN_ARRANGING if dealing is instant
    roundResults: null,
  };
}

export function confirmArrangement(currentState, playerId, arrangedCards) {
  const playerIndex = currentState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return currentState;

  // isValidArrangement should already be checked before calling this for human
  // For AI, it's assumed their arrangement is valid by the AI logic

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
    // gameState might change to COMPARING if all are confirmed, handled in App.js
  };
}

export function compareAllHands(currentState) {
  console.time("compareAllHandsLogic");
  const players = currentState.players.filter(p => p.confirmed && p.evalHands); // Only compare confirmed players with evaluated hands
  const numPlayers = players.length;

  if (numPlayers < 2) { // Not enough players to compare
    console.warn("Not enough confirmed players with hands to compare.");
    return { ...currentState, gameState: GameStates.RESULTS, roundResults: { summary: "等待玩家...", details: [] } };
  }

  // Create a mutable copy of scores from the *original* player list in currentState
  // to correctly update scores for all players, even those not in the 'players' filtered list (though they should be).
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
        pointsPlayerA: 0, pointsPlayerB: 0 // Points for this specific comparison
      };

      // Compare Tou
      const touCompare = compareEvaluatedHands(playerA.evalHands.tou, playerB.evalHands.tou);
      if (touCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.tou = `${playerA.name} 胜`; }
      else if (touCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.tou = `${playerB.name} 胜`; }
      else { comparisonDetail.tou = '平'; }

      // Compare Zhong
      const zhongCompare = compareEvaluatedHands(playerA.evalHands.zhong, playerB.evalHands.zhong);
      if (zhongCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.zhong = `${playerA.name} 胜`; }
      else if (zhongCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.zhong = `${playerB.name} 胜`; }
      else { comparisonDetail.zhong = '平'; }

      // Compare Wei
      const weiCompare = compareEvaluatedHands(playerA.evalHands.wei, playerB.evalHands.wei);
      if (weiCompare > 0) { scorePlayerA_vs_B++; comparisonDetail.wei = `${playerA.name} 胜`; }
      else if (weiCompare < 0) { scorePlayerB_vs_A++; comparisonDetail.wei = `${playerB.name} 胜`; }
      else { comparisonDetail.wei = '平'; }

      let pointsEarned = 0;
      if (scorePlayerA_vs_B > scorePlayerB_vs_A) { // Player A wins overall against Player B
        pointsEarned = scorePlayerA_vs_B - scorePlayerB_vs_A;
        if (scorePlayerA_vs_B === 3) pointsEarned *= 2; // 打枪
        
        playerScoresMap.set(playerA.id, (playerScoresMap.get(playerA.id) || 0) + pointsEarned);
        playerScoresMap.set(playerB.id, (playerScoresMap.get(playerB.id) || 0) - pointsEarned);
        comparisonDetail.pointsPlayerA = pointsEarned;
        comparisonDetail.pointsPlayerB = -pointsEarned;

      } else if (scorePlayerB_vs_A > scorePlayerA_vs_B) { // Player B wins overall against Player A
        pointsEarned = scorePlayerB_vs_A - scorePlayerA_vs_B;
        if (scorePlayerB_vs_A === 3) pointsEarned *= 2; // 打枪

        playerScoresMap.set(playerB.id, (playerScoresMap.get(playerB.id) || 0) + pointsEarned);
        playerScoresMap.set(playerA.id, (playerScoresMap.get(playerA.id) || 0) - pointsEarned);
        comparisonDetail.pointsPlayerB = pointsEarned;
        comparisonDetail.pointsPlayerA = -pointsEarned;
      }
      roundResultsDetails.push(comparisonDetail);
    }
  }

  // TODO: Add logic for special hand type scoring (e.g.,一条龙,三同花 etc.)
  // This would iterate through each player and add bonus points based on their `evalHands`.

  const updatedPlayers = currentState.players.map(p => ({
    ...p,
    score: playerScoresMap.get(p.id) || p.score, // Update score from the map
  }));
  console.timeEnd("compareAllHandsLogic");

  return {
    ...currentState,
    players: updatedPlayers,
    gameState: GameStates.RESULTS,
    roundResults: {
        summary: `比牌结束! 各玩家得分已更新。`, // This summary isn't shown in current modal
        details: roundResultsDetails // This can be used if you add detailed comparison text
    }
  };
}
