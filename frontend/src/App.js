// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GamePage from './pages/GamePage';
import './App.css';

// 新建一个组件来处理根路径的导航逻辑
const RootRedirect = () => {
  const { user, loading } = useAuth(); // 在组件内部安全地调用 useAuth

  if (loading) {
    return <div>应用加载中...</div>; // 或者一个更美观的加载指示器
  }

  return <Navigate to={user ? "/game" : "/login"} replace />;
};


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
              <Route 
                path="/game" 
                element={
                  <ProtectedRoute>
                    <GamePage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<RootRedirect />} /> {/* 使用新的 RootRedirect 组件 */}
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

  // 在 AppHeader 中，user 可能为 null，但 JSX 的条件渲染 {user ? ... : ...} 会正确处理
  // 只有当 user 存在时，才会尝试访问 user.phone 和 user.points

  // 初始加载时，不显示用户信息或登出按钮，直到 loading 完成
  if (loading && !user) { 
    return (
      <header className="app-header">
        <h1>十三水游戏</h1>
        <nav>用户信息加载中...</nav>
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
          // 当 user 为 null (未登录或已登出)
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
    return <div>页面加载中...</div>; 
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
