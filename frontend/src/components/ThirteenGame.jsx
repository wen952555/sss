import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult, getSmartSortedHand, parseCard, isFoul } from '../utils';
import GameTable from './GameTable';

const ThirteenGame = ({ onBackToLobby, user, roomId, gameMode, onGameEnd }) => {
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

  const [playerState, setPlayerState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Polling for game status in online mode
  useEffect(() => {
    if (!roomId) return;
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setPlayers(data.players || [{ id: user.id, phone: user.phone, is_ready: false }]);
          if (data.hand) {
            const handCards = [...data.hand.top, ...data.hand.middle, ...data.hand.bottom];
            setMyHand(handCards);
            setInitialLanes(data.hand); // Automatically place cards in lanes
          }
          // Could also set gameResult here if data.status is 'finished'
        }
      } catch (error) {
        console.error("Failed to fetch game status:", error);
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [roomId, user, setInitialLanes]);

  const handlePlayerAction = async (action, details = {}) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action, ...details }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || '操作失败');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReady = () => handlePlayerAction('ready');

  const handleConfirm = () => {
    const hand = { top: topLane.map(c=>`${c.rank}_of_${c.suit}`), middle: middleLane.map(c=>`${c.rank}_of_${c.suit}`), bottom: bottomLane.map(c=>`${c.rank}_of_${c.suit}`) };
    if (isFoul(hand.top, hand.middle, hand.bottom)) {
      setErrorMessage('您的牌型是倒水，请重新摆放！');
      return;
    }
    handlePlayerAction('submit_hand', { hand });
  };

  const handleAutoSort = useCallback(() => {
    if (!myHand) return;
    const sorted = getSmartSortedHand(myHand);
    if (sorted) {
      setInitialLanes(sorted);
    } else {
      setErrorMessage('无法找到有效的牌型组合。');
    }
  }, [myHand, setInitialLanes]);

  return (
    <GameTable
      gameType="thirteen"
      title="经典十三张"
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
      onPlayAgain={handleReady}
    />
  );
};

export default ThirteenGame;