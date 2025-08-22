import React from 'react';
import './ModeSelection.css';

const ModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const modes = {
    thirteen: [
      { key: 'normal', name: '普通场' },
      { key: 'double', name: '翻倍场' },
      { key: 'multiplayer', name: '多人场' },
    ],
    eight: [
      { key: 'normal', name: '普通场' },
      { key: 'special', name: '独头场' },
    ],
  };

  const gameModes = modes[gameType] || [];

  return (
    <div className="mode-selection-container">
      <button onClick={onBack} className="back-to-lobby-btn">
        &larr; 返回大厅
      </button>
      <h2 className="mode-selection-title">
        选择 {gameType === 'thirteen' ? '十三张' : '急速八张'} 游戏模式
      </h2>
      <div className="mode-grid">
        {gameModes.map(mode => (
          <div key={mode.key} className="mode-card" onClick={() => onSelectMode(gameType, mode.key)}>
            <div className="mode-card-name">{mode.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModeSelection;
