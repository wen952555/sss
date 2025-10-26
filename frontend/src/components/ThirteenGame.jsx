import { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import GameTable from './GameTable';
import { isSssFoul, calculateSinglePairScore, compareSssArea } from '../utils/scorer.js';
import { parseCard } from '../utils/pokerEvaluator.js';
import { sanitizeHand } from '../utils/cardUtils.js';
import { findBestArrangement } from '../utils/trialModeUtils.js';

// eslint-disable-next-line react/prop-types
const ThirteenGame = ({ onBackToLobby, user, roomId, gameType, playerCount, isTrial = false }) => {
  const {
    topLane,
    middleLane,
    bottomLane,
    selectedCards,
    LANE_LIMITS,
    setInitialLanes,
    handleCardClick,
    handleLaneClick,
    resetLanes,
  } = useCardArrangement();

  const [playerState, setPlayerState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [sortedHandIndex, setSortedHandIndex] = useState(0);

  const [hasPlayerInteracted, setHasPlayerInteracted] = useState(false);

  const handleHandData = useCallback((handData) => {
    if (hasPlayerInteracted) return; // Ignore server updates after user interaction

    // The server now always sends a pre-arranged hand object.
    // We sanitize it to ensure it's safe to use.
    setInitialLanes(sanitizeHand(handData));
  }, [setInitialLanes, hasPlayerInteracted]);

  const resetComponentState = useCallback(() => {
    setPlayerState('waiting');
    setPlayers([]);
    setGameResult(null);
    setErrorMessage('');
    setIsLoading(false);
    setTimeLeft(null);
    setSortedHandIndex(0);
    setHasPlayerInteracted(false);
    resetLanes();
  }, [resetLanes]);

  // This effect will run when the user or room changes, resetting the component state.
  useEffect(() => {
    resetComponentState();
  }, [user, roomId, resetComponentState]);

  // Track user interaction
  useEffect(() => {
    if (topLane.length > 0 || middleLane.length > 0 || bottomLane.length > 0) {
      setHasPlayerInteracted(true);
    }
  }, [topLane, middleLane, bottomLane]);

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

    if (isSssFoul(handToSend)) {
      setErrorMessage('你的牌组不符合规则（倒水）');
      return;
    }

    if (isTrial) {
      const allCards = [...topLane, ...middleLane, ...bottomLane];
      const deck = ['hearts', 'diamonds', 'clubs', 'spades']
        .flatMap(suit => ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(rank => `${rank}_of_${suit}`))
        .filter(cardKey => !allCards.some(c => c.key === cardKey));
      deck.sort(() => Math.random() - 0.5);

      const aiHands = players
        .filter(p => p.is_auto_managed)
        .map((p, i) => {
          const hand = deck.slice(i * 13, (i + 1) * 13);
          const bestArrangement = findBestArrangement(hand);
          const mappedArrangement = {
            top: bestArrangement.front,
            middle: bestArrangement.middle,
            bottom: bestArrangement.back,
          };
          return { ...p, hand: mappedArrangement };
        });

      const resultPlayers = [
        { id: user.id, phone: user.phone, hand: handToSend, is_auto_managed: false },
        ...aiHands,
      ];

      const playerHands = resultPlayers.reduce((acc, p) => ({ ...acc, [p.id]: p.hand }), {});
      const playerIds = resultPlayers.map(p => p.id);
      const scores = playerIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

      try {
        for (let i = 0; i < playerIds.length; i++) {
          for (let j = i + 1; j < playerIds.length; j++) {
            const p1_id = playerIds[i];
            const p2_id = playerIds[j];
            const pair_score = calculateSinglePairScore(playerHands[p1_id], playerHands[p2_id]);
            scores[p1_id] += pair_score;
            scores[p2_id] -= pair_score;
          }
        }
      } catch (error) {
        setErrorMessage(error.message);
        return;
      }

      resultPlayers.forEach(p => { p.score = scores[p.id]; });
      setGameResult({ players: resultPlayers });
      setPlayerState('finished');
      return;
    }


    setIsLoading(true);
    fetch('/api/?action=player_action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // eslint-disable-next-line react/prop-types
        userId: user.id,
        roomId: roomId,
        action: 'submit_hand',
        hand: handToSend,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit hand.');
      }
      setPlayerState('submitted');
    })
    .catch(error => {
      setErrorMessage(error.message);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [roomId, user, topLane, middleLane, bottomLane, isTrial, players]);

  const handleAutoConfirm = useCallback(() => {
    const hand = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane,
    };
    handleConfirm(hand);
  }, [topLane, middleLane, bottomLane, handleConfirm]);

  useEffect(() => {
    if (isTrial) {
      // Setup local trial game
      const aiPlayers = [
        { id: 1, phone: 'AI 1', is_ready: true, is_auto_managed: true },
        { id: 2, phone: 'AI 2', is_ready: true, is_auto_managed: true },
        { id: 3, phone: 'AI 3', is_ready: true, is_auto_managed: true },
      ];
      setPlayers([
        { id: user.id, phone: user.phone, is_ready: true, is_auto_managed: false },
        ...aiPlayers,
      ]);
      setPlayerState('arranging');
      // Locally deal cards
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      const deck = suits.flatMap(suit => ranks.map(rank => `${rank}_of_${suit}`));
      deck.sort(() => Math.random() - 0.5);
      const playerHand = deck.slice(0, 13).map(key => ({ key, ...parseCard(key) }));
      setInitialLanes({
        top: playerHand.slice(0, 3),
        middle: playerHand.slice(3, 8),
        bottom: playerHand.slice(8, 13),
      });
    }
  }, [isTrial, user, setInitialLanes]);

  useEffect(() => {
    if (playerState === 'arranging' && !isTrial) {
      setTimeLeft(100);
    } else {
      setTimeLeft(null);
    }
  }, [playerState, isTrial]);

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
    if (isTrial || !roomId || !user) return;
    try {
      // eslint-disable-next-line react/prop-types
      const url = `/api/?action=game_status&roomId=${roomId}&userId=${user.id}`;
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
          const resultPlayers = data.result.players.map(p => ({
            ...p,
            hand: sanitizeHand(p.hand),
          }));

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
              const pair_score = calculateSinglePairScore(playerHands[p1_id], playerHands[p2_id]);
              scores[p1_id] += pair_score;
              scores[p2_id] -= pair_score;
            }
          }

          const pointMultiplier = gameType === 'thirteen' ? 2 : (gameType === 'thirteen-5' ? 5 : (gameType === 'thirteen-10' ? 10 : 1));
          resultPlayers.forEach(p => {
            p.score = scores[p.id] * pointMultiplier;
          });

          // eslint-disable-next-line react/prop-types
          const humanPlayer = resultPlayers.find(p => p.id === user.id);
          if (humanPlayer) {
            const humanPlayerHand = humanPlayer.hand;
            resultPlayers.forEach(player => {
              // eslint-disable-next-line react/prop-types
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
      }
      console.error("Failed to fetch game status:", error);
    }
  }, [roomId, user, isOnline, gameType, handleHandData, isTrial]);

  useEffect(() => {
    if (isTrial) return;
    fetchGameStatus();
    const intervalId = setInterval(fetchGameStatus, 1000);
    return () => clearInterval(intervalId);
  }, [fetchGameStatus, isTrial]);

  useEffect(() => {
    if (isTrial || !gameResult || !gameResult.players) return;
    const playerIds = gameResult.players.map(p => p.id).sort((a, b) => a - b);
    // eslint-disable-next-line react/prop-types
    if (user.id === playerIds[0]) {
      const scores = gameResult.players.reduce((acc, p) => ({ ...acc, [p.id]: p.score }), {});
      fetch('/api/?action=save_scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, scores }),
      });
    }
  }, [gameResult, roomId, user, isTrial]);

  const handleLeaveRoom = useCallback(() => {
    if (isTrial || !user || !roomId) {
      onBackToLobby();
      return;
    }
    fetch('/api/?action=leave_room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // eslint-disable-next-line react/prop-types
      body: JSON.stringify({ userId: user.id, roomId }),
    })
    .then(() => {
      onBackToLobby();
    });
  }, [user, roomId, onBackToLobby, isTrial]);

  const handleReady = useCallback(async () => {
    if (isTrial || !user || !roomId) return;
    // eslint-disable-next-line react/prop-types
    const me = players.find(p => p.id === user.id);
    const currentIsReady = me ? me.is_ready : false;
    const action = currentIsReady ? 'unready' : 'ready';

    setIsLoading(true);
    try {
      const response = await fetch('/api/?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // eslint-disable-next-line react/prop-types
          userId: user.id,
          roomId: roomId,
          action: action,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || `Failed to ${action}.`);
      }
      await fetchGameStatus();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, roomId, players, fetchGameStatus, isTrial]);

  const handleAutoSort = useCallback(async () => {
    if (isTrial) {
      const allCards = [...topLane, ...middleLane, ...bottomLane];
      const bestArrangement = findBestArrangement(allCards.map(c => c.key));
      const mappedArrangement = {
        top: bestArrangement.front,
        middle: bestArrangement.middle,
        bottom: bestArrangement.back,
      };
      setInitialLanes(sanitizeHand(mappedArrangement));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/?action=auto_sort_hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          roomId: roomId,
          index: sortedHandIndex,
        }),
      });
      const data = await response.json();
      if (data.success) {
        console.log("Raw API response:", data.hand);
        // By setting hasPlayerInteracted to false before updating the lanes,
        // we ensure the new hand from the server is always rendered.
        setHasPlayerInteracted(false);
        const mappedHand = {
          top: data.hand.front,
          middle: data.hand.middle,
          bottom: data.hand.back,
        };
        console.log("Mapped hand:", mappedHand);
        const sanitized = sanitizeHand(mappedHand);
        console.log("Sanitized hand:", sanitized);
        setInitialLanes(sanitized);
        // Cycle to the next index for the next click
        setSortedHandIndex((prevIndex) => (prevIndex + 1) % 5);
      } else {
        throw new Error(data.message || 'Failed to fetch pre-sorted hand.');
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user, sortedHandIndex, setInitialLanes, isTrial, topLane, middleLane, bottomLane]);

  // eslint-disable-next-line react/prop-types
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
