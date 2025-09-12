import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu">
            <div className="game-panels-container">
                {/* Panel 1: Thirteen Cards */}
                <Link to="/thirteen-cards" className="game-panel-link">
                    <div className="game-panel thirteen-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">十三张</h2>
                            <p className="panel-description">经典的越南纸牌游戏。</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 2: Placeholder */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">更多游戏</h2>
                            <p className="panel-description">敬请期待</p>
                        </div>
                    </div>
                </div>

                {/* Panel 3: Placeholder */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">更多精彩</h2>
                            <p className="panel-description">敬请期待</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
