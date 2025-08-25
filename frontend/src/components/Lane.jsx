import React from 'react';
import Card from './Card';
import './Lane.css';

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [], areCardsEqual,
}) => {
  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  // 修复堆叠遮挡：
  // - 所有牌 zIndex = idx + 2，弹起牌 zIndex = 99（永远最高，但只弹起不遮盖右侧）
  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>
      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                position: 'relative',
                left: `${idx === 0 ? 0 : -18 * idx}px`,
                zIndex: isSelected ? 99 : idx + 2,
                overflow: 'visible',
                width: '72px',
                minWidth: '60px',
                maxWidth: '72px',
                height: '110px',
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