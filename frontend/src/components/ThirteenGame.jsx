import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import GameTable from './GameTable';
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

  const fetchGameStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players || []);
        const me = data.players.find(p => p.id === user.id);
        if (data.gameStatus === 'playing' && me && me.initial_hand) {
          setInitialLanes(me.initial_hand);
          setPlayerState('arranging');
        }
        if (data.gameStatus === 'finished') {
          setGameResult(data.result);
          setPlayerState('finished');
        }
      }
    } catch (error) {
      console.error('Failed to fetch game status:', error);
    }
  }, [roomId, user.id, setInitialLanes]);

  useEffect(() => {
    const pollInterval = setInterval(fetchGameStatus, 2000);
    return () => clearInterval(pollInterval);
  }, [fetchGameStatus]);

  const handlePlayerAction = async (action, hand = null) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        action,
        userId: user.id,
        roomId,
      };
      if (hand) {
        payload.hand = hand;
      }
      const response = await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) {
        setErrorMessage(data.message || '操作失败');
      } else {
        // Optimistically update UI for some actions
        if (action === 'ready' || action === 'unready') {
            const me = players.find(p => p.id === user.id);
            if(me) me.is_ready = (action === 'ready' ? 1 : 0);
        }
        if (action === 'submit_hand') {
          setPlayerState('submitted');
        }
        // Fetch latest status immediately
        fetchGameStatus();
      }
    } catch (error) {
      setErrorMessage('无法连接到服务器');
    } finally {
      setIsLoading(false);
    }
  };

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
      onPlayAgain={() => {
        setGameResult(null);
        setPlayerState('waiting');
        handlePlayerAction('unready');
      }}
    />
  );
};

export default ThirteenGame;