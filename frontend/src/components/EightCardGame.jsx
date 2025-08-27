import React, { useState, useEffect } from 'react';
import './EightCardGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineEightCardGame, getSmartSortedHandForEight, calculateEightCardTrialResult } from '../utils';
import GameTable from './GameTable';

const EightCardGame = ({ onBackToLobby, user }) => {
  const {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
  } = useCardArrangement('eight');

  const [allPlayerCards, setAllPlayerCards] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [playerState, setPlayerState] = useState('waiting');
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
    const sortedPlayerHand = getSmartSortedHandForEight(playerHand);
    setInitialLanes(sortedPlayerHand);
    setAllPlayerCards(playerHand);

    const sortedAiHands = initialAiHands.map(getSmartSortedHandForEight);
    setAiHands(sortedAiHands);
    setPlayerState('arranging');
    setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
  };

  const handleAutoSort = () => {
    setIsLoading(true);
    setErrorMessage('智能理牌中，请稍候...'); // Set a message

    // Use setTimeout to allow the UI to update before the heavy calculation
    setTimeout(() => {
      try {
        const sorted = getSmartSortedHandForEight(allPlayerCards);
        if (sorted) {
          setInitialLanes(sorted);
          setErrorMessage(''); // Clear message on success
        } else {
          setErrorMessage('无法找到有效的牌型组合。');
        }
      } catch (e) {
        setErrorMessage(`理牌时发生错误: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 10); // 10ms delay is enough for the UI to repaint
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

export default EightCardGame;