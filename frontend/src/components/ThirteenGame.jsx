import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult, getSmartSortedHand, parseCard } from '../utils';
import GameTable from './GameTable';

const ThirteenGame = ({ onBackToLobby, user }) => {
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

  const [allPlayerCards, setAllPlayerCards] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [playerState, setPlayerState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const aiPlayerInfo = Array(3).fill(0).map((_, i) => ({ id: `ai_${i}`, phone: `AI ${i+1}`, is_ready: false }));
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }, ...aiPlayerInfo]);
  }, [user]);

  const handleReady = useCallback(() => {
    try {
      setErrorMessage('');
      const { playerHand, aiHands: initialAiHands } = dealOfflineThirteenGame(4);
      setAllPlayerCards(playerHand); // Keep the original hand for sorting later

      // For the player, create a random initial arrangement by shuffling the cards
      const playerCardObjects = playerHand.map(c => typeof c === 'string' ? parseCard(c) : c);
      const shuffledPlayerHand = [...playerCardObjects].sort(() => Math.random() - 0.5);

      const randomInitialHand = {
        top: shuffledPlayerHand.slice(0, 3),
        middle: shuffledPlayerHand.slice(3, 8),
        bottom: shuffledPlayerHand.slice(8, 13)
      };
      setInitialLanes(randomInitialHand);

      // For the AIs, pre-sort their hands and convert to string format for the scorer
      const sortedAiHands = initialAiHands.map(hand => {
        const sortedHand = getAiThirteenHand(hand);
        if (!sortedHand) return null;
        return {
          top: sortedHand.top.map(c => `${c.rank}_of_${c.suit}`),
          middle: sortedHand.middle.map(c => `${c.rank}_of_${c.suit}`),
          bottom: sortedHand.bottom.map(c => `${c.rank}_of_${c.suit}`),
        };
      });

      if (sortedAiHands.some(h => !h)) {
        setErrorMessage('为AI玩家理牌时发生错误。');
        return;
      }
      setAiHands(sortedAiHands);

      setPlayerState('arranging');
      setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
    } catch (e) {
      console.error(e);
      setErrorMessage(`发生意外错误: ${e.message}`);
    }
  }, [setInitialLanes, setAllPlayerCards, setAiHands, setPlayerState, setPlayers, setErrorMessage]);

  const handleAutoSort = useCallback(() => {
    // This calculation is now very expensive, so loading state is crucial.
    setIsLoading(true);
    setErrorMessage('正在计算最优牌型...');

    setTimeout(() => {
      try {
        const sorted = getSmartSortedHand(allPlayerCards);
        if (sorted) {
          setInitialLanes(sorted);
          setErrorMessage('');
        } else {
          setErrorMessage('无法找到有效的牌型组合。');
        }
      } catch (e) {
        setErrorMessage(`理牌时发生错误: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 10);
  }, [allPlayerCards, setInitialLanes, setIsLoading, setErrorMessage]);

  const handleConfirm = useCallback(() => {
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('正在计算比牌结果...');

    setTimeout(() => {
      try {
        // Create a string version of the player's hand for the scorer
        const playerHandStrings = {
          top: topLane.map(c => `${c.rank}_of_${c.suit}`),
          middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
          bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
        };
        const result = calculateThirteenTrialResult(playerHandStrings, aiHands);

        // For the modal display, we need card objects
        const playerHandObjects = { top: topLane, middle: middleLane, bottom: bottomLane };
        const aiHandObjects = aiHands.map(hand => ({
          top: hand.top.map(parseCard),
          middle: hand.middle.map(parseCard),
          bottom: hand.bottom.map(parseCard),
        }));

        const modalPlayers = [
          { name: user.phone, hand: playerHandObjects, score: result.playerScore, is_me: true },
          ...aiHandObjects.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
        ];
        setGameResult({ players: modalPlayers });
        setPlayerState('submitted');
        setErrorMessage('');
      } catch (e) {
        setErrorMessage(`计算结果时发生错误: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 10);
  }, [topLane, middleLane, bottomLane, LANE_LIMITS, aiHands, user.phone, setIsLoading, setErrorMessage, setGameResult, setPlayerState]);

  return (
    <GameTable
      gameType="thirteen"
      title="十三张 - 试玩模式"
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
      onPlayAgain={handleReady}
    />
  );
};

export default ThirteenGame;