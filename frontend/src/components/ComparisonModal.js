// frontend_react/src/components/ComparisonModal.js
import React from 'react';
import Card from './Card';
import './ComparisonModal.css';

const PlayerResultColumn = ({ player }) => {
  if (!player || !player.arranged) { // 添加检查
    return <div className="player-result-column error">玩家数据错误</div>;
  }
  return (
    <div className="player-result-column">
      <h4>{player.name}</h4>
      <p className="player-score">得分: {player.score}</p>
      <div className="dun-result">
        <strong>头道: {player.evalHands?.tou?.name || "未评估"}</strong>
        <div className="cards-compact">
          {(player.arranged.tou || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
      <div className="dun-result">
        <strong>中道: {player.evalHands?.zhong?.name || "未评估"}</strong>
        <div className="cards-compact">
          {(player.arranged.zhong || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
      <div className="dun-result">
        <strong>尾道: {player.evalHands?.wei?.name || "未评估"}</strong>
        <div className="cards-compact">
          {(player.arranged.wei || []).map(c => <Card key={c.id} card={c} />)}
        </div>
      </div>
    </div>
  );
};

const ComparisonModal = ({ results, players, onClose }) => {
  if (!results || !players) return null;

  return (
    <div className="modal-overlay-comparison">
      <div className="modal-content-comparison">
        <h2>本局比牌结果</h2>
        <div className="all-players-results-grid">
          {players.map(player => (
            <PlayerResultColumn key={player.id} player={player} />
          ))}
        </div>

        {results.details && results.details.length > 0 && (
          <div className="comparison-details-section">
            <h4>详细比对:</h4>
            <ul>
              {results.details.map((detail, index) => (
                <li key={index} className="comparison-detail-item">
                  <span><strong>{detail.playerA}</strong> vs <strong>{detail.playerB}</strong>:</span>
                  <span>头({detail.tou})</span>
                  <span>中({detail.zhong})</span>
                  <span>尾({detail.wei})</span>
                  <span> => {detail.playerA}: {detail.totalScoreA > 0 ? `+${detail.totalScoreA}` : detail.totalScoreA}, {detail.playerB}: {detail.totalScoreB > 0 ? `+${detail.totalScoreB}` : detail.totalScoreB}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={onClose} className="modal-close-button">
          开始新一局
        </button>
      </div>
    </div>
  );
};

export default ComparisonModal;
