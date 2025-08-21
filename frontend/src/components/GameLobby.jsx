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
    <div className="lobby-main-bg">
      <div className="lobby-header-bar">
        <div className="lobby-header-left">
          <img src="/vite.svg" alt="logo" className="lobby-logo"/>
          <div>
            <div className="lobby-title">牌局中心</div>
            <div className="lobby-online">在线人数：{onlineCount !== null ? onlineCount : '...'}</div>
          </div>
        </div>
        <div className="lobby-header-right">
          <span className="lobby-mini-hint">随时切换下方玩法！</span>
        </div>
      </div>

      {announcement && (
        <div className="lobby-announcement">
          <span role="img" aria-label="megaphone">📢</span> {announcement}
        </div>
      )}

      <div className="lobby-cards-area">
        {/* 十三张 */}
        <div className="lobby-card card-thirteen">
          <div className="card-bg-deco thirteen"></div>
          <div className="lobby-card-main">
            <div className="lobby-card-header">
              <div className="lobby-card-title">经典十三张</div>
              <div className="lobby-card-desc">策略与运气的巅峰对决</div>
            </div>
            <div className="lobby-card-actions">
              <button className="lobby-btn normal"
                onClick={() => onSelectGame('thirteen', 'normal')}
                disabled={matchingStatus.thirteen}
              >
                {matchingStatus.thirteen ? '匹配中' : '普通场'}
              </button>
              <button className="lobby-btn double"
                onClick={() => onSelectGame('thirteen', 'double')}
                disabled={matchingStatus.thirteen}
              >
                {matchingStatus.thirteen ? '匹配中' : '翻倍场'}
              </button>
              <button className="lobby-btn practice"
                onClick={() => onPractice('thirteen', 3)}
                disabled={matchingStatus.thirteen}
              >
                试玩
              </button>
            </div>
          </div>
        </div>
        {/* 八张 */}
        <div className="lobby-card card-eight">
          <div className="card-bg-deco eight"></div>
          <div className="lobby-card-main">
            <div className="lobby-card-header">
              <div className="lobby-card-title">急速八张</div>
              <div className="lobby-card-desc">快节奏的竞技体验</div>
            </div>
            <div className="lobby-card-actions">
              <button className="lobby-btn normal"
                onClick={() => onSelectGame('eight', 'normal')}
                disabled={matchingStatus.eight}
              >
                {matchingStatus.eight ? '匹配中' : '普通场'}
              </button>
              <button className="lobby-btn double"
                onClick={() => onSelectGame('eight', 'special')}
                disabled={matchingStatus.eight}
              >
                {matchingStatus.eight ? '匹配中' : '独头场'}
              </button>
              <button className="lobby-btn practice"
                onClick={() => onPractice('eight', 5)}
                disabled={matchingStatus.eight}
              >
                试玩
              </button>
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