import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu-container">
            <h1>十三张</h1>
            <div className="card-container">
                <Link to="/thirteen-cards" className="card-link">
                    <div className="card">
                        <h2>开始游戏</h2>
                        <p>进入十三张游戏</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default MainMenu;
