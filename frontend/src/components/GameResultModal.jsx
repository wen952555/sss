import React from 'react';
import Card from './Card';
import './GameResultModal.css';

const StackedCards = ({ cards }) => {
  return (
    <div className="stacked-cards-row">
      {cards.map((card, index) => (
        <div key={`${card.suit}-${card.rank}-${index}`} className="card-container">
          <Card card={card} />
        </div>
      ))}
    </div>
  );
};

const GameResultModal = ({ result, onClose }) => {
  if (!result) return null;
  
  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');

  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content">
        <h2>比牌结果</h2>

        <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>

        <div className="player-hand-stack">
          <h3>你的牌</h3>
          <div className="stacked-cards-container">
            <StackedCards cards={result.playerHand.top} />
            <StackedCards cards={result.playerHand.middle} />
            <StackedCards cards={result.playerHand.bottom} />
          </div>
        </div>
        
        <div className="player-hand-stack">
          <h3>AI 的牌</h3>
          <div className="stacked-cards-container">
            <StackedCards cards={result.aiHand.top} />
            <StackedCards cards={result.aiHand.middle} />
            <StackedCards cards={result.aiHand.bottom} />
          </div>
        </div>
        
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;