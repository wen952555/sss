import React from 'react';
import Card from './Card';
import './GameResultModal.css';

// 辅助组件：渲染一个玩家的完整牌组（金字塔堆叠）
const PlayerHandDisplay = ({ hand }) => {
  if (!hand || !hand.top || !hand.middle || !hand.bottom) {
    return null; // 防止数据不完整时报错
  }

  const lanes = [hand.top, hand.middle, hand.bottom];

  // 基础卡牌宽度估算（可根据实际效果微调）
  const baseCardWidth = 65;
  const baseLaneWidth = hand.bottom.length * baseCardWidth;

  return (
    <div className="result-hand-container">
      {lanes.map((laneCards, index) => {
        if (!laneCards) return null; // 再次检查，防止某一道为空
        
        // 动态计算内边距以实现金字塔效果
        const cardCountDifference = hand.bottom.length - laneCards.length;
        const paddingLeft = (cardCountDifference / 2) * baseCardWidth;

        return (
          <div 
            key={index} 
            className="result-cards-row" 
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {laneCards.map((card, cardIndex) => (
              <Card key={`${card.suit}-${card.rank}-${cardIndex}`} card={card} />
            ))}
          </div>
        );
      })}
    </div>
  );
};

// 辅助组件：动态渲染玩家状态布局
const PlayerStatusDisplay = ({ gameType }) => {
  // 根据游戏类型决定布局
  if (gameType === 'thirteen') {
    // 十三张：2x2 田字格布局
    return (
      <div className="players-grid-modal">
        <div className="player-box-modal you"><span>你</span></div>
        <div className="player-box-modal"><span>玩家 2</span></div>
        <div className="player-box-modal"><span>玩家 3</span></div>
        <div className="player-box-modal"><span>玩家 4</span></div>
      </div>
    );
  } else if (gameType === 'eight') {
    // 八张：2+2+2 紧凑布局
    return (
      <div className="eight-game-players-modal">
        <div className="player-group-modal">
          <div className="player-status-item-modal you"><span>你</span></div>
          <div className="player-status-item-modal"><span>玩家 2</span></div>
        </div>
        <div className="player-group-modal">
          <div className="player-status-item-modal"><span>玩家 3</span></div>
          <div className="player-status-item-modal"><span>玩家 4</span></div>
        </div>
      </div>
    );
  }
  return null; // 默认不显示
};


const GameResultModal = ({ result, onClose }) => {
  if (!result || !result.playerHand) return null;

  const totalScoreText = result.score > 0 ? `总分: +${result.score}` : `总分: ${result.score}`;
  const totalScoreClass = result.score > 0 ? 'win' : (result.score < 0 ? 'loss' : 'tie');
  
  // 从牌组数量判断游戏类型
  const gameType = result.playerHand.top.length === 3 ? 'thirteen' : 'eight';

  return (
    <div className="modal-backdrop fullscreen-modal">
      <div className="modal-content result-modal-panel">
        <div className="modal-top-bar">
           <button className="modal-quit-btn" onClick={onClose}>退出</button>
           <div className="modal-title">比牌结果</div>
           <div className="modal-score-box">积分: 100</div>
        </div>
        
        {/* 动态渲染玩家布局 */}
        <PlayerStatusDisplay gameType={gameType} />

        <div className={`total-score ${totalScoreClass}`}>{totalScoreText}</div>

        <div className="result-hand-wrapper">
          <PlayerHandDisplay hand={result.playerHand} />
          <PlayerHandDisplay hand={result.aiHand} />
        </div>
        
        <button onClick={onClose} className="close-button">返回大厅</button>
      </div>
    </div>
  );
};

export default GameResultModal;