// --- Lane.jsx: 只有最右边牌显示完整，其它牌始终只显示左半边，无论是否弹起 ---
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
                transform: isSelected ? 'translateY(-20px) scale(1.08)' : 'none',
                transition: 'box-shadow 0.2s, transform 0.18s',
                pointerEvents: 'auto',
                // 只有最后一张牌显示完整，其它只显示左半边
                overflow: isLast ? 'visible' : 'hidden',
                width: isLast ? '110px' : '55px', // 只露左半边，完整牌宽度110px
                minWidth: isLast ? '55px' : '28px',
                maxWidth: isLast ? '110px' : '55px',
                height: '165px',
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