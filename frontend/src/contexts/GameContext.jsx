import React, { createContext, useState, useEffect } from 'react';
import { initializeGame, aiPlay } from '../services/gameLogic';
import { startGameAPI } from '../services/api';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    players: [],
    currentPlayer: 0,
    gamePhase: 'setup',
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

  // ...其他函数保持不变（参考之前提供的GameContext实现）...

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
