import React, { useContext } from 'react';
import Player from './Player';
import AIPlayer from './AIPlayer';
import { GameContext } from '../contexts/GameContext';

const Table = () => {
  const { gameState } = useContext(GameContext);
  
  // 玩家位置
  const humanPlayer = gameState.players.find(p => p.id === 0);
  const aiPlayer1 = gameState.players.find(p => p.id === 1);
  const aiPlayer2 = gameState.players.find(p => p.id === 2);
  const aiPlayer3 = gameState.players.find(p => p.id === 3);
  
  return (
    <div className="game-table">
      <div className="table-center"></div>
      
      {aiPlayer1 && (
        <AIPlayer 
          player={aiPlayer1} 
          position="top" 
        />
      )}
      
      {aiPlayer2 && (
        <AIPlayer 
          player={aiPlayer2} 
          position="left" 
        />
      )}
      
      {aiPlayer3 && (
        <AIPlayer 
          player={aiPlayer3} 
          position="right" 
        />
      )}
      
      {humanPlayer && (
        <Player 
          player={humanPlayer} 
          position="bottom" 
          isCurrent={gameState.currentPlayer === 0}
        />
      )}
    </div>
  );
};

export default Table;
