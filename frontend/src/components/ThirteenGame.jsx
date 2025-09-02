import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHand, parseCard, isFoul } from '../utils';
import GameTable from './GameTable';

const ThirteenGame = ({
  onBackToLobby,
  user,
  roomId,
  players,
  status,
  hand,
  result,
  onGameEnd,
}) => {
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

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect to set the initial hand when it arrives from the server
  useEffect(() => {
    if (hand) {
      setInitialLanes(hand);
    }
  }, [hand, setInitialLanes]);

  const handlePlayerAction = async (action, details = {}) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action, ...details }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || '操作失败');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReady = () => handlePlayerAction('ready');

  const handleConfirm = () => {
    const currentHand = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
    };
    if (isFoul(currentHand.top, currentHand.middle, currentHand.bottom)) {
      setErrorMessage('您的牌型是倒水，请重新摆放！');
      return;
    }
    handlePlayerAction('submit_hand', { hand: currentHand });
  };

  const handleAutoSort = useCallback(() => {
    if (!hand) return;
    const allCards = [...hand.top, ...hand.middle, ...hand.bottom];
    const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));
    const sorted = getSmartSortedHand(cardObjects);
    if (sorted) {
      setInitialLanes(sorted);
    } else {
      setErrorMessage('无法找到有效的牌型组合。');
    }
  }, [hand, setInitialLanes]);

  return (
    <GameTable
      gameType="thirteen"
      players={players}
      user={user}
      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={[]}
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}
      playerState={status}
      isLoading={isLoading}
      gameResult={result}
      errorMessage={errorMessage}
      onBackToLobby={onBackToLobby}
      onReady={handleReady}
      onConfirm={handleConfirm}
      onAutoSort={handleAutoSort}
      onCardClick={handleCardClick}
      onLaneClick={handleLaneClick}
      onCloseResult={onBackToLobby} // Go back to lobby after closing result
      onPlayAgain={onBackToLobby} // Go back to lobby to find a new game
    />
  );
};

export default ThirteenGame;