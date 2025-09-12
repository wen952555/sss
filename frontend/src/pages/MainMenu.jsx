import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu">
            <h1 className="main-menu-title">Game Lobby</h1>
            <p className="main-menu-subtitle">Select a game to play</p>
            <div className="game-panels-container">
                {/* Panel 1: Thirteen Cards */}
                <Link to="/thirteen-cards" className="game-panel-link">
                    <div className="game-panel thirteen-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">Thirteen</h2>
                            <p className="panel-description">The classic Vietnamese shedding card game.</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 2: Placeholder */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">More Games</h2>
                            <p className="panel-description">Coming Soon</p>
                        </div>
                    </div>
                </div>

                {/* Panel 3: Placeholder */}
                <div className="game-panel-link disabled">
                    <div className="game-panel placeholder-panel">
                        <div className="panel-content">
                            <h2 className="panel-title">Even More</h2>
                            <p className="panel-description">Coming Soon</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
