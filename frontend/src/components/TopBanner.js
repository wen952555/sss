// frontend/src/components/TopBanner.js
import React from 'react';
import AIPlayerDisplay from './AIPlayerDisplay'; // 用于显示AI

// 新增：一个简单的组件用于显示真人玩家信息在横幅中
const HumanPlayerBannerDisplay = ({ player }) => {
  if (!player) return null;
  return (
    <div className="human-player-banner-display">
      <div className="human-player-avatar">你</div>
      <div className="human-player-info">
        <div className="human-player-name">{player.name}</div>
        {/* 状态可以根据需要添加，例如 "理牌中" 或 "已确认" */}
        {/* <div className="human-player-status">状态...</div> */}
        <div className="human-player-score-container">
          {typeof player.score === 'number' && (
            <span className={`human-player-total-score ${player.score > 0 ? 'positive' : player.score < 0 ? 'negative' : ''}`}>
              总分: {player.score > 0 ? '+' : ''}{player.score}
            </span>
          )}
          {typeof player.roundScore === 'number' && player.isArranged && // 假设比牌后才有 roundScore
            <span className={`human-player-round-score ${player.roundScore > 0 ? 'positive' : player.roundScore < 0 ? 'negative' : ''}`}>
              (本局: {player.roundScore > 0 ? '+' : ''}{player.roundScore})
            </span>
          }
        </div>
      </div>
    </div>
  );
};


const TopBanner = ({ humanPlayer, aiPlayers, handEvaluator }) => {
  return (
    <div className="top-banner-container">
      {/* 真人玩家显示在最左边或最右边，或根据设计 */}
      {humanPlayer && <HumanPlayerBannerDisplay player={humanPlayer} />}
      
      {aiPlayers && aiPlayers.map(aiPlayer => (
        <AIPlayerDisplay 
          key={aiPlayer.id} 
          player={aiPlayer} 
          // handEvaluator 不再直接需要，因为 AIPlayerDisplay 简化了
        />
      ))}
      {/* 如果没有AI玩家，可以显示一些占位符或提示 */}
      {(!aiPlayers || aiPlayers.length === 0) && !humanPlayer && (
        <div className="top-banner-empty-message">等待玩家数据...</div>
      )}
    </div>
  );
};

export default TopBanner;
