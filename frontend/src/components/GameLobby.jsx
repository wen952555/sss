// --- START OF FILE GameLobby.jsx (FINAL DB VERSION) ---

import React, { useState, useEffect } from 'react';
import './GameLobby.css';

const GameLobby = ({ onSelectGame, isMatching }) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch('/api/get_announcement.php');
        const data = await response.json();
        if (data.success && data.text) {
          setAnnouncement(data.text);
        }
      } catch (error) {
        console.error("Failed to fetch announcement:", error);
      }
    };
    
    fetchAnnouncement();
    const intervalId = setInterval(fetchAnnouncement, 30000); 
    return () => clearInterval(intervalId);
  }, []);

  const handleSelect = (gameType, gameMode) => {
    if (!isMatching) {
      onSelectGame(gameType, gameMode);
    }
  };

  return (
    <div className="lobby-container">
      {announcement && (
        <div className="announcement-banner">
          📢 公告: {announcement}
        </div>
      )}
      <h1 className="lobby-title">选择您的游戏</h1>
      
      <div className="game-selection-grid">
        <div className="game-card thirteen-card">
          <div className="game-card-content">
            <h2>经典十三张</h2>
            <p>考验策略与运气的巅峰对决，组合你的最强牌型！</p>
          </div>
          <div className="game-card-actions">
            <button className="action-btn trial" onClick={() => handleSelect('thirteen', 'normal')} disabled={isMatching}>
              {isMatching ? '匹配中...' : '普通场'}
            </button>
            <button className="action-btn official" onClick={() => handleSelect('thirteen', 'double')} disabled={isMatching}>
              {isMatching ? '匹配中...' : '翻倍场'}
            </button>
          </div>
        </div>
        <div className="game-card eight-card">
          <div className="game-card-content">
            <h2>急速八张</h2>
            <p>快节奏的竞技体验，三道牌型，快速分胜负！</p>
          </div>
          <div className="game-card-actions">
            <button className="action-btn trial" onClick={() => handleSelect('eight', 'normal')} disabled={isMatching}>
              {isMatching ? '匹配中...' : '普通场'}
            </button>
            <button className="action-btn official" onClick={() => handleSelect('eight', 'special')} disabled={isMatching}>
              {isMatching ? '匹配中...' : '独头场'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;

// --- END OF FILE GameLobby.jsx (FINAL DB VERSION) ---