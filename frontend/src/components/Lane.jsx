import React from 'react';
import Card from './Card';
import './Lane.css';
import { areCardsEqual } from '../utils';

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [],
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
      <div className="card-placement-box" onClick={handleAreaClick}>
        <div className="lane-title-indicator">{`${title} (${expectedCount})`}</div>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                '--card-index': idx,
                zIndex: isSelected ? 99 : idx + 2,
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