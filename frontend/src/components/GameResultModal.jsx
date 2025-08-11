// --- START OF FILE GameResultModal.jsx (MULTI-PLAYER VERSION) ---

import React from 'react';
import Card from './Card';
import './GameResultModal.css';

const PlayerHandDisplay = ({ hand }) => {
  if (!hand || !hand.top || !hand.middle || !hand.bottom) return null;
  const lanes = [hand.top, hand.middle, hand.bottom];
  return (
    <div className="result-hand-container">
      {lanes.map((laneCards, idx) => (
        <div key={idx} className="result-cards-row">
          {laneCards && laneCards.map((card, cardIdx) => (
            <Card key={`${card.rank}-${card.suit}-${cardIdx}`} card={card} />
          ))}
        </div>
      ))}
    </div>
  );
};

const GameResultModal = ({ result, onClose }) => {
  if (!result || !result.players || result.players.length === 0) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content">
        <h3>比牌结果</h3>
        <div className="game-result-grid">
          {result.players.map((player, index) => {
            const score = player.score;
            const scoreColor = score > 0 ? '#27ae60' : (score < 0 ? '#c0392b' : '#34495e');
            return (
              <div key={index} className="game-result-grid-item">
                <div className="result-player-header">
                  <span className="result-player-name">
                    {player.name ? `玩家 ${player.name.slice(-4)}` : `玩家 ${index + 1}`}
                  </span>
                  <span className="result-player-score" style={{ color: scoreColor }}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                </div>
                <PlayerHandDisplay hand={player.hand} />
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;

// --- END OF FILE GameResultModal.jsx (MULTI-PLAYER VERSION) ---