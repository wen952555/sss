import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import { aiPlay } from '../services/gameLogic';

const Controls = () => {
  const { gameState, startGame, resetGame, playerPlay } = useContext(GameContext);
  
  // 新增 AI 分牌功能
  const handleAIAssist = () => {
    if (gameState.currentPlayer !== 0 || gameState.gamePhase !== 'playing') return;
    
    const humanPlayer = gameState.players[0];
    const aiResult = aiPlay([...humanPlayer.hand]);
    
    playerPlay(0, aiResult);
  };

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
        <button className="btn ai-btn" onClick={handleAIAssist}>
          AI分牌
        </button>
      )}
    </div>
  );
};

export default Controls;
