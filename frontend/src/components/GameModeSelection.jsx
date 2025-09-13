import React, { useState, useEffect } from 'react';
import './GameModeSelection.css';

const GameModeSelection = ({ gameType, onSelectMode, onBack }) => {
  const [gameModeCounts, setGameModeCounts] = useState({});

  useEffect(() => {
    const fetchCounts = () => {
      fetch('/api/index.php?action=get_online_count')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.gameModeCounts) {
            setGameModeCounts(data.gameModeCounts);
          }
        })
        .catch(console.error);
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const gameTitles = {
    'thirteen': '2分场',
    'thirteen-5': '5分场',
  };
  const gameTitle = gameTitles[gameType] || '游戏'; // Fallback to '游戏'

  const sharedModes = [
    { key: '4-normal', title: '4人普通场', desc: '标准4人对局' },
    { key: '4-double', title: '4人翻倍场', desc: '4人刺激挑战' },
    { key: '8-normal', title: '8人普通场', desc: '标准8人对局' },
    { key: '8-double', title: '8人翻倍场', desc: '8人终极对决' },
  ];

  const modesToRender = sharedModes;

  const getPlayerCount = (modeKey) => {
    const [players, type] = modeKey.split('-');
    const maxPlayers = parseInt(players, 10);
    const fullKey = `${gameType}-${players}-${type}`;
    const currentPlayers = gameModeCounts[fullKey] || 0;

    // If the room is full, the next player will create a new room, so show 0.
    if (currentPlayers >= maxPlayers) {
      return 0;
    }

    return currentPlayers;
  };

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
            <div className="player-count">
              <span className="player-count-icon">👥</span>
              <span>{getPlayerCount(mode.key)} 人</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelection;
