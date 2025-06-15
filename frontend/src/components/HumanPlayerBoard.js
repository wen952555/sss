// frontend_react/src/components/HumanPlayerBoard.js
import React from 'react';
import Card from './Card';
import { evaluateHand as evaluateHandLogic } from '../logic/cardUtils';
import './HumanPlayerBoard.css';

const DunDisplay = ({ dunName, label, cardsInDun, expectedSize, onDunAreaClick, onCardClickInDun, selectedCardsInfo }) => {
  const handEvaluation = cardsInDun.length === expectedSize ? evaluateHandLogic(cardsInDun) : null;
  const cardTypeDisplay = handEvaluation ? handEvaluation.name : (cardsInDun.length > 0 ? "组合中..." : "请摆牌"); // Changed "空"

  const backgroundText = `${label}${ (cardsInDun.length === expectedSize || cardsInDun.length === 0) && cardTypeDisplay ? ` - ${cardTypeDisplay}` : ""}`;

  return (
    <div 
      className="dun-cards-area-hpb-v2 with-background-text-v2" // New class name for versioning
      onClick={() => onDunAreaClick(dunName)} 
      data-background-text={backgroundText}
    >
      {/* Cards will be absolutely positioned within this container */}
      {cardsInDun.map((card, index) => { // Pass index for potential dynamic z-index or advanced stacking
        const isSelected = selectedCardsInfo.some(info => info.card.id === card.id);
        return (
          <div 
            key={card.id} 
            className="card-wrapper-hpb" // Wrapper for each card to control its stacking and size
            style={{ 
              // Stacking offset will be primarily handled by CSS :nth-child
              // zIndex: cardsInDun.length - index, // Simple stacking order (topmost is last in array)
            }}
          >
            <Card
              card={card}
              onClick={(e) => {
                e.stopPropagation();
                onCardClickInDun(card, dunName);
              }}
              style={{ // Inline styles for selection, card itself will be 100% height/width of wrapper
                border: isSelected ? '3px solid dodgerblue' : '1px solid transparent', // Transparent border when not selected
                transform: isSelected ? 'scale(1.03)' : 'none',
                opacity: isSelected ? 0.85 : 1,
              }}
            />
          </div>
        );
      })}
      {/* Visual placeholders if dun is empty, less critical with background text */}
      {cardsInDun.length === 0 && Array(expectedSize).fill(null).map((_, i) => (
           <div key={`placeholder-${dunName}-${i}`} className="card-placeholder-visual-hpb-v2"></div>
      ))}
    </div>
  );
};

const HumanPlayerBoard = ({
  arrangedHand,
  selectedCardsInfo,
  onCardClick,
  onDunClick
}) => {
  const instructionText = selectedCardsInfo.length > 0
    ? `已选择 ${selectedCardsInfo.length} 张牌。请点击目标墩区放置。`
    : "请点击牌进行选择 (可多选)，再点击目标墩区进行放置。";

  return (
    <div className="human-player-board-container-v4"> {/* Versioning class name */}
      <div className="hpb-instruction-text-v4">{instructionText}</div>
      <div className="duns-layout-v4">
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
