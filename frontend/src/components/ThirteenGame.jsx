import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHand } from '../utils/autoSorter.js';
import GameTable from './GameTable';

// The component now only accepts props relevant for an online game
const ThirteenGame = ({ onBackToLobby, user, roomId, gameMode }) => {
  const {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    // `setInitialLanes` might be repurposed for when the server sends the hand
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
  } = useCardArrangement();

  // Most state is removed, what remains will be driven by server events
  const [playerState, setPlayerState] = useState('waiting'); // e.g., 'waiting', 'arranging', 'submitted'
  const [sortStrategy, setSortStrategy] = useState('bottom'); // 'bottom', 'middle', 'top'
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

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

    // Use the default 'bottom' strategy for auto-confirmation
    const sortedHand = getSmartSortedHand(allCardKeys, 'bottom');
    if (sortedHand) {
      // Directly call handleConfirm with the sorted hand
      handleConfirm(sortedHand);
    }
  }, [topLane, middleLane, bottomLane, handleConfirm]);

  // This effect starts the timer when the player should be arranging their hand
  useEffect(() => {
    if (playerState === 'arranging') {
      setTimeLeft(90);
    } else {
      setTimeLeft(null); // Clear timer if not in arranging phase
    }
  }, [playerState]);

  // This effect handles the countdown and triggers auto-confirmation
  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft === 0) {
      console.log("Time's up! Auto-confirming hand.");
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
        setPlayers(data.players);
        setPlayerState(data.gameStatus);
        if (data.gameStatus === 'playing' && data.hand) {
          setInitialLanes(data.hand.top, data.hand.middle, data.hand.bottom);
        }
        if (data.gameStatus === 'finished' && data.result) {
          setGameResult(data.result);
        }
      }
    } catch (error) {
      console.error("Failed to fetch game status:", error);
      setErrorMessage("无法获取游戏状态");
    }
  }, [roomId, user, setInitialLanes]);

  useEffect(() => {
    fetchGameStatus(); // Initial fetch
    const intervalId = setInterval(fetchGameStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(intervalId);
  }, [fetchGameStatus]);

  // Offline game logic (handleReady, handleAutoSort, handleConfirm) is removed.
  // These actions will now be handled by sending messages to the server.

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
      fetchGameStatus(); // Immediately fetch status after action
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, roomId]);

  const handleAutoSort = useCallback(() => {
    const allCardKeys = [...topLane, ...middleLane, ...bottomLane].map(c => c.key);
    if (allCardKeys.length !== 13) return;

    const sortedHand = getSmartSortedHand(allCardKeys, sortStrategy);
    if (sortedHand) {
      // The auto-sorter returns card objects, but setInitialLanes expects card strings
      // We need to convert them back.
      const handForState = {
          top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`),
          middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`),
          bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`),
      }
      setInitialLanes(handForState.top, handForState.middle, handForState.bottom);
    }

    // Cycle through strategies
    setSortStrategy(prev => {
      if (prev === 'bottom') return 'middle';
      if (prev === 'middle') return 'top';
      return 'bottom';
    });
  }, [topLane, middleLane, bottomLane, sortStrategy, setInitialLanes]);

  const me = players.find(p => p.id === user.id);
  const isReady = me ? me.is_ready : false;

  return (
    <GameTable
      gameType="thirteen"
      title={`玩家: ${players.length} / 8`}
      players={players}
      user={user}

      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={[]} // This will be populated by server data
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}

      playerState={playerState}
      timeLeft={timeLeft}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}
      isReady={isReady}

      onBackToLobby={onBackToLobby}
      onReady={() => handleReady(isReady)}
      onConfirm={() => handleConfirm()}
      onAutoSort={handleAutoSort}
      onCardClick={handleCardClick}
      onLaneClick={handleLaneClick}
      onCloseResult={() => setGameResult(null)}
      // Play again would likely be handled by server state change
      onPlayAgain={() => console.log('Play again')}
    />
  );
};

export default ThirteenGame;