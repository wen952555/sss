// --- START OF FILE Lane.jsx ---

import React from 'react';
import Card from './Card';
import './Lane.css';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, handType, selectedCards = [],
}) => {

  const handleAreaClick = () => {
    // 当点击牌道空白区域时，如果手中有选中的牌，则触发移动
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  return (
    <div className="lane-container" onClick={handleAreaClick}>
      <div className="card-display-area">
        {cards.map((card, idx) => (
          <Card
            key={`${card.rank}-${card.suit}-${idx}`}
            card={card}
            isSelected={selectedCards.some(sel => areCardsEqual(sel, card))}
            // --- 核心修复：确保传递给 Card 的 onClick 是一个只处理 card 的函数 ---
            // Card 组件内部会处理事件冒泡，这里不需要传递事件对象 e
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        ))}
      </div>
      <div className="lane-info">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
        {handType && <span className="lane-hand-type">{handType}</span>}
      </div>
    </div>
  );
};

export default Lane;
// --- END OF FILE Lane.jsx ---