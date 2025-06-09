// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage'; 
import LobbyPage from './pages/LobbyPage'; // <--- 导入新的 LobbyPage

import './App.css'; 

function HomePage() {
    const { user, loading } = useAuth();
    if (loading) return <p>加载中...</p>;
    return (
        <div style={{textAlign: 'center', marginTop: '50px'}}>
            <h2>欢迎来到十三水游戏</h2>
            {user ? 
                <>
                    <p>你好, {user.phone_number} (积分: {user.points})</p>
                    <Link to="/lobby" style={{fontSize: '1.2em', padding: '10px 20px', textDecoration: 'none', backgroundColor: '#28a745', color: 'white', borderRadius: '5px'}}>进入游戏大厅</Link>
                </>
                : 
                <p>请先 <Link to="/login">登录</Link> 或 <Link to="/register">注册</Link> 来开始游戏。</p>
            }
        </div>
    );
}

function Navigation() {
    const { user, logout, loading } = useAuth();
    if (loading && !user) return null; // 初始加载时如果没用户信息，不显示导航避免闪烁

    return (
        <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', textAlign:'center' }}>
            <Link to="/" style={{ marginRight: '15px' }}>首页</Link>
            {user && <Link to="/lobby" style={{ marginRight: '15px' }}>游戏大厅</Link>}
            {/* GamePage 链接现在通过 LobbyPage 进入，或者直接通过 URL /game/:roomId */}
            {/* {user && <Link to="/game/default_room" style={{ marginRight: '15px' }}>快速开始(默认房间)</Link>}  */}
            {!user && <Link to="/login" style={{ marginRight: '15px' }}>登录</Link>}
            {!user && <Link to="/register" style={{ marginRight: '15px' }}>注册</Link>}
            {user && <button onClick={async () => await logout()} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: '0', fontSize:'inherit' }}>登出</button>}
        </nav>
    );
}

function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) { return <div>加载用户信息...</div>; }
    if (!user) { return <Navigate to="/login" state={{ from: location }} replace />; }
    return <Outlet />; 
}

function App() {
  return (
    <AuthProvider> 
      <Router>
        <div className="App">
          <header className="App-header" style={{minHeight: 'auto'}}> {/* 调整了header样式 */}
            <Navigation />
          </header>
          <main style={{padding: '20px'}}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/lobby" element={<LobbyPage />} /> {/* <--- 新增 Lobby 路由 */}
                <Route path="/game/:roomId" element={<GamePage />} /> {/* <--- GamePage 接收 roomId 参数 */}
                {/* 如果仍想保留一个默认游戏入口，可以这样，但 GamePage 需要处理 roomId 为 undefined 的情况 */}
                {/* <Route path="/game" element={<GamePage />} />  */}
              </Route>

              <Route path="*" element={<div><p>404 - 页面未找到</p><Link to="/">返回首页</Link></div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
