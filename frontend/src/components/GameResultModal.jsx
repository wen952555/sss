// --- START OF FILE frontend/src/components/GameResultModal.jsx ---

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
  if (!result || !result.players) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content">
        <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#1a2a6c', marginBottom: '10px' }}>
          比牌结果
        </div>
        <div className="game-result-grid">
          {result.players.map((player, idx) => {
            const score = result.scores[idx];
            const scoreColor = score > 0 ? '#27ae60' : (score < 0 ? '#c0392b' : '#34495e');

            return (
              <div className="game-result-grid-item" key={player.name}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
                  {player.name}
                  {player.name !== '你' && score !== null && (
                    <span style={{ color: scoreColor, marginLeft: '10px' }}>
                      {score > 0 ? `+${score}` : score}
                    </span>
                  )}
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

// --- END OF FILE frontend/src/components/GameResultModal.jsx ---