import React, { useState, useEffect } from 'react';
import './EightCardGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineEightCardGame, getSmartSortedHandForEight, calculateEightCardTrialResult } from '../utils';
import GameTable from './GameTable';

const EightCardGame = ({ onBackToLobby, user }) => {
  const arrangement = useCardArrangement('eight');

  const [aiHands, setAiHands] = useState([]);
  const [playerState, setPlayerState] = useState('waiting'); // 'waiting', 'arranging', 'submitted'
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const aiPlayerInfo = Array(5).fill(0).map((_, i) => ({ id: `ai_${i}`, phone: `AI ${i+1}`, is_ready: false }));
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }, ...aiPlayerInfo]);
  }, [user]);

  const handleReady = () => {
    const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);
    arrangement.setInitialCards(playerHand);
    const sortedAiHands = initialAiHands.map(getSmartSortedHandForEight);
    setAiHands(sortedAiHands);
    setPlayerState('arranging');
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
    const result = calculateEightCardTrialResult(playerHand, aiHands);
    const modalPlayers = [
      { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
    ];
    setGameResult({ players: modalPlayers });
    setPlayerState('submitted');
  };

  return (
    <GameTable
      gameType="eight"
      title="急速八张 - 试玩模式"
      players={players}
      user={user}

      topLane={arrangement.topLane}
      middleLane={arrangement.middleLane}
      bottomLane={arrangement.bottomLane}
      unassignedCards={arrangement.unassignedCards}
      selectedCards={arrangement.selectedCards}
      LANE_LIMITS={arrangement.LANE_LIMITS}

      playerState={playerState}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}

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

export default EightCardGame;