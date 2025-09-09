import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu-container">
            <h1>棋牌游戏</h1>
            <div className="card-container">
                <Link to="/doudizhu" className="card-link">
                    <div className="card">
                        <h2>斗地主</h2>
                        <p>开始斗地主游戏</p>
                    </div>
                </Link>
                <Link to="/mahjong" className="card-link">
                    <div className="card">
                        <h2>麻将</h2>
                        <p>开始麻将游戏</p>                    </div>
                </Link>
            </div>
        </div>
    );
};

export default MainMenu;
