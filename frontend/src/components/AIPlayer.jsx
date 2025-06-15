import React, { useContext } from 'react';
import Card from './Card';
import { GameContext } from '../contexts/GameContext';

const AIPlayer = ({ player, position }) => {
  const { gameState } = useContext(GameContext);
  
  const renderCards = () => {
    if (gameState.gamePhase === 'setup') {
      return <div className="placeholder">等待开始...</div>;
    }
    
    if (gameState.gamePhase === 'playing') {
      if (gameState.currentPlayer > player.id) {
        return <div className="placeholder">已出牌</div>;
      }
      return <div className="placeholder">思考中...</div>;
    }
    
    // Results phase - show all cards
    return (
      <>
        {player.cards?.front?.map((card, index) => (
          <Card 
            key={`front-${index}`} 
            card={card} 
            isPlayed={true}
          />
        ))}
        {player.cards?.middle?.map((card, index) => (
          <Card 
            key={`middle-${index}`} 
            card={card} 
            isPlayed={true}
          />
        ))}
        {player.cards?.back?.map((card, index) => (
          <Card 
            key={`back-${index}`} 
            card={card} 
            isPlayed={true}
          />
        ))}
      </>
    );
  };

  return (
    <div className={`ai-player ${position}`}>
      <div className="player-info">
        <h3>{player.name}</h3>
        <p>得分: {player.score || 0}</p>
      </div>
      
      <div className="ai-cards">
        {renderCards()}
      </div>
      
      {gameState.aiThinking && gameState.currentPlayer === player.id && (
        <div className="thinking-animation">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}
    </div>
  );
};

export default AIPlayer;
