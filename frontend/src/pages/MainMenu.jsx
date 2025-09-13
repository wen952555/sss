import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ApiWorker from '../workers/api.worker.js?worker';
import './MainMenu.css';

const MainMenu = () => {
    const [user, setUser] = useState(null);
    const worker = useRef(null);

    const handleLogout = () => {
        worker.current.postMessage({ action: 'logout', payload: { resource: 'user' } });
    };

    useEffect(() => {
        worker.current = new ApiWorker();
        worker.current.onmessage = (event) => {
            const { success, action, data } = event.data;
            if (success) {
                if (action === 'checkAuth') {
                    if (data.isLoggedIn) {
                        setUser(data.user);
                    } else {
                        setUser(null);
                    }
                } else if (action === 'logout') {
                    setUser(null);
                }
            }
        };

        worker.current.postMessage({ action: 'checkAuth', payload: { resource: 'user' } });

        return () => worker.current.terminate();
    }, []);

    return (
        <div className="main-menu">
            <header className="main-menu-header">
                <div className="header-left">
                    {user ? (
                        <span className="username-display">欢迎, {user.username}</span>
                    ) : (
                        <Link to="/login" className="header-link">登录/注册</Link>
                    )}
                </div>
                <div className="header-right">
                    {user ? (
                        <>
                            <Link to="/points" className="header-link">积分: {user.points}</Link>
                            <button onClick={handleLogout} className="header-link logout-button">登出</button>
                        </>
                    ) : (
                         <Link to="/points" className="header-link">积分管理</Link>
                    )}
                </div>
            </header>
            <div className="game-panels-container">
                {/* Panel 1: Yan San */}
                <Link to="/thirteen-cards" className="game-panel-link">
                    <div className="game-panel panel-yansan">
                        <div className="panel-content">
                            <h2 className="panel-title">烟三</h2>
                            <p className="panel-description">经典扑克玩法</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 2: Dou Di Zhu */}
                <Link to="/doudizhu" className="game-panel-link">
                    <div className="game-panel panel-doudizhu">
                        <div className="panel-content">
                            <h2 className="panel-title">斗地主</h2>
                            <p className="panel-description">三人策略对战</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 3: Mahjong */}
                <Link to="/mahjong" className="game-panel-link">
                    <div className="game-panel panel-mahjong">
                        <div className="panel-content">
                            <h2 className="panel-title">麻将</h2>
                            <p className="panel-description">四人传统棋牌</p>
                        </div>
                    </div>
                </Link>

                {/* Panel 4: Thirteen Waters */}
                <Link to="/thirteen-waters" className="game-panel-link">
                    <div className="game-panel panel-thirteen-waters">
                        <div className="panel-content">
                            <h2 className="panel-title">十三水</h2>
                            <p className="panel-description">福建特色玩法</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default MainMenu;
