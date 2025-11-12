import React, { useState, useEffect } from 'react';

const Lobby = ({ onJoinGame, matching, selectedScore, user, onBack }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer;
    if (matching) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [matching]);

  const getScoreFieldInfo = (scoreType) => {
    const fields = {
      2: {
        title: '🎯 2分场',
        description: '新手场 · 轻松上手',
        color: 'linear-gradient(135deg, #27ae60, #2ecc71)',
        textColor: '#27ae60',
        icon: '🎯'
      },
      5: {
        title: '⚡ 5分场',
        description: '进阶场 · 策略对决',
        color: 'linear-gradient(135deg, #3498db, #2980b9)',
        textColor: '#3498db',
        icon: '⚡'
      },
      10: {
        title: '🔥 10分场',
        description: '高手场 · 巅峰对决',
        color: 'linear-gradient(135deg, #e74c3c, #c0392b)',
        textColor: '#e74c3c',
        icon: '🔥'
      }
    };
    return fields[scoreType] || fields[2];
  };

  if (matching) {
    const fieldInfo = getScoreFieldInfo(selectedScore);

    return (
      <div className="lobby matching-view">
        <div
          className="matching-card"
          style={{ background: fieldInfo.color }}
        >
          <div className="matching-spinner"></div>
          <h2>匹配中...</h2>
          <p>正在为您寻找对手</p>
          <div className="countdown">
            {countdown}秒后进入游戏
          </div>
          <div className="field-info">
            当前场次：{fieldInfo.title}
          </div>
          <button 
            className="cancel-match-btn"
            onClick={() => onBack && onBack()}
          >
            取消匹配
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h2>🎮 游戏大厅</h2>
        <p>选择适合您的分数场开始游戏</p>
        {user && (
          <div className="user-welcome">
            欢迎，ID: {user.user_id_4d || '0000'} | 积分: {user.points || 1000}
          </div>
        )}
      </div>

      <div className="score-fields">
        {/* 2分场 */}
        <div
          className="score-field"
          onClick={() => onJoinGame(2)}
        >
          <div className="field-content">
            <div className="field-icon">🎯</div>
            <div className="field-info">
              <h3>2分场</h3>
              <p>新手场 · 轻松上手</p>
              <div className="field-details">
                <span>🛡️ 适合新手</span>
                <span>🎪 娱乐为主</span>
              </div>
            </div>
            <div className="field-action">
              <button className="join-button">
                开始游戏
              </button>
            </div>
          </div>
          <div className="field-stats">
            <span>👥 在线玩家: 128人</span>
            <span>💰 底分: 2分</span>
            <span>⚡ 等待时间: ~10秒</span>
          </div>
        </div>

        {/* 5分场 */}
        <div
          className="score-field"
          onClick={() => onJoinGame(5)}
        >
          <div className="field-content">
            <div className="field-icon">⚡</div>
            <div className="field-info">
              <h3>5分场</h3>
              <p>进阶场 · 策略对决</p>
              <div className="field-details">
                <span>🏆 竞技体验</span>
                <span>🧠 策略对决</span>
              </div>
            </div>
            <div className="field-action">
              <button className="join-button">
                开始游戏
              </button>
            </div>
          </div>
          <div className="field-stats">
            <span>👥 在线玩家: 86人</span>
            <span>💰 底分: 5分</span>
            <span>⚡ 等待时间: ~15秒</span>
          </div>
        </div>

        {/* 10分场 */}
        <div
          className="score-field"
          onClick={() => onJoinGame(10)}
        >
          <div className="field-content">
            <div className="field-icon">🔥</div>
            <div className="field-info">
              <h3>10分场</h3>
              <p>高手场 · 巅峰对决</p>
              <div className="field-details">
                <span>👑 高手云集</span>
                <span>💎 巅峰对决</span>
              </div>
            </div>
            <div className="field-action">
              <button className="join-button">
                开始游戏
              </button>
            </div>
          </div>
          <div className="field-stats">
            <span>👥 在线玩家: 42人</span>
            <span>💰 底分: 10分</span>
            <span>⚡ 等待时间: ~20秒</span>
          </div>
        </div>
      </div>

      <div className="lobby-footer">
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-label">我的积分</span>
            <span className="stat-value">{user?.points || 1000}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">今日胜率</span>
            <span className="stat-value">68%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">当前连胜</span>
            <span className="stat-value">3</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总场次</span>
            <span className="stat-value">156</span>
          </div>
        </div>
        
        <div className="game-rules">
          <h4>📋 游戏规则</h4>
          <ul>
            <li>每人13张牌，分成3道（3张、5张、5张）</li>
            <li>尾道 > 中道 > 头道</li>
            <li>比较各道牌型大小决定胜负</li>
            <li>特殊牌型有额外奖励</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lobby;