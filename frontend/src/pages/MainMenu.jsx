import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
  return (
    <div className="main-menu-container">
      <h1 className="main-title">游戏大厅</h1>
      <div className="game-selection-container">
        <Link to="/doudizhu" className="game-card doudizhu-card">
          <div className="game-title">斗地主</div>
        </Link>
        <Link to="/mahjong" className="game-card mahjong-card">
          <div className="game-title">麻将</div>
        </Link>
      </div>
    </div>
  );
};

export default MainMenu;
