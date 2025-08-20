// --- Lane.jsx: 恢复正常堆叠，只有弹起的牌显示左半边，最右侧未选中牌始终完整 ---
import React from 'react';
import Card from './Card';
import './Lane.css';

const areCardsEqual = (card1, card2) =>
  card1 && card2 && card1.rank === card2.rank && card1.suit === card2.suit;

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [],
}) => {
  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>
      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isLast = idx === cards.length - 1;
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}${isLast ? ' last' : ''}`}
              style={{
                position: 'relative',
                left: `${idx === 0 ? 0 : -34 * idx}px`,
                zIndex: idx,
                // 只有选中弹起的牌显示左半边
                overflow: isSelected ? 'hidden' : (isLast ? 'visible' : 'visible'),
                width: isSelected ? '55px' : (isLast ? '110px' : '110px'),
                minWidth: isSelected ? '28px' : (isLast ? '55px' : '55px'),
                maxWidth: isSelected ? '55px' : (isLast ? '110px' : '110px'),
                height: '165px',
                transform: isSelected ? 'translateY(-20px) scale(1.08)' : 'none',
                transition: 'box-shadow 0.2s, transform 0.18s',
                pointerEvents: 'auto'
              }}
            >
              <Card
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                isSelected={isSelected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lane;