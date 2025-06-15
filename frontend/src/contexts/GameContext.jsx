import React, { createContext, useState } from 'react';
import { initializeGame, aiPlay } from '../services/gameLogic';
import { startGameAPI } from '../services/api';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    players: [],
    currentPlayer: 0,
    gamePhase: 'setup', // setup, playing, results
    deck: [],
    results: null,
    aiThinking: false
  });

  const startGame = async () => {
    try {
      const response = await startGameAPI();
      const gameData = initializeGame(response.deck);
      setGameState({
        ...gameState,
        players: gameData.players,
        deck: gameData.deck,
        gamePhase: 'playing',
        currentPlayer: 0,
        results: null
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  const playerPlay = (playerIndex, cards) => {
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex].cards = cards;
    
    setGameState({
      ...gameState,
      players: newPlayers,
      currentPlayer: playerIndex + 1
    });
    
    // Trigger AI plays after human player
    if (playerIndex === 0) {
      setGameState(prev => ({ ...prev, aiThinking: true }));
      setTimeout(() => {
        playAI();
      }, 1000);
    }
  };

  const playAI = () => {
    const newPlayers = [...gameState.players];
    
    // AI players (indexes 1,2,3) play
    for (let i = 1; i < 4; i++) {
      const aiHand = newPlayers[i].cards;
      const aiPlayed = aiPlay(aiHand);
      newPlayers[i].cards = aiPlayed;
    }
    
    setGameState({
      ...gameState,
      players: newPlayers,
      currentPlayer: 0,
      aiThinking: false,
      gamePhase: 'results'
    });
  };

  const resetGame = () => {
    setGameState({
      players: [],
      currentPlayer: 0,
      gamePhase: 'setup',
      deck: [],
      results: null,
      aiThinking: false
    });
  };

  return (
    <GameContext.Provider value={{
      gameState,
      startGame,
      playerPlay,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
};
