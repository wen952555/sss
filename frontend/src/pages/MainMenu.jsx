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
                        <span className="username-display">欢迎, {user.email}</span>
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
            <div className="main-content">
                <div className="tool-card">
                    <h2>AI 下注单解析器</h2>
                    <p>自动识别和整理您的下注记录。</p>
                    <Link to="/bet-parser" className="tool-link">开始使用</Link>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
