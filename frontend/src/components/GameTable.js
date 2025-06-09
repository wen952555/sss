import React, { useState, useEffect } from 'react';
import Card from './Card';

const GameTable = ({ game, userId }) => {
  const [hand, setHand] = useState([]);
  const [frontHand, setFrontHand] = useState([]);
  const [middleHand, setMiddleHand] = useState([]);
  const [backHand, setBackHand] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCard, setDraggedCard] = useState(null);

  useEffect(() => {
    if (game && game.players) {
      const player = game.players.find(p => p.userId === userId);
      if (player) {
        setHand(player.hand || []);
        setFrontHand(player.arranged?.front || []);
        setMiddleHand(player.arranged?.middle || []);
        setBackHand(player.arranged?.back || []);
      }
    }
  }, [game, userId]);

  const handleDragStart = (e, card) => {
    setIsDragging(true);
    setDraggedCard(card);
    e.dataTransfer.setData('card', JSON.stringify(card));
  };

  const handleDrop = (targetSet) => {
    return (card) => {
      if (!draggedCard) return;
      
      // 从原位置移除
      const removeFromSet = (set) => set.filter(c => 
        !(c.suit === draggedCard.suit && c.value === draggedCard.value)
      );
      
      setHand(removeFromSet(hand));
      setFrontHand(removeFromSet(frontHand));
      setMiddleHand(removeFromSet(middleHand));
      setBackHand(removeFromSet(backHand));
      
      // 添加到目标位置
      if (targetSet === 'hand') setHand([...hand, draggedCard]);
      if (targetSet === 'front') setFrontHand([...frontHand, draggedCard]);
      if (targetSet === 'middle') setMiddleHand([...middleHand, draggedCard]);
      if (targetSet === 'back') setBackHand([...backHand, draggedCard]);
      
      setIsDragging(false);
      setDraggedCard(null);
    };
  };

  const handleAutoArrange = async () => {
    try {
      const response = await fetch('https://9526.ip-ddns.com/api/game/auto_arrange.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: hand })
      });
      
      const data = await response.json();
      if (data.success) {
        setFrontHand(data.arrangedCards.front);
        setMiddleHand(data.arrangedCards.middle);
        setBackHand(data.arrangedCards.back);
        setHand([]);
      }
    } catch (error) {
      console.error('Auto arrange error:', error);
    }
  };

  return (
    <div className="game-table">
      <div className="hand-area">
        <h3>手牌 ({hand.length})</h3>
        <div className="cards-container" onDrop={handleDrop('hand')}>
          {hand.map((card, index) => (
            <Card 
              key={`hand-${index}`} 
              card={card} 
              onDragStart={handleDragStart}
              draggable={true}
            />
          ))}
        </div>
      </div>
      
      <div className="arranged-areas">
        <div className="arranged-group">
          <h3>头墩 (3张)</h3>
          <div className="cards-container" onDrop={handleDrop('front')}>
            {frontHand.map((card, index) => (
              <Card key={`front-${index}`} card={card} onDrop={handleDrop('front')} />
            ))}
          </div>
        </div>
        
        <div className="arranged-group">
          <h3>中墩 (5张)</h3>
          <div className="cards-container" onDrop={handleDrop('middle')}>
            {middleHand.map((card, index) => (
              <Card key={`middle-${index}`} card={card} onDrop={handleDrop('middle')} />
            ))}
          </div>
        </div>
        
        <div className="arranged-group">
          <h3>尾墩 (5张)</h3>
          <div className="cards-container" onDrop={handleDrop('back')}>
            {backHand.map((card, index) => (
              <Card key={`back-${index}`} card={card} onDrop={handleDrop('back')} />
            ))}
          </div>
        </div>
      </div>
      
      <div className="game-controls">
        <button onClick={handleAutoArrange}>AI自动分牌</button>
        <button>确认出牌</button>
      </div>
    </div>
  );
};

export default GameTable;
