// --- START OF FILE GameLobby.jsx (NEW DESIGN) ---

import React, { useState, useEffect } from 'react';
import './GameLobby.css'; // 我们将彻底重写这个CSS文件

const GameLobby = ({ onSelectGame, isMatching }) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // 公告获取逻辑保持不变
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
      {/* 动态背景将在CSS中实现 */}
      <header className="lobby-header">
        <h1 className="lobby-title">游戏大厅</h1>
        <p className="lobby-subtitle">选择你的战场，开启荣耀之旅</p>
      </header>

      {announcement && (
        <div className="announcement-banner">
          📢 {announcement}
        </div>
      )}

      <main className="game-card-grid">
        {/* --- 十三张卡片 --- */}
        <div className="game-card thirteen-bg">
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">经典十三张</h2>
              <p className="game-description">策略与运气的巅峰对决</p>
            </div>
            <div className="game-actions">
              <button className="btn btn-secondary" onClick={() => handleSelect('thirteen', 'normal')} disabled={isMatching}>
                {isMatching ? '匹配中' : '普通场'}
              </button>
              <button className="btn btn-primary" onClick={() => handleSelect('thirteen', 'double')} disabled={isMatching}>
                {isMatching ? '匹配中' : '翻倍场'}
              </button>
            </div>
          </div>
        </div>

        {/* --- 八张卡片 --- */}
        <div className="game-card eight-bg">
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">急速八张</h2>
              <p className="game-description">快节奏的竞技体验</p>
            </div>
            <div className="game-actions">
              <button className="btn btn-secondary" onClick={() => handleSelect('eight', 'normal')} disabled={isMatching}>
                {isMatching ? '匹配中' : '普通场'}
              </button>
              <button className="btn btn-primary" onClick={() => handleSelect('eight', 'special')} disabled={isMatching}>
                {isMatching ? '匹配中' : '独头场'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameLobby;

// --- END OF FILE GameLobby.jsx (NEW DESIGN) ---