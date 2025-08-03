import React from 'react';
import Card from './Card';

const Lane = ({ title, cards, onLaneClick, expectedCount }) => {
  return (
    <div className="lane" onClick={onLaneClick}>
      <h4>{title} ({cards.length}/{expectedCount})</h4>
      <div className="card-container">
        {cards.map((card, index) => (
          <Card key={`${card.rank}-${card.suit}-${index}`} card={card} />
        ))}
        {cards.length === 0 && <div className="lane-placeholder">点击这里放置选中的牌</div>}
      </div>
    </div>
  );
};

export default Lane;
