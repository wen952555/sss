// frontend_react/src/components/HumanPlayerBoard.js
import React from 'react';
import Card from './Card';
import { evaluateHand as evaluateHandLogic } from '../logic/cardUtils';
import './HumanPlayerBoard.css';

const DunDisplay = ({ dunName, label, cardsInDun, expectedSize, onDunAreaClick, onCardClickInDun, selectedCardsInfo }) => {
  const handEvaluation = cardsInDun.length === expectedSize ? evaluateHandLogic(cardsInDun) : null;
  const cardTypeDisplay = handEvaluation ? handEvaluation.name : (cardsInDun.length > 0 ? "组合中..." : "空");

  return (
    <div className="dun-row-hpb">
      <div className="dun-label-container-hpb">
        <div className="dun-label-hpb">{label}</div>
        <div className="dun-type-display-hpb">{cardTypeDisplay}</div>
      </div>
      <div className="dun-cards-area-hpb" onClick={() => onDunAreaClick(dunName)}>
        {cardsInDun.map((card) => {
          const isSelected = selectedCardsInfo.some(info => info.card.id === card.id);
          return (
            <Card
              key={card.id}
              card={card}
              onClick={(e) => {
                e.stopPropagation();
                onCardClickInDun(card, dunName);
              }}
              style={{
                border: isSelected ? '3px solid dodgerblue' : '1px solid #ccc',
                transform: isSelected ? 'scale(1.05)' : 'none',
                opacity: isSelected ? 0.7 : 1, // Optional: make selected cards slightly transparent
              }}
            />
          );
        })}
        {cardsInDun.length === 0 && Array(expectedSize).fill(null).map((_, i) => (
             <div key={`placeholder-${dunName}-${i}`} className="card-placeholder-slot-hpb"></div>
        ))}
      </div>
    </div>
  );
};

const HumanPlayerBoard = ({
  arrangedHand,
  selectedCardsInfo, // Changed from selectedCardInfo
  onCardClick,
  onDunClick
}) => {
  const instructionText = selectedCardsInfo.length > 0
    ? `已选择 ${selectedCardsInfo.length} 张牌。请点击目标墩区放置。`
    : "请点击牌进行选择 (可多选)，再点击目标墩区进行放置。";

  return (
    <div className="human-player-board-container-new">
      <div className="hpb-instruction-text">{instructionText}</div>
      <div className="duns-layout-hpb">
        <DunDisplay
          dunName="tou"
          label="头道"
          cardsInDun={arrangedHand.tou || []}
          expectedSize={3}
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardsInfo={selectedCardsInfo}
        />
        <DunDisplay
          dunName="zhong"
          label="中道"
          cardsInDun={arrangedHand.zhong || []}
          expectedSize={5}
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardsInfo={selectedCardsInfo}
        />
        <DunDisplay
          dunName="wei"
          label="尾道"
          cardsInDun={arrangedHand.wei || []}
          expectedSize={5}
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardsInfo={selectedCardsInfo}
        />
      </div>
    </div>
  );
};

export default HumanPlayerBoard;
