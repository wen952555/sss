import React from 'react';
import Card from './Card';
import './Lane.css';

const Lane = ({ title, cards, onLaneClick, onCardClick, expectedCount, handType }) => {
  const handleCardClick = onCardClick || (() => {});
  
  // 如果有牌型，则显示牌型名称，否则显示墩的计数
  const displayTitle = handType ? `${title} - ${handType}` : `${title} (${cards.length}/${expectedCount})`;

  return (
    <div className={`lane ${onLaneClick ? 'clickable' : ''}`} onClick={onLaneClick}>
      <h4>{displayTitle}</h4>
      <div className="card-container">
        {cards.map((card, index) => (
          <Card 
            key={`${card.rank}-${card.suit}-${index}`} 
            card={card}
            onClick={() => handleCardClick(card)}
          />
        ))}
        {cards.length === 0 && onLaneClick && (
          <div className="lane-placeholder">点击这里放置选中的牌</div>
        )}
      </div>
    </div>
  );
};

export default Lane;
