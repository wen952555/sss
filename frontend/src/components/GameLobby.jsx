import React, { useState, useEffect } from 'react';
import './GameLobby.css';

const GameLobby = ({ onSelectGameType, matchingStatus, user, onProfile, onLogout, onLoginClick }) => {
  const [onlineCount, setOnlineCount] = useState(null);

  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const resp = await fetch('/api/index.php?action=get_online_count');
        const data = await resp.json();
        if (data.success) setOnlineCount(data.onlineCount);
      } catch (err) { setOnlineCount(null); }
    };

    fetchOnlineCount();
    const intervalId = setInterval(fetchOnlineCount, 15000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (user) {
      const updateActivity = async () => {
        try {
          await fetch('/api/index.php?action=update_activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          });
        } catch (error) { /* ignore */ }
      };
      updateActivity();
      const intervalId = setInterval(updateActivity, 60000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const isMatching = matchingStatus.thirteen || matchingStatus.eight;

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <div className="lobby-header-top-row">
          {user ? (
            <>
              <button className="header-btn profile-btn" onClick={onProfile}>我的资料</button>
              <button className="header-btn logout-btn" onClick={onLogout}>退出登录</button>
            </>
          ) : (
            <button className="header-btn login-btn" onClick={onLoginClick}>注册/登录</button>
          )}
        </div>
        <h1 className="lobby-title">游戏大厅</h1>
        <div style={{ marginTop: 8, fontSize: '1rem', color: '#00796b', fontWeight: 500 }}>
          当前在线人数：{onlineCount !== null ? onlineCount : '...'}
        </div>
      </header>

      <main className="game-card-grid">
        {/* 十三张卡片 */}
        <div
          className={`game-card thirteen-bg ${isMatching ? 'disabled' : ''}`}
          onClick={() => !isMatching && onSelectGameType('thirteen')}
        >
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">经典十三张</h2>
              <p className="game-description">策略与运气的巅峰对决</p>
            </div>
            {matchingStatus.thirteen && <div className="matching-indicator">匹配中...</div>}
          </div>
        </div>
        {/* 5分场 */}
        <div
          className={`game-card eight-bg ${isMatching ? 'disabled' : ''}`}
          onClick={() => !isMatching && onSelectGameType('eight')}
        >
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">5分场</h2>
              <p className="game-description">多人竞技场</p>
            </div>
            {matchingStatus.eight && <div className="matching-indicator">匹配中...</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameLobby;