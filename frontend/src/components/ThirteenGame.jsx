import React, { useState, useEffect } from 'react';
import './ThirteenGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult, getSmartSortedHand } from '../utils';
import GameTable from './GameTable';

const ThirteenGame = ({ onBackToLobby, user }) => {
  const {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
  } = useCardArrangement('thirteen');

  const [allPlayerCards, setAllPlayerCards] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [playerState, setPlayerState] = useState('waiting');
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
    const sortedPlayerHand = getSmartSortedHand(playerHand);
    setInitialLanes(sortedPlayerHand);
    setAllPlayerCards(playerHand); // Keep track of the original 13 cards for auto-sort

    const sortedAiHands = initialAiHands.map(getAiThirteenHand);
    setAiHands(sortedAiHands);
    setPlayerState('arranging');
    setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
  };

  const handleAutoSort = () => {
    const sorted = getSmartSortedHand(allPlayerCards);
    setInitialLanes(sorted);
  };

  const handleConfirm = () => {
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }
    const playerHand = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
    };
    const result = calculateThirteenTrialResult(playerHand, aiHands);
    const modalPlayers = [
      { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
    ];
    setGameResult({ players: modalPlayers });
    setPlayerState('submitted');
  };

  return (
    <GameTable
      gameType="thirteen"
      title="十三张 - 试玩模式"
      players={players}
      user={user}

      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={[]}
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}

      playerState={playerState}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}

      onBackToLobby={onBackToLobby}
      onReady={handleReady}
      onConfirm={handleConfirm}
      onAutoSort={handleAutoSort}
      onCardClick={handleCardClick}
      onLaneClick={handleLaneClick}
      onCloseResult={() => setGameResult(null)}
    />
  );
};

export default ThirteenGame;