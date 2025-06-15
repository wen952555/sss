// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css';

const PlayerResultDisplay = ({ player }) => {
  if (!player || !player.arranged || !player.evalHands) {
    return (
      <div className="player-result-cell-v7 error-cell-v7"> {/* Versioning class names */}
        <h4>{player?.name || '未知玩家'}</h4>
        <p>数据错误</p>
      </div>
    );
  }

  const dunOrder = ['tou', 'zhong', 'wei'];

  return (
    <div className="player-result-cell-v7">
      <div className="player-header-v7">
        <h4 className="player-name-modal-v7">{player.name}</h4>
        <span className="player-total-score-modal-v7">(得分: {player.score})</span>
      </div>
      
      <div className="all-duns-compact-v7">
        {dunOrder.map(dunKey => {
          const dunHand = player.arranged[dunKey] || [];
          return (
            <div key={dunKey} className="single-dun-stacked-cards-v7">
              {dunHand.map((card) => (
                <Card 
                  key={card.id} 
                  card={card} 
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
      <div className="comparison-modal-content-fullscreen-v7"> {/* Versioned */}
        {/* Title is removed */}
        {/* <h2 className="comparison-modal-title-v7">本局比牌结果</h2> */}
        
        <div className="players-comparison-area-v7"> {/* This area will take up more space */}
            <div className="player-column-v7">
                {finalPlayersToDisplay[0] ? <PlayerResultDisplay player={finalPlayersToDisplay[0]} /> : <div className="player-result-cell-v7 empty-player-cell-v7"></div>}
                {finalPlayersToDisplay[2] ? <PlayerResultDisplay player={finalPlayersToDisplay[2]} /> : <div className="player-result-cell-v7 empty-player-cell-v7"></div>}
            </div>
            <div className="player-column-v7">
                {finalPlayersToDisplay[1] ? <PlayerResultDisplay player={finalPlayersToDisplay[1]} /> : <div className="player-result-cell-v7 empty-player-cell-v7"></div>}
                {finalPlayersToDisplay[3] ? <PlayerResultDisplay player={finalPlayersToDisplay[3]} /> : <div className="player-result-cell-v7 empty-player-cell-v7"></div>}
            </div>
        </div>

        <div className="comparison-modal-footer-v7">
          <button onClick={onClose} className="continue-game-button-v7">
            继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;
