// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Ensure this CSS is updated

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v3 error-cell-v3"> {/* Updated class */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];
  const dunLabelMap = { tou: '头道', zhong: '中道', wei: '尾道' };

  return (
    <div className="player-result-cell-v3"> {/* Updated class */}
      <h4 className="player-name-modal-v3">{player.name}</h4> {/* Updated class */}
      <p className="player-total-score-modal-v3">本局得分: {player.score}</p> {/* Updated class */}
      
      <div className="all-duns-container-v3"> {/* Container for all duns of a player */}
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          const dunEval = player.evalHands[dunKey];
          const dunHandName = dunEval?.name || "未评估";

          return (
            <div key={dunKey} className="single-dun-layout-v3"> {/* Main layout for one dun: cards + text info */}
              <div className="dun-cards-stacked-v3"> {/* Card container for stacking */}
                {dunHand.map((card) => (
                  <Card 
                    key={card.id} 
                    card={card} 
                  />
                ))}
              </div>
              <div className="dun-text-info-v3"> {/* Text on the right of cards */}
                <span className="dun-title-v3">{dunLabelMap[dunKey]}:</span>
                <span className="dun-type-v3">{dunHandName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonModal = ({ players, onClose }) => {
  if (!players || players.length === 0) return null;

  // Pad with nulls for 2x2 grid if less than 4 players
  const displayPlayers = [...players];
  while (displayPlayers.length < 4 && displayPlayers.length > 0) {
    displayPlayers.push(null); 
  }


  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen">
        <h2 className="comparison-modal-title">本局比牌结果</h2>
        <div className="players-grid-2x2-v3"> {/* Main 2x2 grid layout for player cells */}
          {displayPlayers.slice(0, 4).map((player, index) => // Only take up to 4 for 2x2
            player ? (
              <PlayerResultDisplay key={player.id || `player-${index}`} player={player} />
            ) : (
              <div key={`empty-cell-${index}`} className="player-result-cell-v3 empty-player-cell-v3"></div>
            )
          )}
        </div>
        <div className="comparison-modal-footer">
          <button onClick={onClose} className="continue-game-button">
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
