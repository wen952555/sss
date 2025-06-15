import React, { useState, useContext } from 'react';
import Card from './Card';
import { GameContext } from '../contexts/GameContext';

const Player = ({ player, position, isCurrent }) => {
  const { gameState, playerPlay } = useContext(GameContext);
  const [selectedCards, setSelectedCards] = useState([]);
  const [groups, setGroups] = useState({ front: [], middle: [], back: [] });

  const handleCardClick = (card) => {
    if (player.id !== 0 || gameState.currentPlayer !== 0 || gameState.gamePhase !== 'playing') return;
    
    const index = selectedCards.findIndex(c => 
      c.suit === card.suit && c.value === card.value
    );
    
    if (index !== -1) {
      setSelectedCards(selectedCards.filter((_, i) => i !== index));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const assignToGroup = (groupName) => {
    if (selectedCards.length === 0) return;
    
    const newGroups = { ...groups };
    
    // Check if group is already filled
    if (groupName === 'front' && newGroups.front.length >= 3) return;
    if (groupName === 'middle' && newGroups.middle.length >= 5) return;
    if (groupName === 'back' && newGroups.back.length >= 5) return;
    
    newGroups[groupName] = [...newGroups[groupName], ...selectedCards];
    setSelectedCards([]);
    setGroups(newGroups);
    
    // Check if all cards are assigned
    const totalAssigned = newGroups.front.length + newGroups.middle.length + newGroups.back.length;
    if (totalAssigned === 13) {
      playerPlay(player.id, {
        front: newGroups.front,
        middle: newGroups.middle,
        back: newGroups.back
      });
    }
  };

  const clearGroup = (groupName) => {
    const newGroups = { ...groups };
    const clearedCards = [...newGroups[groupName]];
    newGroups[groupName] = [];
    setGroups(newGroups);
    setSelectedCards([...selectedCards, ...clearedCards]);
  };

  const renderCards = (cards) => {
    return cards.map((card, index) => (
      <Card 
        key={`${card.suit}-${card.value}-${index}`}
        card={card}
        onClick={() => handleCardClick(card)}
        isSelected={selectedCards.some(c => 
          c.suit === card.suit && c.value === card.value
        )}
        isPlayed={gameState.gamePhase === 'results'}
      />
    ));
  };

  return (
    <div className={`player ${position} ${isCurrent ? 'current' : ''}`}>
      <div className="player-info">
        <h3>{player.name}</h3>
        <p>得分: {player.score || 0}</p>
      </div>
      
      {gameState.gamePhase === 'results' && (
        <div className="played-cards">
          <div className="card-group">
            <label>头道 (3张)</label>
            <div className="cards-container">{renderCards(player.cards?.front || [])}</div>
          </div>
          <div className="card-group">
            <label>中道 (5张)</label>
            <div className="cards-container">{renderCards(player.cards?.middle || [])}</div>
          </div>
          <div className="card-group">
            <label>尾道 (5张)</label>
            <div className="cards-container">{renderCards(player.cards?.back || [])}</div>
          </div>
        </div>
      )}
      
      {player.id === 0 && gameState.gamePhase === 'playing' && (
        <div className="hand">
          <div className="hand-cards">
            {renderCards(player.hand)}
          </div>
          
          <div className="group-controls">
            <div className="group">
              <div className="group-header">
                <span>头道 (3张)</span>
                <button onClick={() => clearGroup('front')}>清除</button>
              </div>
              <div className="cards-container">
                {renderCards(groups.front)}
                <button 
                  onClick={() => assignToGroup('front')}
                  disabled={selectedCards.length === 0 || groups.front.length >= 3}
                >
                  分配
                </button>
              </div>
            </div>
            
            <div className="group">
              <div className="group-header">
                <span>中道 (5张)</span>
                <button onClick={() => clearGroup('middle')}>清除</button>
              </div>
              <div className="cards-container">
                {renderCards(groups.middle)}
                <button 
                  onClick={() => assignToGroup('middle')}
                  disabled={selectedCards.length === 0 || groups.middle.length >= 5}
                >
                  分配
                </button>
              </div>
            </div>
            
            <div className="group">
              <div className="group-header">
                <span>尾道 (5张)</span>
                <button onClick={() => clearGroup('back')}>清除</button>
              </div>
              <div className="cards-container">
                {renderCards(groups.back)}
                <button 
                  onClick={() => assignToGroup('back')}
                  disabled={selectedCards.length === 0 || groups.back.length >= 5}
                >
                  分配
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
