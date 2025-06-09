import React from 'react';
import './App.css'; // 可选的 App 特定 CSS 文件
// import LoginPage from './pages/LoginPage'; // 如果你已经创建了页面组件
// import GamePage from './pages/GamePage';
// import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
// import { useAuth } from './contexts/AuthContext'; // 如果使用了 AuthContext

function App() {
  // const { user } = useAuth(); // 如果使用了 AuthContext

  return (
    // <Router> {/* 如果使用 react-router-dom */}
      <div className="App">
        <header className="App-header">
          <h1>欢迎来到十三水游戏！</h1>
          <p>项目正在构建中...</p>
          {/*
          <nav>
            <Link to="/">首页</Link> | <Link to="/login">登录</Link> | <Link to="/game">游戏</Link>
          </nav>
          */}
        </header>
        {/*
        <main>
          <Routes>
            <Route path="/" element={<div>首页内容</div>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/game" element={user ? <GamePage /> : <Navigate to="/login" />} />
          </Routes>
        </main>
        */}
      </div>
    // </Router>
  );
}

export default App;
