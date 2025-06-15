// frontend_react/src/components/HumanPlayerBoard.js
import React from 'react';
import Card from './Card';
import { evaluateHand } from '../logic/cardUtils'; // 用于显示墩牌牌型
import './HumanPlayerBoard.css';

const DunSection = ({ dunName, label, cards, expectedSize, onDunClick, onCardClickInDun, arrangedHand }) => {
  const currentDunCards = arrangedHand[dunName] || [];
  const handEvaluation = currentDunCards.length === expectedSize ? evaluateHand(currentDunCards) : null;
  // eslint-disable-next-line no-unused-vars
  const cardTypeDisplay = handEvaluation ? handEvaluation.name : (currentDunCards.length > 0 ? "组合中..." : "空"); // 将中文变量名改为英文

  return (
    <div className="dun-row">
      <div className="dun-label-container">
        <div className="dun-label">{label}</div>
        <div className="dun-type-display">{cardTypeDisplay}</div> {/* 使用修改后的变量名 */}
      </div>
      <div className="dun-cards-area" onClick={() => onDunClick(dunName)}>
        {currentDunCards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onClick={(e) => { e.stopPropagation(); onCardClickInDun(card, dunName); }}
          />
        ))}
        {Array(expectedSize - currentDunCards.length).fill(null).map((_, i) => (
          <div key={`placeholder-${dunName}-${i}`} className="card-placeholder-slot">
            {/* 点击这里放置选中的牌 */}
          </div>
        ))}
      </div>
    </div>
  );
};

const HumanPlayerBoard = ({
  player, // 包含 .hand
  unassignedCards,
  arrangedHand, // { tou: [], zhong: [], wei: [] }
  selectedCardId,
  onSelectCardFromHand,
  onPlaceCardInDun, // (dunName) => void
  onRemoveCardFromDun // (card, dunName) => void
}) => {
  if (!player) return null;

  return (
    <div className="human-player-board-container">
      <div className="unassigned-cards-header">你的手牌 (点击选择，再点击墩区放置):</div>
      <div className="unassigned-cards-area">
        {unassignedCards.length > 0 ? (
          unassignedCards.map(card => (
            <Card
              key={card.id}
              card={card}
              onClick={() => onSelectCardFromHand(card)}
              style={{
                border: selectedCardId === card.id ? '3px solid dodgerblue' : '1px solid #ccc',
                transform: selectedCardId === card.id ? 'scale(1.05)' : 'none',
              }}
            />
          ))
        ) : (
          <p className="no-unassigned-cards">所有牌已分配到墩道。</p>
        )}
      </div>

      <div className="duns-layout">
        <DunSection
          dunName="tou"
          label="头道"
          expectedSize={3}
          onDunClick={onPlaceCardInDun}
          onCardClickInDun={onRemoveCardFromDun}
          arrangedHand={arrangedHand}
        />
        <DunSection
          dunName="zhong"
          label="中道"
          expectedSize={5}
          onDunClick={onPlaceCardInDun}
          onCardClickInDun={onRemoveCardFromDun}
          arrangedHand={arrangedHand}
        />
        <DunSection
          dunName="wei"
          label="尾道"
          expectedSize={5}
          onDunClick={onPlaceCardInDun}
          onCardClickInDun={onRemoveCardFromDun}
          arrangedHand={arrangedHand}
        />
      </div>
    </div>
  );
};

export default HumanPlayerBoard;
