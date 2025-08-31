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
  const [aiRawHands, setAiRawHands] = useState([]); // Store the dealt AI cards
  const [aiHands, setAiHands] = useState([]); // Store the sorted AI hands (or null if sorting)
  const [playerState, setPlayerState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const aiPlayerInfo = Array(3).fill(0).map((_, i) => ({ id: `ai_${i}`, phone: `AI ${i+1}`, is_ready: false }));
    setPlayers([{ id: user.id, phone: user.phone, is_ready: false }, ...aiPlayerInfo]);
  }, [user]);

  // Effect to sort AI hands sequentially in the background after dealing
  useEffect(() => {
    if (aiRawHands.length > 0 && playerState === 'arranging') {
      setAiHands(new Array(aiRawHands.length).fill(null)); // Set AI hands to a loading state

      const sortAiHandSequentially = async () => {
        const sortedHands = [];
        for (const aiHand of aiRawHands) {
          // Wrap the calculation in a promise with a timeout to avoid blocking the main thread
          // and to allow UI to update between each AI's sort.
          const sortedHand = await new Promise(resolve => {
            setTimeout(() => {
              resolve(getAiThirteenHand(aiHand));
            }, 100); // A small delay to make the sequential update visible
          });
          sortedHands.push(sortedHand);
          // Update state after each AI is done to show progress
          setAiHands([...sortedHands, ...new Array(aiRawHands.length - sortedHands.length).fill(null)]);
        }
      };

      sortAiHandSequentially();
    }
  }, [aiRawHands, playerState]);

  const handleReady = useCallback(() => {
    try {
      setErrorMessage('');
      const { playerHand, aiHands: initialAiHands } = dealOfflineThirteenGame(4);

      // For the player, deal immediately
      setAllPlayerCards(playerHand);
      const playerCardObjects = playerHand.map(c => typeof c === 'string' ? parseCard(c) : c);
      const shuffledPlayerHand = [...playerCardObjects].sort(() => Math.random() - 0.5);
      const randomInitialHand = {
        top: shuffledPlayerHand.slice(0, 3),
        middle: shuffledPlayerHand.slice(3, 8),
        bottom: shuffledPlayerHand.slice(8, 13)
      };
      setInitialLanes(randomInitialHand);

      // Store the raw AI hands to be processed by the useEffect hook
      setAiRawHands(initialAiHands);

      setPlayerState('arranging');
      setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
    } catch (e) {
      console.error(e);
      setErrorMessage(`发生意外错误: ${e.message}`);
    }
  }, [setInitialLanes, setAllPlayerCards, setAiRawHands, setPlayerState, setPlayers, setErrorMessage]);

  const handleAutoSort = useCallback(() => {
    setIsLoading(true);

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
    if (aiHands.some(h => h === null)) {
      setErrorMessage('AI仍在理牌中，请稍候...');
      return;
    }

    setIsLoading(true);
    setErrorMessage('正在计算比牌结果...');

    setTimeout(() => {
      try {
        // Convert both player and AI hands to string format for the scorer
        const playerHandStrings = {
          top: topLane.map(c => `${c.rank}_of_${c.suit}`),
          middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
          bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
        };
        const aiHandStrings = aiHands.map(hand => ({
            top: hand.top.map(c => `${c.rank}_of_${c.suit}`),
            middle: hand.middle.map(c => `${c.rank}_of_${c.suit}`),
            bottom: hand.bottom.map(c => `${c.rank}_of_${c.suit}`),
        }));

        const result = calculateThirteenTrialResult(playerHandStrings, aiHandStrings);

        // For the modal display, we need the original card objects
        const playerHandObjects = { top: topLane, middle: middleLane, bottom: bottomLane };
        const modalPlayers = [
          { name: user.phone, hand: playerHandObjects, score: result.playerScore, is_me: true },
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