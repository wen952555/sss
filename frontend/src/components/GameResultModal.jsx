import React from 'react';
import './GameResultModal.css';

const CARD_HEIGHT = 125; // Adjusted for better fit
const CARD_WIDTH = Math.round(CARD_HEIGHT * 46 / 66);

// Helper function to render a player's cards for one lane
const renderPaiDunCards = (cards) => {
  if (!cards || cards.length === 0) {
    return <div className="lane-placeholder"></div>;
  }

  const overlap = Math.floor(CARD_WIDTH / 3);
  const totalWidth = CARD_WIDTH + (cards.length - 1) * overlap;

  return (
    <div className="card-lane" style={{ width: totalWidth, height: CARD_HEIGHT }}>
      {cards.map((card, idx) => (
        <img
          key={card}
          src={`/cards/${card}.svg`}
          alt={card}
          className="card-img"
          style={{
            left: idx * overlap,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
          draggable={false}
        />
      ))}
    </div>
  );
};

const GameResultModal = ({ show, players, scores, foulStates, onClose }) => {
  if (!show) {
    return null;
  }

  // Expects players to be an array of objects with:
  // { name: string, head: string[], middle: string[], tail: string[] }
  // scores: number[]
  // foulStates: boolean[]

  return (
    <div className="modal-backdrop-transparent">
      <div className="result-modal-content">
        <button className="close-button-simple" onClick={onClose}>×</button>
        <div className="results-grid">
          {players.map((player, i) => (
            <div key={i} className="player-result-box">
              <div className={`player-name ${i === 0 ? 'me' : 'opponent'}`}>
                {player.name}
                {foulStates[i] && <span className="foul-indicator">（倒水）</span>}
                <span className="player-score">（{scores[i]}分）</span>
              </div>
              <div className="player-hands-grid">
                {renderPaiDunCards(player.head)}
                {renderPaiDunCards(player.middle)}
                {renderPaiDunCards(player.tail)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameResultModal;
