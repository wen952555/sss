import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHand } from '../utils/autoSorter.js';
import GameTable from './GameTable';
import { isSssFoul, calculateSinglePairScore, getSpecialType, compareSssArea } from '../utils/scorer.js';
import { parseCard } from '../utils/pokerEvaluator.js';

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
      const cardObjects = handData.map(c => (typeof c === 'string' ? parseCard(c) : c));
      const sortedHand = getSmartSortedHand(cardObjects, 'bottom');
      if (sortedHand) {
        setInitialLanes(sortedHand);
      }
    } else {
      setInitialLanes(handData);
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

  const fetchGameStatus = useCallback(async () => {
    if (!roomId || !user) return;
    try {
      const url = `/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`;
      console.log('Fetching game status:', url);
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        if (!isOnline) {
          setIsOnline(true);
          setErrorMessage('');
        }
        setPlayers(data.players);
        setPlayerState(data.gameStatus);
        if ((data.gameStatus === 'playing' || data.gameStatus === 'arranging' || data.gameStatus === 'submitted') && data.hand) {
          handleHandData(data.hand);
        }
        if (data.gameStatus === 'finished' && data.result) {
          const { players: resultPlayers } = data.result;
          const playerHands = resultPlayers.reduce((acc, p) => {
            acc[p.id] = p.hand;
            return acc;
          }, {});

          const playerIds = resultPlayers.map(p => p.id);
          const scores = playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

          for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
              const p1_id = playerIds[i];
              const p2_id = playerIds[j];
              const p1_hand = playerHands[p1_id];
              const p2_hand = playerHands[p2_id];
              const pair_score = calculateSinglePairScore(p1_hand, p2_hand);
              scores[p1_id] += pair_score;
              scores[p2_id] -= pair_score;
            }
          }

          const pointMultiplier = gameType === 'thirteen' ? 2 : (gameType === 'thirteen-5' ? 5 : 1);
          resultPlayers.forEach(p => {
            p.score = scores[p.id] * pointMultiplier;
          });

          const humanPlayer = resultPlayers.find(p => p.id === user.id);
          if (humanPlayer) {
            const humanPlayerHand = humanPlayer.hand;
            resultPlayers.forEach(player => {
              if (player.id === user.id) {
                player.laneResults = ['draw', 'draw', 'draw'];
              } else {
                player.laneResults = ['top', 'middle', 'bottom'].map(area => {
                  const cmp = compareSssArea(player.hand[area], humanPlayerHand[area], area);
                  if (cmp > 0) return 'win';
                  if (cmp < 0) return 'loss';
                  return 'draw';
                });
              }
            });
          }

          setGameResult({ players: resultPlayers });
        }
      } else {
        setErrorMessage(data.message || '获取游戏状态失败');
      }
    } catch (error) {
      if (isOnline) {
        setIsOnline(false);
        setErrorMessage("网络连接已断开，正在尝试重新连接...");
      }
      console.error("Failed to fetch game status:", error);
    }
  }, [roomId, user, setInitialLanes, isOnline, gameType]);

  useEffect(() => {
    fetchGameStatus();
    const intervalId = setInterval(fetchGameStatus, 1000);
    return () => clearInterval(intervalId);
  }, [fetchGameStatus]);

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
    if (!user || !roomId) return;
    const me = players.find(p => p.id === user.id);
    const currentIsReady = me ? me.is_ready : false;
    const action = currentIsReady ? 'unready' : 'ready';

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
      if (data.cardsDealt && data.hand) {
        handleHandData(data.hand);
      }
      fetchGameStatus();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, roomId, players, fetchGameStatus, setInitialLanes]);

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