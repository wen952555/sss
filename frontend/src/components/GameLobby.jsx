import React from 'react';
import './GameLobby.css'; // 引用现有的样式文件

const GameLobby = ({ onSelectGame }) => {
  return (
    <div className="lobby-container">
      <h1 className="lobby-title">选择您的游戏</h1>
      <div className="game-selection-grid">

        {/* --- 十三张游戏板块 --- */}
        <div className="game-card thirteen-card">
          <div className="game-card-content">
            <h2>经典十三张</h2>
            <p>考验策略与运气的巅峰对决，组合你的最强牌型！</p>
          </div>
          {/* 新增的操作按钮区域 */}
          <div className="game-card-actions">
            <button className="action-btn official" onClick={() => onSelectGame('thirteen', false)}>正式对战</button>
            <button className="action-btn trial" onClick={() => onSelectGame('thirteen', true)}>人机试玩</button>
          </div>
        </div>

        {/* --- 八张游戏板块 --- */}
        <div className="game-card eight-card">
          <div className="game-card-content">
            <h2>急速八张</h2>
            <p>快节奏的竞技体验，三道牌型，快速分胜负！</p>
          </div>
          {/* 新增的操作按钮区域 */}
          <div className="game-card-actions">
            <button className="action-btn official" onClick={() => onSelectGame('eight', false)}>正式对战</button>
            <button className="action-btn trial" onClick={() => onSelectGame('eight', true)}>人机试玩</button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default GameLobby;
