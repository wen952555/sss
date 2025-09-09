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

  const fetchGameStatus = useCallback(async () => {
    if (!roomId || !user) return;
    try {
      const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        setPlayerState(data.gameStatus);
        if (data.gameStatus === 'playing' && data.hand) {
          setInitialLanes(data.hand);
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

  const handleConfirm = useCallback(() => {
    // In an online game, this would send the player's hand arrangement to the server
    console.log('Player confirmed hand. Room ID:', roomId);
    // Logic to send hand to server would go here
  }, [roomId, topLane, middleLane, bottomLane]);

  const handleAutoSort = useCallback(() => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 13) return;

    const sortedHand = getSmartSortedHand(allCards, sortStrategy);
    if (sortedHand) {
      setInitialLanes(sortedHand.top, sortedHand.middle, sortedHand.bottom);
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
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}
      isReady={isReady}

      onBackToLobby={onBackToLobby}
      onReady={() => handleReady(isReady)}
      onConfirm={handleConfirm}
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