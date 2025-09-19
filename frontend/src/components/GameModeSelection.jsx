import React from 'react';
import './GameModeSelection.css';

const GameModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const gameTitles = {
    'thirteen': '2分场',
    'thirteen-5': '5分场',
  };
  const gameTitle = gameTitles[gameType] || '游戏'; // Fallback to '游戏'

  const sharedModes = [
    { key: '8-10', title: '10局场', desc: '快速对决' },
    { key: '8-20', title: '20局场', desc: '标准对决' },
    { key: '8-30', title: '30局场', desc: '耐力挑战' },
    { key: '8-50', title: '50局场', desc: '终极马拉松' },
  ];

  const modesToRender = sharedModes;

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
          >
            <div className="mode-card-left">
              <h2 className="mode-card-title">{mode.title}</h2>
              <p className="mode-card-description">{mode.desc}</p>
            </div>
            <div className="mode-card-right">
              <button className="join-button" onClick={() => onSelectMode(mode.key, 'join')}>加入</button>
              <button className="create-button" onClick={() => onSelectMode(mode.key, 'create')}>创建</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelection;
