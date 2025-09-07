import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
// All offline utility imports are removed as they are no longer needed
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
  } = useCardArrangement('thirteen');

  // Most state is removed, what remains will be driven by server events
  const [playerState, setPlayerState] = useState('waiting'); // e.g., 'waiting', 'arranging', 'submitted'
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to set the initial player list (will be updated by server messages)
  useEffect(() => {
    // In a real online game, you'd fetch the player list for the room `roomId`
    // For now, we just show the current user.
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }]);
  }, [user, roomId]);

  // Offline game logic (handleReady, handleAutoSort, handleConfirm) is removed.
  // These actions will now be handled by sending messages to the server.

  const handleReady = useCallback(() => {
    // In an online game, this would send a "ready" message to the server
    console.log('Player is ready. Room ID:', roomId);
    // Logic to update player state via server would go here
  }, [roomId]);

  const handleConfirm = useCallback(() => {
    // In an online game, this would send the player's hand arrangement to the server
    console.log('Player confirmed hand. Room ID:', roomId);
    // Logic to send hand to server would go here
  }, [roomId, topLane, middleLane, bottomLane]);

  const handleAutoSort = useCallback(() => {
    // This could either be a client-side utility or a request to the server
    console.log('Auto-sort requested.');
    // For now, it does nothing. A client-side implementation could be kept.
  }, []);

  return (
    <GameTable
      gameType="thirteen"
      // Title is now generic for online play
      title="经典十三张"
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

      onBackToLobby={onBackToLobby}
      // The buttons now have placeholder functionality
      onReady={handleReady}
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