// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage'; 
// LobbyPage 不再需要了
// import LobbyPage from './pages/LobbyPage'; 

import './App.css'; 

// HomePage 可以简化，或者直接在登录后跳转时不经过它
function HomePage() {
    const { user, loading } = useAuth();
    // 如果已登录，这个页面理论上不会显示，因为 App.js 会重定向
    if (loading) return <p>加载中...</p>;
    return (
        <div style={{textAlign: 'center', marginTop: '50px'}}>
            <h2>欢迎来到十三水游戏</h2>
            {!user && 
                <p>请先 <Link to="/login">登录</Link> 或 <Link to="/register">注册</Link> 来开始游戏。</p>
            }
            {/* 如果用户通过某种方式访问到这里且已登录，可以提供一个进入游戏的链接 */}
            {user && <p>您已登录，<Link to="/game">点击这里进入游戏</Link></p>}
        </div>
    );
}

function Navigation() {
    const { user, logout, loading } = useAuth();
    if (loading && !user) return null;

    return (
        <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', textAlign:'center' }}>
            {/* 可以保留一个首页链接，但主要导航可能是游戏和登出 */}
            <Link to="/" style={{ marginRight: '15px' }}>首页信息</Link> 
            {user && <Link to="/game" style={{ marginRight: '15px' }}>我的牌桌</Link>}
            {!user && <Link to="/login" style={{ marginRight: '15px' }}>登录</Link>}
            {!user && <Link to="/register" style={{ marginRight: '15px' }}>注册</Link>}
            {user && <button onClick={async () => await logout()} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: '0', fontSize:'inherit' }}>登出</button>}
            {/* 后续可以在这里添加“匹配真实玩家”等按钮 */}
        </nav>
    );
}

// ProtectedRoute 现在主要保护 /game 路径
function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) { return <div>加载用户信息...</div>; }
    if (!user) { return <Navigate to="/login" state={{ from: location }} replace />; }
    return <Outlet />; 
}

// App 组件，登录后直接导向 /game
function AppContent() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>应用加载中...</div>; // 或者一个骨架屏
    }

    // 如果用户已登录，并且当前不在游戏页面，则自动导航到游戏页面
    // 需要排除一些我们不希望自动跳转的路径，比如用户正在尝试登出或访问特定非游戏页面
    if (user && location.pathname !== '/game' && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
        // 如果用户已登录但访问的是根路径 "/"，也跳转到 "/game"
        // 或者，如果他们访问了其他受保护但非游戏的路径（未来可能有），则不跳转
        // 为了简化，只要登录了，就尝试去 /game
        // console.log("AppContent: User logged in, current path:", location.pathname, "navigating to /game");
        // return <Navigate to="/game" replace />; // replace 避免返回到这个中间状态
        // 上面的直接 Navigate 可能会导致循环，改为在 Routes 中处理
    }


    return (
        <div className="App">
          <header className="App-header" style={{minHeight: 'auto'}}>
            <Navigation />
          </header>
          <main style={{padding: '20px'}}>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/game" replace /> : <HomePage />} /> {/* 登录了就去游戏，没登录看首页 */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route element={<ProtectedRoute />}>
                {/* GamePage 不再需要 roomId 参数，因为它总是与AI玩或由服务器分配 */}
                <Route path="/game" element={<GamePage />} /> 
              </Route>

              <Route path="*" element={<div><p>404 - 页面未找到</p><Link to="/">返回首页</Link></div>} />
            </Routes>
          </main>
        </div>
    );
}

function App() {
  return (
    <AuthProvider> 
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
