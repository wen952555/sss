import React from 'react';
import Card from './Card';
import './GameResultModal.css';

// 辅助组件：渲染一个玩家的完整牌组（金字塔堆叠）
const PlayerHandDisplay = ({ hand }) => {
  // 将手牌按头、中、尾道分组
  const lanes = [hand.top, hand.middle, hand.bottom];

  // 计算每行牌需要的左内边距，以实现居中对齐的金字塔效果
  // 我们假设最长的一行（尾道）是基准
  const baseCardWidth = 70; // 估算的卡牌在结果弹窗中的宽度
  const baseLaneWidth = (hand.bottom.length * baseCardWidth);
  
  return (
    <div className="result-hand-container">
      {lanes.map((laneCards, index) => {
        // 计算当前行与最长行的卡牌数量差，以确定缩进
        const cardCountDifference = hand.bottom.length - laneCards.length;
        const paddingLeft = (cardCountDifference / 2) * baseCardWidth;

        return (
          <div 
            key={index} 
            className="result-cards-row" 
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {laneCards.map((card, cardIndex) => (
              <Card key={cardIndex} card={card} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

const GameResultModal = ({ result, onClose }) => {
  if (!result) return null;
  
  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');

  // 渲染顶部玩家状态栏（与游戏界面一致）
  const renderPlayerStatus = () => {
    // 假设 '玩家 2', '玩家 3' 是AI
    const aiPlayers = result.aiHand ? ['AI 玩家'] : [];
    if (Object.keys(result.aiEval || {}).length > 1) { // 简易判断是否多人
        aiPlayers.push('AI 玩家 2', 'AI 玩家 3');
    }

    return (
      <div className="modal-players-status-bar">
        <div className="modal-player-status-item you">
          <span>你</span>
        </div>
        {aiPlayers.map(name => (
          <div key={name} className="modal-player-status-item">
            <span>{name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content result-modal-content">
        {/* 模拟顶部的玩家状态栏和积分 */}
        <div className="modal-top-bar">
           <button className="modal-quit-btn" onClick={onClose}>退出</button>
           <div className="modal-title">比牌结果</div>
           <div className="modal-score-box">积分: 100</div>
        </div>
        
        {renderPlayerStatus()}

        <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>

        {/* 你的牌 */}
        <div className="player-hand-display-area">
          <h3 className="hand-title">你的牌</h3>
          <PlayerHandDisplay hand={result.playerHand} />
        </div>
        
        {/* AI的牌 */}
        <div className="player-hand-display-area">
          <h3 className="hand-title">AI的牌</h3>
          <PlayerHandDisplay hand={result.aiHand} />
        </div>
        
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;