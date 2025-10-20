import React, { useState, useEffect } from 'react';
import './GameLobby.css';

const GameLobby = ({ onSelectGameType, matchingStatus, user, onProfile, onLogout, onLoginClick, onShowRules, roomCounts }) => {
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
      const intervalId = setInterval(updateActivity, 1000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

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
          <button className="header-btn rules-btn" onClick={onShowRules}>游戏规则</button>
        </div>
      </header>

      <main className="game-card-grid">
        {/* 4-Player Game */}
        <div
          className={`game-card thirteen-bg ${matchingStatus.thirteen ? 'disabled' : ''}`}
          onClick={() => !matchingStatus.thirteen && onSelectGameType('thirteen')}
        >
          <div className="game-card-overlay">
            <div className="game-content">
              <h2 className="game-title">4人场</h2>
              <p className="game-description">经典模式对局</p>
            </div>
            <div className="room-count">
              {roomCounts && roomCounts[4] !== undefined ? `${roomCounts[4]}人` : '...'}
            </div>
            {matchingStatus.thirteen && <div className="matching-indicator">匹配中...</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GameLobby;
