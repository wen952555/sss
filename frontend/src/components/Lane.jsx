// --- START OF FILE Lane.jsx (FINAL INTERACTION FIX) ---

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

  // --- 核心修改：计算选中牌的位置，并为后续牌添加位移 ---
  let selectedIndex = -1;
  // 为了简化逻辑，我们只处理单选的情况
  if (selectedCards.length === 1) {
    selectedIndex = cards.findIndex(card => areCardsEqual(card, selectedCards[0]));
  }

  // 假设卡牌宽度约为 110px，重叠部分约为 33px，则暴露出的宽度约为 77px
  const cardExposedWidth = 77; 

  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>

      <div className="card-placement-box" onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          
          let style = {};
          // 如果有牌被选中，并且当前牌在选中牌之后
          if (selectedIndex !== -1 && idx > selectedIndex) {
            // 将这张牌向右平移一个“卡牌暴露宽度”的距离
            style.transform = `translateX(${cardExposedWidth}px)`;
          }

          return (
            <div 
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper ${isSelected ? 'selected' : ''}`}
              style={style} // 应用动态计算的样式
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
// --- END OF FILE Lane.jsx (FINAL INTERACTION FIX) ---