// --- START OF FILE Lane.jsx (FINAL-FINAL FIX) ---

import React from 'react';
import Card from './Card';
import './Lane.css'; 

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [],
}) => {

  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  // --- 核心逻辑：计算位移 ---
  // 我们只处理单选的情况以获得最佳交互效果
  const selectedIndex = selectedCards.length === 1 
    ? cards.findIndex(card => areCardsEqual(card, selectedCards[0]))
    : -1;

  // 卡牌暴露出的宽度，根据 CSS 的 margin-left: -33px 和卡牌宽度 110px 计算
  // 110px (总宽) - 33px (重叠) = 77px (暴露)
  const cardExposedWidth = 77; 

  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>

      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          
          let wrapperStyle = {};

          // 场景1：如果这张牌在被选中的牌的“右边”
          if (selectedIndex !== -1 && idx > selectedIndex) {
            // 向右平移，为选中的牌腾出空间
            wrapperStyle.transform = `translateX(${cardExposedWidth}px)`;
          }

          return (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`}
              // --- 核心修改：将 isSelected 作为一个独立的 prop 传递 ---
              className={`card-wrapper ${isSelected ? 'selected' : ''}`}
              style={wrapperStyle}
            >
              <Card
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lane;
// --- END OF FILE Lane.jsx (FINAL-FINAL FIX) ---