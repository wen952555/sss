// --- FIX: Lane.jsx 保证弹起牌不遮挡后面牌，所有选中牌始终在最顶层渲染 ---

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
  // 计算选中牌的索引集合
  const selectedIdxSet = new Set(
    cards.map((card, idx) =>
      selectedCards.some(sel => areCardsEqual(sel, card)) ? idx : null
    ).filter(idx => idx !== null)
  );

  // 渲染所有牌，保证选中的牌始终最晚渲染（在视觉上在最上层，不遮挡后面的牌）
  // 先渲染未选中的牌，再渲染选中的牌（顺序不变）
  const normalCards = cards
    .map((card, idx) => ({ card, idx }))
    .filter(({ idx }) => !selectedIdxSet.has(idx));
  const selectedCardsArr = cards
    .map((card, idx) => ({ card, idx }))
    .filter(({ idx }) => selectedIdxSet.has(idx));

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
        {/* 先渲染未选中的牌 */}
        {normalCards.map(({ card, idx }) => (
          <div
            key={`${card.rank}-${card.suit}-${idx}`}
            className="card-wrapper"
            style={{
              position: 'relative',
              left: `${idx === 0 ? 0 : -34 * idx}px`,
              zIndex: idx,
              transform: 'none',
              transition: 'box-shadow 0.2s, transform 0.18s',
            }}
          >
            <Card
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          </div>
        ))}
        {/* 再渲染选中的牌，始终在最顶层，不遮挡后面的牌 */}
        {selectedCardsArr.map(({ card, idx }) => (
          <div
            key={`${card.rank}-${card.suit}-${idx}-selected`}
            className="card-wrapper selected"
            style={{
              position: 'relative',
              left: `${idx === 0 ? 0 : -34 * idx}px`,
              zIndex: 999 + idx, // 足够大，确保总在最上面
              transform: 'translateY(-20px) scale(1.08)',
              transition: 'box-shadow 0.2s, transform 0.18s',
              pointerEvents: 'auto'
            }}
          >
            <Card
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              isSelected={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lane;
// --- END FIX ---