import React from 'react';
import './GameModeSelection.css';

const GameModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const gameTitle = gameType === 'thirteen' ? '经典十三张' : '5分场';

  const thirteenCardModes = [
    { key: 'normal-2', title: '普通场-2分', desc: '基础积分对战' },
    { key: 'normal-5', title: '普通场-5分', desc: '进阶积分对战' },
    { key: 'double-2', title: '翻倍场-2分', desc: '刺激翻倍挑战' },
    { key: 'double-5', title: '翻倍场-5分', desc: '高额翻倍豪局' },
  ];

  const fivePointModes = [
    { key: '4-normal', title: '4人普通场', desc: '标准4人对局' },
    { key: '4-double', title: '4人翻倍场', desc: '4人刺激挑战' },
    { key: '8-normal', title: '8人普通场', desc: '标准8人对局' },
    { key: '8-double', title: '8人翻倍场', desc: '8人终极对决' },
  ];

  const modesToRender = gameType === 'thirteen' ? thirteenCardModes : fivePointModes;

  return (
    <div className="mode-selection-container">
      <button className="back-button" onClick={onBack}>
        &larr; 返回大厅
      </button>
      <h1 className="mode-selection-title">{gameTitle}</h1>
      <p className="mode-selection-subtitle">请选择游戏模式</p>
      <div className="mode-options">
        {modesToRender.map(mode => (
          <div
            key={mode.key}
            className={`mode-card ${mode.className || ''}`}
            onClick={() => onSelectMode(mode.key)}
          >
            <h2 className="mode-card-title">{mode.title}</h2>
            <p className="mode-card-description">{mode.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelection;
