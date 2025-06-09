// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage'; // 假设你已创建
// import LobbyPage from './pages/LobbyPage';
// import ProfilePage from './pages/ProfilePage';

import './App.css'; // 你已有的 App.css

// 一个简单的首页组件
function HomePage() {
    const { user, loading } = useAuth();
    if (loading) return <p>加载中...</p>;
    return (
        <div>
            <h2>欢迎来到十三水游戏</h2>
            {user ? <p>你好, {user.phone_number} (积分: {user.points})</p> : <p>请先登录或注册。</p>}
        </div>
    );
}

// 导航栏组件
function Navigation() {
    const { user, logout, loading } = useAuth();

    if (loading) return null; // 加载时不显示导航，避免闪烁

    return (
        <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', textAlign:'center' }}>
            <Link to="/" style={{ marginRight: '15px' }}>首页</Link>
            {!user && <Link to="/login" style={{ marginRight: '15px' }}>登录</Link>}
            {!user && <Link to="/register" style={{ marginRight: '15px' }}>注册</Link>}
            {user && <Link to="/game" style={{ marginRight: '15px' }}>开始游戏</Link>}
            {/* {user && <Link to="/lobby" style={{ marginRight: '15px' }}>游戏大厅</Link>} */}
            {/* {user && <Link to="/profile" style={{ marginRight: '15px' }}>个人中心</Link>} */}
            {user && <button onClick={logout} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: '0', fontSize:'inherit' }}>登出</button>}
        </nav>
    );
}

// 受保护的路由组件
function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>加载用户信息...</div>; // 或者一个骨架屏
    }

    if (!user) {
        // 用户未登录，重定向到登录页，并记录他们想去的页面
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />; // 用户已登录，渲染子路由
}


function App() {
  return (
    <AuthProvider> {/* AuthProvider 包裹整个应用 */}
      <Router>
        <div className="App">
          <header className="App-header">
            {/* <h1>十三水游戏平台</h1> */} {/* 标题可以放在Navigation或HomePage */}
            <Navigation />
          </header>
          <main style={{padding: '20px'}}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* 受保护的路由 */}
              <Route element={<ProtectedRoute />}>
                <Route path="/game" element={<GamePage />} />
                {/* <Route path="/lobby" element={<LobbyPage />} /> */}
                {/* <Route path="/profile" element={<ProfilePage />} /> */}
                {/* 可以在这里添加更多需要登录才能访问的页面 */}
              </Route>

              {/* 404 页面 (可选) */}
              <Route path="*" element={<div><p>404 - 页面未找到</p><Link to="/">返回首页</Link></div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
