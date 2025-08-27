import React, { useState, useEffect, useCallback } from 'react';
import './EightCardGame.css';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { dealOfflineEightCardGame, getSmartSortedHandForEight, calculateEightCardTrialResult, parseCard } from '../utils';
import GameTable from './GameTable';

const EightCardGame = ({ onBackToLobby, user }) => {
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

  const [allPlayerCards, setAllPlayerCards] = useState([]);
  const [aiHands, setAiHands] = useState([]);
  const [playerState, setPlayerState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const aiPlayerInfo = Array(5).fill(0).map((_, i) => ({ id: `ai_${i}`, phone: `AI ${i+1}`, is_ready: false }));
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }, ...aiPlayerInfo]);
  }, [user]);

  const handleReady = useCallback(() => {
    try {
      setErrorMessage('');
      const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);
      setAllPlayerCards(playerHand); // Keep original hand for sorting

      // Put all 8 of the player's cards into the middle lane initially
      const playerCardObjects = playerHand.map(c => typeof c === 'string' ? parseCard(c) : c);
      const initialHand = {
        top: [],
        middle: playerCardObjects,
        bottom: []
      };
      setInitialLanes(initialHand);

      // Sort AI hands
      const sortedAiHands = initialAiHands.map(getSmartSortedHandForEight);
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
    setIsLoading(true);
    setErrorMessage('智能理牌中，请稍候...'); // Set a message

    // Use setTimeout to allow the UI to update before the heavy calculation
    setTimeout(() => {
      try {
        const sorted = getSmartSortedHandForEight(allPlayerCards);
        if (sorted) {
          setInitialLanes(sorted);
          setErrorMessage(''); // Clear message on success
        } else {
          setErrorMessage('无法找到有效的牌型组合。');
        }
      } catch (e) {
        setErrorMessage(`理牌时发生错误: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 10); // 10ms delay is enough for the UI to repaint
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
        const playerHand = {
          top: topLane,
          middle: middleLane,
          bottom: bottomLane
        };
        const result = calculateEightCardTrialResult(playerHand, aiHands);
        const modalPlayers = [
          { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
          ...aiHands.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
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
      gameType="eight"
      title="急速八张 - 试玩模式"
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
    />
  );
};

export default EightCardGame;