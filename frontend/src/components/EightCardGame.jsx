import React, { useState, useEffect, useCallback } from 'react';
import { useCardArrangement } from '../hooks/useCardArrangement';
import { getSmartSortedHandForEight, parseCard } from '../utils';
import GameTable from './GameTable';

const EightCardGame = (props) => {
  const {
    user,
    roomId,
    players,
    status,
    hand,
    result,
    onBackToLobby,
    onGameEnd,
  } = props;

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

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    // Assuming no foul check for 8-card game on client
    handlePlayerAction('submit_hand', { hand: currentHand });
  };

  const handleAutoSort = useCallback(() => {
    if (!hand) return;
    const allCards = [...hand.top, ...hand.middle, ...hand.bottom];
    const cardObjects = allCards.map(c => (typeof c === 'string' ? parseCard(c) : c));
    const sorted = getSmartSortedHandForEight(cardObjects);
    if (sorted) {
      setInitialLanes(sorted);
    } else {
      setErrorMessage('无法找到有效的牌型组合。');
    }
  }, [hand, setInitialLanes]);

  return (
    <GameTable
      gameType="eight"
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
      onCloseResult={onBackToLobby}
      onPlayAgain={onBackToLobby}
    />
  );
};

export default EightCardGame;