// frontend/src/components/TopBanner.js
import React from 'react';
import AIPlayerDisplay from './AIPlayerDisplay'; // 用于显示AI

// 真人玩家信息块，现在直接在 TopBanner 内部处理，而不是独立的 HumanPlayerBannerDisplay 组件
const HumanPlayerInfoBlock = ({ player }) => {
  if (!player) return null;
  return (
    <div className="player-banner-item human-player-banner-item"> {/* 使用通用和特定类名 */}
      <div className="player-avatar-banner human-player-avatar">{player.name.substring(0,1)}</div> {/* 简化头像 */}
      <div className="player-info-banner">
        <div className="player-name-banner">{player.name}</div>
        {/* 状态可以根据需要添加 */}
        <div className="player-score-container-banner">
          {typeof player.score === 'number' && (
            <span className={`player-total-score-banner ${player.score > 0 ? 'positive' : player.score < 0 ? 'negative' : ''}`}>
              总分: {player.score > 0 ? '+' : ''}{player.score}
            </span>
          )}
          {typeof player.roundScore === 'number' && player.isArranged &&
            <span className={`player-round-score-banner ${player.roundScore > 0 ? 'positive' : player.roundScore < 0 ? 'negative' : ''}`}>
              (本局: {player.roundScore > 0 ? '+' : ''}{player.roundScore})
            </span>
          }
        </div>
      </div>
    </div>
  );
};

const TopBanner = ({ humanPlayer, aiPlayers }) => { // 移除了 handEvaluator prop
  return (
    <div className="top-banner-container">
      {humanPlayer && <HumanPlayerInfoBlock player={humanPlayer} />}
      
      {aiPlayers && aiPlayers.map(aiPlayer => (
        <AIPlayerDisplay 
          key={aiPlayer.id} 
          player={aiPlayer} 
        />
      ))}
      {(!aiPlayers || aiPlayers.length === 0) && !humanPlayer && (
        <div className="top-banner-empty-message">等待玩家数据...</div>
      )}
    </div>
  );
};

export default TopBanner;
