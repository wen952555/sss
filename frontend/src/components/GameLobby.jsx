import React, { useState, useEffect } from 'react';
import './GameLobby.css';

const GameLobby = ({ onSelectGame, matchingStatus, onPractice }) => {
  const [announcement, setAnnouncement] = useState('');
  const [onlineCount, setOnlineCount] = useState(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch('/api/get_announcement.php');
        const data = await response.json();
        if (data.success && data.text) setAnnouncement(data.text);
      } catch (error) { /* ignore */ }
    };
    fetchAnnouncement();
    const intervalId = setInterval(fetchAnnouncement, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const resp = await fetch('/api/get_online_count.php');
        const data = await resp.json();
        if (data.success) setOnlineCount(data.onlineCount);
      } catch (err) { setOnlineCount(null); }
    };
    fetchOnlineCount();
    const intervalId = setInterval(fetchOnlineCount, 15000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1 className="lobby-title">游戏大厅</h1>
        <p className="lobby-subtitle">云端牌局，随心畅玩</p>
        <div style={{ marginTop: 8, fontSize: '1rem', color: '#00796b', fontWeight: 500 }}>
          当前在线人数：{onlineCount !== null ? onlineCount : '...'}
        </div>
      </header>

      {announcement && (
        <div className="announcement-banner">
          📢 {announcement}
        </div>
      )}

      <main className="game-card-grid">
        {/* 十三张卡片 */}
        <div className="game-card thirteen-bg">
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">经典十三张</h2>
              <p className="game-description">策略与运气的巅峰对决</p>
            </div>
            <div className="game-actions">
              <button className="btn btn-secondary"
                onClick={() => onSelectGame('thirteen', 'normal')}
                disabled={matchingStatus.thirteen}
              >
                {matchingStatus.thirteen ? '匹配中' : '普通场'}
              </button>
              <button className="btn btn-primary"
                onClick={() => onSelectGame('thirteen', 'double')}
                disabled={matchingStatus.thirteen}
              >
                {matchingStatus.thirteen ? '匹配中' : '翻倍场'}
              </button>
              <button className="btn btn-secondary"
                style={{ background: '#7ed6df', color: '#222' }}
                onClick={() => onPractice('thirteen', 3)}
                disabled={matchingStatus.thirteen}
              >
                试玩
              </button>
            </div>
          </div>
        </div>
        {/* 八张卡片 */}
        <div className="game-card eight-bg">
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">急速八张</h2>
              <p className="game-description">快节奏的竞技体验</p>
            </div>
            <div className="game-actions">
              <button className="btn btn-secondary"
                onClick={() => onSelectGame('eight', 'normal')}
                disabled={matchingStatus.eight}
              >
                {matchingStatus.eight ? '匹配中' : '普通场'}
              </button>
              <button className="btn btn-primary"
                onClick={() => onSelectGame('eight', 'special')}
                disabled={matchingStatus.eight}
              >
                {matchingStatus.eight ? '匹配中' : '独头场'}
              </button>
              <button className="btn btn-secondary"
                style={{ background: '#7ed6df', color: '#222' }}
                onClick={() => onPractice('eight', 5)}
                disabled={matchingStatus.eight}
              >
                试玩
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameLobby;