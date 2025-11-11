import React from 'react';
import Card from './Card';
import { evaluateHand, HAND_TYPES } from '../utils/gameLogic';

const CardArea = ({ 
  title, 
  cards, 
  maxCards, 
  onCardClick, 
  selected = false,
  onAreaSelect,
  showEvaluation = true
}) => {
  const handleAreaClick = () => {
    if (onAreaSelect) {
      onAreaSelect();
    }
  };

  const getEvaluationText = () => {
    if (!showEvaluation || cards.length === 0) return null;
    
    const evaluation = evaluateHand(cards);
    return `${evaluation.type}`;
  };

  const getStatusColor = () => {
    if (cards.length === maxCards) return '#27ae60'; // 完成 - 绿色
    if (selected) return '#f39c12'; // 选中 - 橙色
    return '#34495e'; // 默认
  };

  return (
    <div className="lane">
      <div 
        className="lane-header" 
        onClick={handleAreaClick}
        style={{ cursor: onAreaSelect ? 'pointer' : 'default' }}
      >
        <span>
          {title} ({cards.length}/{maxCards})
        </span>
        {showEvaluation && (
          <span style={{ 
            fontSize: '0.8rem', 
            color: getStatusColor(),
            fontWeight: 'bold'
          }}>
            {getEvaluationText()}
          </span>
        )}
      </div>
      <div className="lane-cards">
        {cards.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            cardCode={card}
            onClick={onCardClick}
            size="normal"
          />
        ))}
        {Array.from({ length: maxCards - cards.length }).map((_, index) => (
          <div
            key={`empty-${index}`}
            style={{
              width: 'var(--card-width)',
              height: 'var(--card-height)',
              border: '2px dashed #7f8c8d',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7f8c8d',
              fontSize: '0.8rem'
            }}
          >
            空
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardArea;