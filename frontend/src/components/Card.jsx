import React from 'react';

// 卡牌的点数顺序，用于排序
const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

// 卡牌对象排序函数
export const sortCards = (cards) => {
  return [...cards].sort((a, b) => {
    // 首先比较点数
    const rankComparison = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (rankComparison !== 0) {
      return rankComparison;
    }
    // 如果点数相同，则比较花色 (spades > hearts > clubs > diamonds)
    const suitOrder = ['diamonds', 'clubs', 'hearts', 'spades'];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
};

const Card = ({ card, onClick, isSelected }) => {
  // 大小王暂不处理，十三张一般不用
  if (card.suit === 'joker') {
    return null; // 或者显示一个牌背
  }

  const imageName = `${card.rank}_of_${card.suit}.svg`;
  const imagePath = `/cards/${imageName}`;
  
  // 根据是否被选中，添加不同的样式
  const cardClassName = `card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`;

  return (
    <div className={cardClassName} onClick={() => onClick && onClick(card)}
      style={{
        width: 'min(13vw,85px)',      // 卡牌宽度提升
        height: 'auto',
        minWidth: '40px',
        maxWidth: '85px',
        maxHeight: '120px',           // 卡牌最大高度提升
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
      <img
        src={imagePath}
        alt={`${card.suit} ${card.rank}`}
        style={{
          maxWidth: '100%',
          maxHeight: '115px',         // 图片最大高度提升
          width: 'auto',
          height: 'auto',
          display: 'block',
        }}
        draggable={false}
      />
    </div>
  );
};

export default Card;
