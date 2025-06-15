// frontend_react/src/components/HumanPlayerBoard.js
import React from 'react';
import Card from './Card';
import { evaluateHand as evaluateHandLogic } from '../logic/cardUtils';
import './HumanPlayerBoard.css'; // Ensure this CSS is updated

const DunDisplay = ({ dunName, label, cardsInDun, expectedSize, onDunAreaClick, onCardClickInDun, selectedCardsInfo }) => {
  const handEvaluation = cardsInDun.length === expectedSize ? evaluateHandLogic(cardsInDun) : null;
  const cardTypeDisplay = handEvaluation ? handEvaluation.name : (cardsInDun.length > 0 ? "组合中..." : "空");

  // Combine label and card type for background display
  const backgroundText = `${label}${cardsInDun.length === expectedSize || cardsInDun.length === 0 ? ` - ${cardTypeDisplay}` : ""}`;


  return (
    // Removed .dun-row-hpb wrapper for a flatter structure if not needed, or keep if it helps with overall page layout
    // For this specific change, focusing on .dun-cards-area-hpb becoming the main container for a dun
    <div className="dun-cards-area-hpb with-background-text" onClick={() => onDunAreaClick(dunName)} data-background-text={backgroundText}>
      {/* Background text will be applied via CSS pseudo-element ::before */}
      {cardsInDun.map((card) => {
        const isSelected = selectedCardsInfo.some(info => info.card.id === card.id);
        return (
          <Card
            key={card.id}
            card={card}
            onClick={(e) => {
              e.stopPropagation(); // Prevent dun area click when clicking a card
              onCardClickInDun(card, dunName);
            }}
            style={{
              border: isSelected ? '3px solid dodgerblue' : '1px solid #ccc',
              transform: isSelected ? 'scale(1.05)' : 'none',
              opacity: isSelected ? 0.75 : 1,
              zIndex: 1, // Ensure cards are above the background text
              position: 'relative' // Needed for z-index to work against pseudo-elements
            }}
          />
        );
      })}
      {/* Optional: Render placeholders only if the dun is completely empty AND no cards are selected for placement,
          otherwise, let the background text serve as the "empty" state visual.
          For simplicity and to match the "cards cover text" idea, we might not need explicit placeholders here
          if the background text is clear enough. The image shows placeholders when empty.
      */}
      {cardsInDun.length === 0 && Array(expectedSize).fill(null).map((_, i) => (
           <div key={`placeholder-${dunName}-${i}`} className="card-placeholder-slot-visual-only"></div>
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
    <div className="human-player-board-container-v3"> {/* Versioning class name */}
      <div className="hpb-instruction-text-v3">{instructionText}</div>
      <div className="duns-layout-v3">
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
