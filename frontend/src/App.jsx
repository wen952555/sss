// frontend/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Game from './components/Game';
import Lobby from './components/Lobby';
import AuthModal from './components/AuthModal';
import './App.css';
import './components/Lobby.css'; // Import Lobby specific styles

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSetToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setShowAuthModal(false); // Close modal on successful login
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <Router>
      <div className="app">
        <nav className="main-nav">
          <Link to="/">游戏大厅</Link>
          <div className="auth-status">
            {!token ? (
              <button onClick={() => setShowAuthModal(true)} className="auth-button">注册/登录</button>
            ) : (
              <button onClick={handleLogout} className="auth-button">退出登录</button>
            )}
          </div>
        </nav>

        <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} setToken={handleSetToken} />

        <main>
          <Routes>
            <Route path="/game/:roomId" element={token ? <Game token={token} /> : <Navigate to="/" />} />
            <Route path="/" element={token ? <Lobby /> : <div className="login-prompt"><h2>请先登录</h2><p>登录后即可进入游戏大厅。</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;