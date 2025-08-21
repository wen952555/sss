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
      } catch (error) {}
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
    <div className="lobby-root">
      <div className="lobby-header">
        <img src="/vite.svg" alt="logo" className="lobby-logo" />
        <div className="lobby-header-info">
          <h1 className="lobby-title">牌局中心</h1>
          <div className="lobby-online">在线人数 <span>{onlineCount !== null ? onlineCount : '-'}</span></div>
        </div>
      </div>

      {announcement && (
        <div className="lobby-announcement">
          <span role="img" aria-label="megaphone">📢</span> {announcement}
        </div>
      )}

      <div className="lobby-game-list">
        {/* 十三张 */}
        <div className="game-card thirteen">
          <div className="game-card-bg thirteen"></div>
          <div className="game-card-main">
            <div className="game-card-title-area">
              <div className="game-card-title">经典十三张</div>
              <div className="game-card-desc">策略与运气的巅峰对决</div>
            </div>
            <div className="game-card-actions">
              <button className="game-btn primary"
                onClick={() => onSelectGame('thirteen', 'normal')}
                disabled={matchingStatus.thirteen}
              >普通场</button>
              <button className="game-btn secondary"
                onClick={() => onSelectGame('thirteen', 'double')}
                disabled={matchingStatus.thirteen}
              >翻倍场</button>
              <button className="game-btn ghost"
                onClick={() => onPractice('thirteen', 3)}
                disabled={matchingStatus.thirteen}
              >试玩</button>
            </div>
          </div>
        </div>
        {/* 八张 */}
        <div className="game-card eight">
          <div className="game-card-bg eight"></div>
          <div className="game-card-main">
            <div className="game-card-title-area">
              <div className="game-card-title">急速八张</div>
              <div className="game-card-desc">快节奏的竞技体验</div>
            </div>
            <div className="game-card-actions">
              <button className="game-btn primary"
                onClick={() => onSelectGame('eight', 'normal')}
                disabled={matchingStatus.eight}
              >普通场</button>
              <button className="game-btn secondary"
                onClick={() => onSelectGame('eight', 'special')}
                disabled={matchingStatus.eight}
              >独头场</button>
              <button className="game-btn ghost"
                onClick={() => onPractice('eight', 5)}
                disabled={matchingStatus.eight}
              >试玩</button>
            </div>
          </div>
        </div>
      </div>

      <footer className="lobby-footer">
        <span>© 2025 牌局中心</span>
        <span>wen9521</span>
      </footer>
    </div>
  );
};

export default GameLobby;