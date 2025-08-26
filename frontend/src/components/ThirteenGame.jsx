import React, { useState, useEffect } from 'react';
import './ThirteenGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult } from '../utils/offlineGameLogic';
import GameTable from './GameTable';

const ThirteenGame = ({ onBackToLobby, user }) => {
  const arrangement = useCardArrangement('thirteen');

  const [aiHands, setAiHands] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [hasSubmittedHand, setHasSubmittedHand] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const aiPlayerInfo = Array(3).fill(0).map((_, i) => ({ id: `ai_${i}`, phone: `AI ${i+1}`, is_ready: false }));
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }, ...aiPlayerInfo]);
  }, [user]);

  const handleReady = () => {
    const { playerHand, aiHands: initialAiHands } = dealOfflineThirteenGame(4);
    arrangement.setInitialCards(playerHand);
    const sortedAiHands = initialAiHands.map(getAiThirteenHand);
    setAiHands(sortedAiHands);
    setHasDealt(true);
    setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
  };

  const handleConfirm = () => {
    if (arrangement.topLane.length !== arrangement.LANE_LIMITS.top || arrangement.middleLane.length !== arrangement.LANE_LIMITS.middle || arrangement.bottomLane.length !== arrangement.LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }
    const playerHand = {
      top: arrangement.topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: arrangement.middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: arrangement.bottomLane.map(c => `${c.rank}_of_${c.suit}`)
    };
    const result = calculateThirteenTrialResult(playerHand, aiHands);
    const modalPlayers = [
      { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
    ];
    setGameResult({ players: modalPlayers });
    setHasSubmittedHand(true);
  };

  return (
    <GameTable
      gameType="thirteen"
      title="十三张 - 试玩模式"
      players={players}
      user={user}

      // State from arrangement hook
      topLane={arrangement.topLane}
      middleLane={arrangement.middleLane}
      bottomLane={arrangement.bottomLane}
      unassignedCards={arrangement.unassignedCards}
      selectedCards={arrangement.selectedCards}
      LANE_LIMITS={arrangement.LANE_LIMITS}

      // Other state
      hasDealt={hasDealt}
      hasSubmittedHand={hasSubmittedHand}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}

      // Handlers
      onBackToLobby={onBackToLobby}
      onReady={handleReady}
      onConfirm={handleConfirm}
      onAutoSort={arrangement.handleAutoSort}
      onCardClick={arrangement.handleCardClick}
      onLaneClick={arrangement.handleLaneClick}
      onCloseResult={() => setGameResult(null)}
    />
  );
};

export default ThirteenGame;