// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage'; // 我们将创建这个页面
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppHeader />
          <main className="app-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/game" element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to={useAuth().user ? "/game" : "/login"} />} /> {/* 根据登录状态重定向 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

const AppHeader = () => {
  const { user, logout, loading } = useAuth();

  if (loading && !user) { // 仅在初始加载且未确定用户状态时显示加载
    return (
      <header className="app-header">
        <h1>十三水游戏</h1>
        <nav>正在加载用户信息...</nav>
      </header>
    );
  }

  return (
    <header className="app-header">
      <h1>十三水游戏</h1>
      <nav>
        {user ? (
          <>
            <span>欢迎, {user.phone} (积分: {user.points})</span>
            <Link to="/game">游戏</Link>
            <button onClick={logout} className="header-button">登出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </nav>
    </header>
  );
};


const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>加载中...</div>; // 或者一个骨架屏
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const NotFoundPage = () => (
    <div>
        <h2>404 - 页面未找到</h2>
        <p><Link to="/">返回首页</Link></p>
    </div>
);


export default App;
