import React from 'react';
import { Link } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = () => {
    return (
        <div className="main-menu-container">
            <h1>请选择一个板块</h1>
            <div className="card-container">
                <a href="/proxy49/" className="card-link">
                    <div className="card">
                        <h2>49图库</h2>
                        <p>查看最新的图库资料</p>
                    </div>
                </a>
                <a href="/proxymacau/" className="card-link">
                    <div className="card">
                        <h2>开奖记录</h2>
                        <p>获取实时的开奖结果</p>
                    </div>
                </a>
                <Link to="/betting" className="card-link">
                    <div className="card">
                        <h2>选码下注</h2>
                        <p>进入模拟投注游戏</p>
                    </div>
                </Link>
                <Link to="/results" className="card-link">
                    <div className="card">
                        <h2>开奖结果</h2>
                        <p>查看历史开奖记录</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default MainMenu;
