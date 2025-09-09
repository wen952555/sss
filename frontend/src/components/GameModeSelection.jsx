import React from 'react';
import './GameModeSelection.css';

const GameModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const gameTitle = gameType === 'thirteen' ? '经典十三张' : '急速八张';

  const thirteenCardModes = [
    { key: 'normal-2', title: '普通场-2分', desc: '基础积分对战' },
    { key: 'normal-5', title: '普通场-5分', desc: '进阶积分对战' },
    { key: 'double-2', title: '翻倍场-2分', desc: '刺激翻倍挑战' },
    { key: 'double-5', title: '翻倍场-5分', desc: '高额翻倍豪局' },
  ];

  const eightCardModes = [
    { key: 'eight-normal-5', title: '普通场-5分', desc: '基础积分对战' },
    { key: 'eight-normal-10', title: '普通场-10分', desc: '进阶积分对战' },
    { key: 'eight-dutou-5', title: '独头场-5分', desc: '特殊规则挑战' },
    { key: 'eight-dutou-10', title: '独头场-10分', desc: '高额独头豪局' },
  ];

  const modesToRender = gameType === 'thirteen' ? thirteenCardModes : eightCardModes;

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
