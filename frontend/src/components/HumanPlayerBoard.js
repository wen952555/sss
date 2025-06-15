// frontend_react/src/components/HumanPlayerBoard.js
import React from 'react';
import Card from './Card';
import { evaluateHand as evaluateHandLogic } from '../logic/cardUtils';
import './HumanPlayerBoard.css';

const DunDisplay = ({ dunName, label, cardsInDun, expectedSize, onDunAreaClick, onCardClickInDun, selectedCardInfo }) => {
  const handEvaluation = cardsInDun.length === expectedSize ? evaluateHandLogic(cardsInDun) : null;
  const cardTypeDisplay = handEvaluation ? handEvaluation.name : (cardsInDun.length > 0 ? "组合中..." : "空");

  return (
    <div className="dun-row-hpb"> {/* Added -hpb suffix to avoid conflict with other .dun-row if any */}
      <div className="dun-label-container-hpb">
        <div className="dun-label-hpb">{label}</div>
        <div className="dun-type-display-hpb">{cardTypeDisplay}</div>
      </div>
      <div className="dun-cards-area-hpb" onClick={() => onDunAreaClick(dunName)}>
        {cardsInDun.map((card) => (
          <Card
            key={card.id}
            card={card}
            onClick={(e) => {
              e.stopPropagation(); // Prevent dun area click when clicking a card
              onCardClickInDun(card, dunName);
            }}
            style={{
              border: selectedCardInfo?.card.id === card.id && selectedCardInfo?.fromDun === dunName ? '3px solid dodgerblue' : '1px solid #ccc',
              transform: selectedCardInfo?.card.id === card.id && selectedCardInfo?.fromDun === dunName ? 'scale(1.05)' : 'none',
            }}
          />
        ))}
        {/* Placeholders are dynamic based on cards in dun, no fixed placeholders needed if cards just pile up */}
        {cardsInDun.length === 0 && Array(expectedSize).fill(null).map((_, i) => (
             <div key={`placeholder-${dunName}-${i}`} className="card-placeholder-slot-hpb"></div>
        ))}

      </div>
    </div>
  );
};

const HumanPlayerBoard = ({
  arrangedHand, // { tou: Card[], zhong: Card[], wei: Card[] } - these contain ALL 13 cards
  selectedCardInfo, // { card: CardObject, fromDun: string }
  onCardClick,      // (card, dunName) => void
  onDunClick        // (dunName) => void - when clicking the dun area itself
}) => {

  // Initial instruction text (could be dynamic based on game state)
  const instructionText = selectedCardInfo
    ? `已选择 ${selectedCardInfo.card.name} (来自${selectedCardInfo.fromDun === 'tou' ? '头道' : selectedCardInfo.fromDun === 'zhong' ? '中道' : '尾道'})。请点击目标墩区放置。`
    : "请点击牌进行选择，再点击目标墩区进行放置。";

  return (
    <div className="human-player-board-container-new">
      <div className="hpb-instruction-text">{instructionText}</div>
      <div className="duns-layout-hpb">
        <DunDisplay
          dunName="tou"
          label="头道"
          cardsInDun={arrangedHand.tou || []}
          expectedSize={3} // Still useful for displaying牌型
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardInfo={selectedCardInfo}
        />
        <DunDisplay
          dunName="zhong"
          label="中道"
          cardsInDun={arrangedHand.zhong || []}
          expectedSize={5}
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardInfo={selectedCardInfo}
        />
        <DunDisplay
          dunName="wei"
          label="尾道"
          cardsInDun={arrangedHand.wei || []}
          expectedSize={5}
          onDunAreaClick={onDunClick}
          onCardClickInDun={onCardClick}
          selectedCardInfo={selectedCardInfo}
        />
      </div>
    </div>
  );
};

export default HumanPlayerBoard;
