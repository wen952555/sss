import React from 'react';
import './ModeSelection.css';

const ModeSelection = ({ gameType, onSelectMode, onBack, roomCounts }) => {
  const modes = [
    { id: '10-rounds', name: '10局场', playerCount: 8 },
    { id: '20-rounds', name: '20局场', playerCount: 8 },
    { id: '30-rounds', name: '30局场', playerCount: 8 },
  ];

  return (
    <div className="mode-selection-container">
      <header className="mode-selection-header">
        <button className="back-button" onClick={onBack}>
          &larr; 返回大厅
        </button>
        <h1 className="mode-selection-title">{gameType === 'thirteen' ? '2分场' : '5分场'}</h1>
      </header>
      <main className="mode-card-grid">
        {modes.map(mode => (
          <div className="mode-card" key={mode.id}>
            <div className="mode-card-content">
              <h2 className="mode-name">{mode.name}</h2>
              <p className="room-info">
                房间: {roomCounts[mode.playerCount] || 0} / 10
              </p>
            </div>
            <div className="mode-card-actions">
              <button
                className="join-button"
                onClick={() => onSelectMode(mode.playerCount, 'join')}
              >
                加入 ({roomCounts[mode.playerCount] || 0}/8)
              </button>
              <button
                className="create-button"
                onClick={() => onSelectMode(mode.playerCount, 'create')}
              >
                创建
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default ModeSelection;