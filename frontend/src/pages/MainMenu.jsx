import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu">
            <div className="game-panels-container">
                {/* Panel 1: Big Two */}
                <Link to="/thirteen-cards" className="game-panel-link">
                    <div className="game-panel thirteen-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">锄大地</h2>
                            <p className="panel-description">经典扑克游戏</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 2: Dou Di Zhu */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">斗地主</h2>
                            <p className="panel-description">敬请期待</p>
                        </div>
                    </div>
                </div>

                {/* Panel 3: Mahjong */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">麻将</h2>
                            <p className="panel-description">敬请期待</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
