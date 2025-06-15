import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';

const Controls = () => {
  const { gameState, startGame, resetGame } = useContext(GameContext);
  
  return (
    <div className="game-controls">
      {gameState.gamePhase === 'setup' && (
        <button className="btn start-btn" onClick={startGame}>
          开始游戏
        </button>
      )}
      
      {gameState.gamePhase === 'results' && (
        <button className="btn reset-btn" onClick={resetGame}>
          再来一局
        </button>
      )}
      
      {gameState.gamePhase === 'playing' && gameState.currentPlayer === 0 && (
        <button className="btn ai-btn">
          AI分牌
        </button>
      )}
    </div>
  );
};

export default Controls;
