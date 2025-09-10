import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHand } from '../utils/autoSorter.js';
import GameTable from './GameTable';

// The component now only accepts props relevant for an online game
const ThirteenGame = ({ onBackToLobby, user, roomId, gameMode, playerCount }) => {
  const {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
  } = useCardArrangement();

  const [playerState, setPlayerState] = useState('waiting'); // e.g., 'waiting', 'arranging', 'submitted'
  const [sortStrategy, setSortStrategy] = useState('bottom'); // 'bottom', 'middle', 'top'
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  const handleConfirm = useCallback((hand = null) => {
    let handToSend;
    if (hand && hand.top && hand.top.length > 0 && hand.top[0].rank) {
      // Hand is from auto-sorter, format { top: [cardObj], ... }
      handToSend = {
        top: hand.top.map(c => `${c.rank}_of_${c.suit}`),
        middle: hand.middle.map(c => `${c.rank}_of_${c.suit}`),
        bottom: hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
      };
    } else {
      // Hand is from user arrangement in the state
      handToSend = {
        top: topLane.map(c => c.key),
        middle: middleLane.map(c => c.key),
        bottom: bottomLane.map(c => c.key),
      };
    }

    setIsLoading(true);
    fetch('/api/index.php?action=player_action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        roomId,
        action: 'submit_hand',
        hand: handToSend,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit hand.');
      }
      // The game state will be updated by the polling mechanism
      console.log('Hand submitted successfully.');
    })
    .catch(error => {
      setErrorMessage(error.message);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [roomId, user, topLane, middleLane, bottomLane]);

  const handleAutoConfirm = useCallback(() => {
    const allCardKeys = [...topLane, ...middleLane, ...bottomLane].map(c => c.key);
    if (allCardKeys.length !== 13) return;

    const sortedHand = getSmartSortedHand(allCardKeys, 'bottom');
    if (sortedHand) {
      handleConfirm(sortedHand);
    }
  }, [topLane, middleLane, bottomLane, handleConfirm]);

  useEffect(() => {
    if (playerState === 'arranging') {
      setTimeLeft(90);
    } else {
      setTimeLeft(null);
    }
  }, [playerState]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) {
      handleAutoConfirm();
      setTimeLeft(null);
      return;
    }
    const intervalId = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, handleAutoConfirm]);

  const fetchGameStatus = useCallback(async () => {
    if (!roomId || !user) return;
    try {
      const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        if (!isOnline) {
          setIsOnline(true);
          setErrorMessage(''); // Clear connection error on success
        }
        setPlayers(data.players);
        setPlayerState(data.gameStatus);
        if (data.gameStatus === 'playing' && data.hand) {
          setInitialLanes(data.hand);
        }
        if (data.gameStatus === 'finished' && data.result) {
          setGameResult(data.result);
        }
      } else {
        // Handle backend-specific errors if necessary
        setErrorMessage(data.message || '获取游戏状态失败');
      }
    } catch (error) {
      if (isOnline) {
        setIsOnline(false);
        setErrorMessage("网络连接已断开，正在尝试重新连接...");
      }
      console.error("Failed to fetch game status:", error);
    }
  }, [roomId, user, setInitialLanes, isOnline]);

  useEffect(() => {
    fetchGameStatus();
    const intervalId = setInterval(fetchGameStatus, 1000);
    return () => clearInterval(intervalId);
  }, [fetchGameStatus]);

  const handleLeaveRoom = useCallback(() => {
    if (!user || !roomId) {
      onBackToLobby();
      return;
    }
    // Send a request to the backend to leave the room
    fetch('/api/index.php?action=leave_room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, roomId }),
    })
    .then(() => {
      // Regardless of success or failure, navigate back to lobby
      onBackToLobby();
    });
  }, [user, roomId, onBackToLobby]);

  const handleReady = useCallback(async (isReady) => {
    if (!user || !roomId) return;
    const action = isReady ? 'unready' : 'ready';
    setIsLoading(true);
    try {
      const response = await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || `Failed to ${action}.`);
      }
      // If the 'ready' action caused cards to be dealt, the hand will be in the response.
      if (data.cardsDealt && data.hand) {
        setInitialLanes(data.hand);
      }
      // We still call this to get the latest state for all players
      fetchGameStatus();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, roomId, fetchGameStatus]);

  const handleAutoSort = useCallback(() => {
    const allCardKeys = [...topLane, ...middleLane, ...bottomLane].map(c => c.key);
    if (allCardKeys.length !== 13) return;

    const sortedHand = getSmartSortedHand(allCardKeys, sortStrategy);
    if (sortedHand) {
      const handForState = {
          top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`),
          middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`),
          bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`),
      }
      setInitialLanes(handForState);
    }

    setSortStrategy(prev => {
      if (prev === 'bottom') return 'middle';
      if (prev === 'middle') return 'top';
      return 'bottom';
    });
  }, [topLane, middleLane, bottomLane, sortStrategy, setInitialLanes]);

  const me = players.find(p => p.id === user.id);
  const isReady = me ? me.is_ready : false;
  const isGameInProgress = playerState === 'arranging' || playerState === 'submitted';

  return (
    <GameTable
      gameType="thirteen"
      title={`玩家: ${players.length} / ${playerCount || 4}`}
      players={players}
      user={user}
      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={[]}
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}
      playerState={playerState}
      timeLeft={timeLeft}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}
      isReady={isReady}
      isGameInProgress={isGameInProgress}
      isOnline={isOnline}
      onBackToLobby={handleLeaveRoom}
      onReady={() => handleReady(isReady)}
      onConfirm={() => handleConfirm()}
      onAutoSort={handleAutoSort}
      onCardClick={handleCardClick}
      onLaneClick={handleLaneClick}
      onCloseResult={() => setGameResult(null)}
      onPlayAgain={() => console.log('Play again')}
    />
  );
};

export default ThirteenGame;