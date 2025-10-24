import React, { useState, useEffect, useCallback } from 'react';
import GameTable from '../components/GameTable';
import useGame from '../hooks/useGame';
import { useParams, useNavigate } from 'react-router-dom';
import { findBestArrangement } from '../utils/trialModeUtils';
import { parseCard } from '../utils/pokerEvaluator';

const ThirteenGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const isTrial = gameId === 'trial';

  // Mock user for trial mode
  const mockUser = { id: 'user-trial', name: '你', points: 1000 };
  const user = isTrial ? mockUser : null; // In a real app, you'd get the user from context or a hook

  const { 
    game, loading, error, sendArrangement, sendReady, 
    topLane, middleLane, bottomLane, unassignedCards,
    setTopLane, setMiddleLane, setBottomLane, setUnassignedCards,
    playerState, setPlayerState, gameResult, setGameResult,
    isGameInProgress, setIsGameInProgress, selectedCards, setSelectedCards
  } = useGame(gameId, user);

  const [isReady, setIsReady] = useState(false);

  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  // Auto-manage lanes based on unassigned cards
  useEffect(() => {
    if (isTrial && game && game.players) {
      const player = game.players.find(p => p.id === user.id);
      if (player && player.hand) {
        setUnassignedCards(player.hand.map(parseCard).filter(Boolean));
        setPlayerState('arranging');
        setIsGameInProgress(true);
      }
    }
  }, [isTrial, game, user, setUnassignedCards, setPlayerState, setIsGameInProgress]);
  
  const onCardClick = useCallback((card) => {
    setSelectedCards(prev => {
        const isAlreadySelected = prev.some(c => c.rank === card.rank && c.suit === card.suit);
        if (isAlreadySelected) {
            return prev.filter(c => !(c.rank === card.rank && c.suit === card.suit));
        }
        return [...prev, card];
    });
  }, []);

  const onLaneClick = useCallback((lane) => {
    if (selectedCards.length === 0) return;

    const moveCardsToLane = (targetLane, setTargetLane, limit) => {
        const currentCards = targetLane;
        if (currentCards.length + selectedCards.length > limit) {
            // Handle error: too many cards for the lane
            console.error(`Cannot add ${selectedCards.length} cards to a lane with ${currentCards.length}/${limit} cards.`);
            return;
        }

        setTargetLane(prev => [...prev, ...selectedCards]);
        setUnassignedCards(prev => prev.filter(card => 
            !selectedCards.some(selCard => selCard.rank === card.rank && selCard.suit === card.suit)
        ));
        setSelectedCards([]);
    };

    if (lane === 'top') moveCardsToLane(topLane, setTopLane, LANE_LIMITS.top);
    if (lane === 'middle') moveCardsToLane(middleLane, setMiddleLane, LANE_LIMITS.middle);
    if (lane === 'bottom') moveCardsToLane(bottomLane, setBottomLane, LANE_LIMITS.bottom);

  }, [selectedCards, topLane, middleLane, bottomLane, LANE_LIMITS, setSelectedCards, setUnassignedCards, setTopLane, setMiddleLane, setBottomLane]);

  const handleConfirm = async () => {
    const arrangement = {
      top: topLane.map(c => `${c.rank}_of_${c.suit}`),
      middle: middleLane.map(c => `${c.rank}_of_${c.suit}`),
      bottom: bottomLane.map(c => `${c.rank}_of_${c.suit}`),
    };

    setPlayerState('submitted');

    if (isTrial) {
        // In trial mode, we simulate the game result locally
        const aiPlayers = game.players.filter(p => p.id !== user.id);
        const playerArrangements = [
            { ...arrangement, playerId: user.id, name: '你' },
            ...aiPlayers.map(ai => ({
                ...findBestArrangement(ai.hand), 
                playerId: ai.id, 
                name: ai.name 
            }))
        ];

        // This part needs a proper backend logic replacement for comparison
        // For now, we'll just display the hands without a winner
        const result = {
            players: playerArrangements.map(p => ({
                id: p.playerId,
                name: p.name,
                hand: { top: p.top, middle: p.middle, bottom: p.bottom },
                score: 0 // No scoring in this simplified trial
            })),
            myId: user.id
        };
        setGameResult(result);
    } else {
        await sendArrangement(arrangement);
    }
  };

  const handleReady = () => {
    setIsReady(!isReady);
    sendReady(!isReady);
  };

  const handleAutoSort = () => {
    const arrangement = findBestArrangement(unassignedCards.map(c => `${c.rank}_of_${c.suit}`));
    setTopLane(arrangement.front.map(parseCard).filter(Boolean));
    setMiddleLane(arrangement.middle.map(parseCard).filter(Boolean));
    setBottomLane(arrangement.back.map(parseCard).filter(Boolean));
    setUnassignedCards([]);
  };
  
  const handlePlayAgain = () => {
    setGameResult(null);
    setIsReady(false);
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    // In a real app, you might need to fetch a new hand or reset the game state on the server
    if (isTrial) {
      const player = game.players.find(p => p.id === user.id);
      setUnassignedCards(player.hand.map(parseCard).filter(Boolean));
      setPlayerState('arranging');
    } else {
      // For online games, you might navigate to a new game or back to the lobby
      navigate('/lobby');
    }
  };

  return (
    <GameTable
      gameType={isTrial ? 'trial' : 'online'}
      title={isTrial ? '十三水-试玩' : (game ? game.name : '加载中...')}
      players={game ? game.players : []}
      user={user}

      topLane={topLane}
      middleLane={middleLane}
      bottomLane={bottomLane}
      unassignedCards={unassignedCards}
      selectedCards={selectedCards}
      LANE_LIMITS={LANE_LIMITS}
      playerState={playerState}
      isGameInProgress={isGameInProgress}
      isLoading={loading}
      gameResult={gameResult}
      errorMessage={error}

      onBackToLobby={() => navigate('/lobby')}
      onReady={handleReady}
      isReady={isReady}
      onConfirm={handleConfirm}
      onAutoSort={handleAutoSort}
      onCardClick={onCardClick}
      onLaneClick={onLaneClick}
      onCloseResult={() => setGameResult(null)}
      onPlayAgain={handlePlayAgain}
    />
  );
};

export default ThirteenGame;
