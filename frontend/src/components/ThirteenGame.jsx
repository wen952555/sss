import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import GameTable from './GameTable';
import AutoPlayModal from './AutoPlayModal';
import { getSmartSortedHand } from '../utils/autoSorter.js';

const ThirteenGame = ({ onBackToLobby, user, roomId, gameMode }) => {
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
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAutoPlayModal, setShowAutoPlayModal] = useState(false);
  const [autoPlay, setAutoPlay] = useState({ active: false, rounds: 0 });

  const handleStartAutoPlay = (rounds) => {
    setAutoPlay({ active: true, rounds });
    setShowAutoPlayModal(false);
  };

  const fetchGameStatus = useCallback(async () => {
    // This is a placeholder for fetching status in a real app.
    if (players.length === 0) {
        setPlayers([{ id: user.id, phone: user.phone, is_ready: 0 }]);
    }
  }, [roomId, user.id, players]);

  useEffect(() => {
    const pollInterval = setInterval(fetchGameStatus, 2000);
    return () => clearInterval(pollInterval);
  }, [fetchGameStatus]);

  const handlePlayerAction = async (action, hand = null) => {
    console.log(`Simulating action: ${action}`);
    // This is a placeholder for making API calls.
    // We will simulate the effects on the local state for now.
    if (action === 'ready') {
      const newPlayers = players.map(p => p.id === user.id ? { ...p, is_ready: 1 } : p);
      setPlayers(newPlayers);
    }
    if (action === 'unready') {
      const newPlayers = players.map(p => p.id === user.id ? { ...p, is_ready: 0 } : p);
      setPlayers(newPlayers);
    }
    return { success: true };
  };

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    setPlayerState('waiting');
    setInitialLanes({ top: [], middle: [], bottom: [] });
    handlePlayerAction('unready');
  }, [setInitialLanes]);

  // Effect for handling auto-play actions during the arranging phase
  useEffect(() => {
    if (autoPlay.active && playerState === 'arranging') {
      const timer = setTimeout(() => {
        const allCards = [...topLane, ...middleLane, ...bottomLane];
        const sortedHand = getSmartSortedHand(allCards);
        if (sortedHand) {
          handlePlayerAction('submit_hand', sortedHand);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [playerState, autoPlay.active, topLane, middleLane, bottomLane]);

  // Effect for handling auto-play actions when a game ends
  useEffect(() => {
    if (autoPlay.active && gameResult) {
      const newRounds = autoPlay.rounds - 1;
      if (newRounds >= 0) {
        setAutoPlay(prev => ({ ...prev, rounds: newRounds }));
        const timer = setTimeout(handlePlayAgain, 3000);
        return () => clearTimeout(timer);
      } else {
        setAutoPlay({ active: false, rounds: 0 });
      }
    }
  }, [gameResult, autoPlay.active, handlePlayAgain]);

  // Effect to automatically ready up when auto-play is active
  useEffect(() => {
    const me = players.find(p => p.id === user.id);
    if (autoPlay.active && playerState === 'waiting' && me && !me.is_ready) {
        const timer = setTimeout(() => handlePlayerAction('ready'), 1000);
        return () => clearTimeout(timer);
    }
  }, [playerState, players, user.id, autoPlay.active]);

  const handleReady = () => {
    const me = players.find(p => p.id === user.id);
    const isReady = me && me.is_ready;
    handlePlayerAction(isReady ? 'unready' : 'ready');
  };

  const handleConfirm = () => {
    const hand = { top: topLane, middle: middleLane, bottom: bottomLane };
    handlePlayerAction('submit_hand', hand);
  };

  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    const sortedHand = getSmartSortedHand(allCards);
    if (sortedHand) {
      setInitialLanes(sortedHand);
    }
  };

  return (
    <>
      {showAutoPlayModal && (
        <AutoPlayModal
          onSelect={handleStartAutoPlay}
          onCancel={() => setShowAutoPlayModal(false)}
        />
      )}
      <GameTable
        gameType="thirteen"
        title="经典十三张"
        players={players}
        user={user}
        autoPlayRounds={autoPlay.rounds}
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
        onAutoPlay={() => setShowAutoPlayModal(true)}
        onCardClick={handleCardClick}
        onLaneClick={handleLaneClick}
        onCloseResult={() => setGameResult(null)}
        onPlayAgain={handlePlayAgain}
      />
    </>
  );
};

export default ThirteenGame;