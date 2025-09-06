import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import GameTable from './GameTable';

// The component now only accepts props relevant for an online game
const EightCardGame = ({ onBackToLobby, user, roomId, gameMode }) => {
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

  // Most state is removed, what remains will be driven by server events
  const [playerState, setPlayerState] = useState('waiting');
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to set the initial player list (will be updated by server messages)
  useEffect(() => {
    // In a real online game, you'd fetch the player list for the room `roomId`
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }]);
  }, [user, roomId]);

  // Offline game logic is removed.
  const handleReady = useCallback(() => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    if (newReadyState) {
      console.log('Player is ready. Room ID:', roomId);
      // Here you would send a "ready" message to the server
    } else {
      console.log('Player cancelled ready. Room ID:', roomId);
      // Here you would send an "unready" message to the server
    }
  }, [isReady, roomId]);

  const handleConfirm = useCallback(() => {
    console.log('Player confirmed hand. Room ID:', roomId);
  }, [roomId]);

  const handleAutoSort = useCallback(() => {
    console.log('Auto-sort requested.');
  }, []);

  return (
    <GameTable
      gameType="eight"
      title="急速八张"
      players={players}
      user={user}

      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={[]}
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}

      playerState={playerState}
      isReady={isReady}
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
      onPlayAgain={() => console.log('Play again')}
    />
  );
};

export default EightCardGame;