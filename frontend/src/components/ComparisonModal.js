// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css'; // Ensure this CSS is updated

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v5 error-cell-v5"> {/* Versioning class names */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];
  // Dun labels are not shown in this very compact view as per the image

  return (
    <div className="player-result-cell-v5">
      <h4 className="player-name-modal-v5">{player.name}</h4>
      <p className="player-total-score-modal-v5">本局得分: {player.score}</p>
      
      <div className="all-duns-compact-v5">
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          //牌型名称也不显示，只显示牌
          return (
            <div key={dunKey} className="single-dun-stacked-cards-v5">
              {dunHand.map((card, index) => ( // index might be useful for dynamic stacking if not using pure CSS nth-child
                <Card 
                  key={card.id} 
                  card={card}
                  // style={{ zIndex: dunHand.length - index }} // Ensure cards stack correctly (later cards on top)
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ComparisonModal = ({ players, onClose }) => {
  if (!players || players.length === 0) return null;

  const PADDING_PLAYER_COUNT = 4;
  const displayablePlayers = [...players];
  while (displayablePlayers.length < PADDING_PLAYER_COUNT && displayablePlayers.length > 0) {
    displayablePlayers.push(null);
  }
  const finalPlayersToDisplay = displayablePlayers.slice(0, PADDING_PLAYER_COUNT);

  return (
    <div className="comparison-modal-overlay-fullscreen">
      <div className="comparison-modal-content-fullscreen-v5"> {/* Versioned class */}
        <h2 className="comparison-modal-title-v5">本局比牌结果</h2> {/* Versioned class */}
        
        <div className="players-comparison-area-v5">
            <div className="player-column-v5">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v5 empty-player-cell-v5"></div>}
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v5 empty-player-cell-v5"></div>} 
                {/* Swapped AI1 and AI2 for typical reading order: Player, AI2, AI1, AI3 in a Z or N pattern */}
            </div>
            <div className="player-column-v5">
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v5 empty-player-cell-v5"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v5 empty-player-cell-v5"></div>}
            </div>
        </div>

        <div className="comparison-modal-footer-v5"> {/* Versioned class */}
          <button onClick={onClose} className="continue-game-button-v5"> {/* Versioned class */}
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
