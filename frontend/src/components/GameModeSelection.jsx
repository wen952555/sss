import React from 'react';
import './GameModeSelection.css';

const GameModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const gameTitle = gameType === 'thirteen' ? '经典十三张' : '急速八张';

  return (
    <div className="mode-selection-container">
      <button className="back-button" onClick={onBack}>
        &larr; 返回大厅
      </button>
      <h1 className="mode-selection-title">{gameTitle}</h1>
      <p className="mode-selection-subtitle">请选择游戏模式</p>
      <div className="mode-options">
        <div className="mode-card" onClick={() => onSelectMode('normal')}>
          <h2 className="mode-card-title">普通场</h2>
          <p className="mode-card-description">标准积分，休闲娱乐</p>
        </div>
        <div className="mode-card" onClick={() => onSelectMode('double')}>
          <h2 className="mode-card-title">翻倍场</h2>
          <p className="mode-card-description">积分翻倍，心跳加速</p>
        </div>
        <div className="mode-card" onClick={() => onSelectMode('multiplayer')}>
          <h2 className="mode-card-title">多人场</h2>
          <p className="mode-card-description">与更多玩家同场竞技</p>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelection;
