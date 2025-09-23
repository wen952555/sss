import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHand } from '../utils/autoSorter.js';
import GameTable from './GameTable';
import { isSssFoul, calculateSinglePairScore, getSpecialType, compareSssArea } from '../utils/scorer.js';
import { parseCard } from '../utils/pokerEvaluator.js';
import { sanitizeHand } from '../utils/cardUtils.js';

const ThirteenGame = ({ onBackToLobby, user, roomId, gameType, playerCount }) => {
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

  const [playerState, setPlayerState] = useState('waiting');
  const [sortStrategy, setSortStrategy] = useState('bottom');
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  const handleHandData = useCallback((handData) => {
    if (Array.isArray(handData)) {
      // This path is for when the server deals a fresh hand as a flat array.
      const cardObjects = handData.map(c => (typeof c === 'string' ? parseCard(c) : c)).filter(Boolean);
      const sortedHand = getSmartSortedHand(cardObjects, 'bottom');
      if (sortedHand) {
        setInitialLanes(sortedHand);
      }
    } else {
      // This path is for when the server sends a pre-arranged hand object.
      // We sanitize it to ensure it's safe to use.
      setInitialLanes(sanitizeHand(handData));
    }
  }, [setInitialLanes]);

  const handleConfirm = useCallback((hand = null) => {
    let handToSend;
    if (hand && hand.top && hand.top.length > 0 && hand.top[0].rank) {
      handToSend = {
        top: hand.top.map(c => `${c.rank}_of_${c.suit}`),
        middle: hand.middle.map(c => `${c.rank}_of_${c.suit}`),
        bottom: hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
      };
    } else {
      handToSend = {
        top: topLane.map(c => c.key),
        middle: middleLane.map(c => c.key),
        bottom: bottomLane.map(c => c.key),
      };
    }

    if (isSssFoul(handToSend.top, handToSend.middle, handToSend.bottom)) {
      setErrorMessage('你的牌组不符合规则（倒水）');
      return;
    }

    if (ws) {
      ws.send(JSON.stringify({
        type: 'submit_hand',
        payload: { userId: user.id, roomId, hand: handToSend }
      }));
    }
  }, [ws, roomId, user, topLane, middleLane, bottomLane]);

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
      setTimeLeft(100);
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

  const [ws, setWs] = useState(null);

  // This useEffect hook manages the WebSocket connection.
  useEffect(() => {
    // Do not connect if we don't have a user or room
    if (!user || !roomId) return;

    // Create a new WebSocket connection to the server
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log('WebSocket connection established.');
      setIsOnline(true);
      // Register the client with the server for this specific room
      socket.send(JSON.stringify({ type: 'register', userId: user.id, roomId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received data from server:', data);

      // The server will send different types of messages.
      // We'll handle a 'gameStateUpdate' message here.
      if (data.type === 'gameStateUpdate') {
        const { players, gameStatus, hand, result } = data.payload;

        setPlayers(players || []);
        setPlayerState(gameStatus || 'waiting');

        if ((gameStatus === 'playing' || gameStatus === 'arranging' || gameStatus === 'submitted') && hand) {
          handleHandData(hand);
        }

        if (gameStatus === 'finished' && result) {
          const resultPlayers = result.players.map(p => ({
            ...p,
            hand: sanitizeHand(p.hand),
          }));

          // The scoring logic can be moved to the server, but for now we'll keep it here
          // to demonstrate the data flow.
          setGameResult({ players: resultPlayers });
        }
      } else if (data.type === 'error') {
        setErrorMessage(data.message);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed.');
      setIsOnline(false);
      setErrorMessage('与服务器断开连接');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setErrorMessage('WebSocket 连接出现错误');
    };

    setWs(socket);

    // Cleanup function: close the socket when the component unmounts
    return () => {
      socket.close();
    };
  }, [roomId, user]); // Re-run this effect if roomId or user changes

  // The old fetchGameStatus function is now obsolete and replaced by WebSocket messages.
  // We can comment it out or remove it. For now, it's removed to keep the code clean.

  useEffect(() => {
    if (gameResult && gameResult.players) {
      const playerIds = gameResult.players.map(p => p.id).sort((a, b) => a - b);
      if (user.id === playerIds[0]) {
        const scores = gameResult.players.reduce((acc, p) => ({ ...acc, [p.id]: p.score }), {});
        fetch('/api/index.php?action=save_scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, scores }),
        });
      }
    }
  }, [gameResult, roomId, user.id]);

  const handleLeaveRoom = useCallback(() => {
    if (!user || !roomId) {
      onBackToLobby();
      return;
    }
    fetch('/api/index.php?action=leave_room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, roomId }),
    })
    .then(() => {
      onBackToLobby();
    });
  }, [user, roomId, onBackToLobby]);

  const handleReady = useCallback(async () => {
    if (!ws || !user || !roomId) return;
    const me = players.find(p => p.id === user.id);
    const currentIsReady = me ? me.is_ready : false;
    const action = currentIsReady ? 'unready' : 'ready';

    ws.send(JSON.stringify({
      type: 'player_action',
      payload: { userId: user.id, roomId, action }
    }));
  }, [ws, user, roomId, players]);

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
      gameType={gameType}
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
      onReady={handleReady}
      onConfirm={() => handleConfirm()}
      onAutoSort={handleAutoSort}
      onCardClick={handleCardClick}
      onLaneClick={handleLaneClick}
      onCloseResult={() => setGameResult(null)}
      onPlayAgain={handleLeaveRoom}
    />
  );
};

export default ThirteenGame;