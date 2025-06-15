// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Ensure this CSS is updated

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v2 error-cell-v2"> {/* Updated class */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];
  const dunLabelMap = { tou: '头道', zhong: '中道', wei: '尾道' };

  return (
    <div className="player-result-cell-v2"> {/* Updated class */}
      <h4 className="player-name-modal-v2">{player.name}</h4> {/* Updated class */}
      <p className="player-total-score-modal-v2">本局得分: {player.score}</p> {/* Updated class */}
      
      <div className="all-duns-container-v2"> {/* New container for all duns */}
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          const dunEval = player.evalHands[dunKey];
          const dunHandName = dunEval?.name || "未评估";

          return (
            <div key={dunKey} className="single-dun-display-v2"> {/* Wrapper for each dun */}
              <div className="dun-info-text-v2"> {/* Text above cards */}
                <span className="dun-title-v2">{dunLabelMap[dunKey]}:</span>
                <span className="dun-type-v2">{dunHandName}</span>
              </div>
              <div className="dun-cards-stacked-v2"> {/* Card container for stacking */}
                {dunHand.map((card, index) => ( // Pass index for stacking style if needed by CSS
                  <Card 
                    key={card.id} 
                    card={card} 
                    // Inline style for stacking can be complex, prefer CSS :nth-child if possible
                    // style={{ zIndex: index }} // Simple z-index for DOM order stacking
                  />
                ))}
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

  const displayPlayers = [...players];
  // Pad with nulls if less than 4 players, only if grid expects 4 children
  // For stacked view, this padding might not be necessary if each player cell takes full width
  // Let's assume for now the grid layout will handle it.

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen">
        <h2 className="comparison-modal-title">本局比牌结果</h2>
        <div className="players-layout-modal-v2"> {/* Main layout for player cells */}
          {displayPlayers.map((player, index) =>
            player ? (
              <PlayerResultDisplay key={player.id || `player-${index}`} player={player} />
            ) : (
              // Only render empty cells if you absolutely need placeholders for a grid
              // For a single column stacked view, you might not render empty cells
              <div key={`empty-cell-${index}`} className="player-result-cell-v2 empty-player-cell-v2"></div>
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
