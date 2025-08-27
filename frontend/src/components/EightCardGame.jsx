import React, { useState, useEffect } from 'react';
import './EightCardGame.css';
import { dealOfflineEightCardGame, getSmartSortedHandForEight, calculateEightCardTrialResult, parseCard } from '../utils';
import GameTable from './GameTable';

// This component is now a mirror of ThirteenGame, auto-sorted.
const EightCardGame = ({ onBackToLobby, user }) => {
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
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

  const handleReady = () => {
    const { playerHand, aiHands: initialAiHands } = dealOfflineEightCardGame(6);

    const sortedPlayerHand = getSmartSortedHandForEight(playerHand);
    if (sortedPlayerHand) {
        setTopLane(sortedPlayerHand.top.map(parseCard));
        setMiddleLane(sortedPlayerHand.middle.map(parseCard));
        setBottomLane(sortedPlayerHand.bottom.map(parseCard));
    }

    const sortedAiHands = initialAiHands.map(getSmartSortedHandForEight);
    setAiHands(sortedAiHands);
    setPlayerState('arranging');
    setPlayers(prev => prev.map(p => ({ ...p, is_ready: true })));
  };

  const handleConfirm = () => {
    const playerHand = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`)
    };
    const result = calculateEightCardTrialResult(playerHand, aiHands);
    const modalPlayers = [
      { name: user.phone, hand: playerHand, score: result.playerScore, is_me: true },
      ...aiHands.map((hand, index) => ({ name: `AI ${index + 1}`, hand, score: 'N/A' }))
    ];
    setGameResult({ players: modalPlayers });
    setPlayerState('submitted');
  };

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
      selectedCards={[]}
      LANE_LIMITS={{ top: 2, middle: 3, bottom: 3 }}

      playerState={playerState}
      isLoading={isLoading}
      gameResult={gameResult}
      errorMessage={errorMessage}

      onBackToLobby={onBackToLobby}
      onReady={handleReady}
      onConfirm={handleConfirm}
      onAutoSort={() => {}} // Dummy handler, button is disabled
      onCardClick={() => {}} // Dummy handler, cards are not clickable
      onLaneClick={() => {}}  // Dummy handler, lanes are not clickable
      onCloseResult={() => setGameResult(null)}
    />
  );
};

export default EightCardGame;