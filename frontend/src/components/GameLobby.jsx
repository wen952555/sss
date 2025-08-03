import React from 'react';
import './GameLobby.css'; // 为游戏大厅创建新的专用样式文件

const GameLobby = ({ onSelectGame }) => {
  return (
    <div className="lobby-container">
      <h1 className="lobby-title">选择您的游戏</h1>
      <div className="game-selection-grid">

        {/* --- 十三张游戏板块 --- */}
        <div 
          className="game-card thirteen-card" 
          onClick={() => onSelectGame('thirteen')}
        >
          <div className="game-card-content">
            <h2>经典十三张</h2>
            <p>考验策略与运气的巅峰对决，组合你的最强牌型！</p>
          </div>
        </div>

        {/* --- 八张游戏板块 --- */}
        <div 
          className="game-card eight-card" 
          onClick={() => onSelectGame('eight')}
        >
          <div className="game-card-content">
            <h2>急速八张</h2>
            <p>快节奏的竞技体验，三道牌型，快速分胜负！</p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default GameLobby;
