
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Corrected import
import Game from './components/Game';
import Lobby from './components/Lobby';
import TrialGame from './components/TrialGame';
import AuthModal from './components/AuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import './components/Lobby.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decodedToken = jwtDecode(storedToken); // Use the imported function
        // Check if token is expired
        const isExpired = decodedToken.exp * 1000 < Date.now();
        if (isExpired) {
          handleLogout();
        } else {
          setToken(storedToken);
          setUser(decodedToken.data);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        handleLogout(); // Clear invalid token
      }
    }
  }, []);

  const handleSetToken = (newToken) => {
    try {
        localStorage.setItem('token', newToken);
        const decodedToken = jwtDecode(newToken);
        setToken(newToken);
        setUser(decodedToken.data);
    } catch (error) {
        console.error("Error setting token:", error);
        handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <nav className="main-nav">
            <div>
              <Link to="/">游戏大厅</Link>
              <Link to="/trial">离线练习</Link>
            </div>
             <div className="user-info">{user ? `欢迎, ${user.display_id}` : ''}</div>
            <div className="auth-status">
              {!token ? (
                <button onClick={() => setShowAuthModal(true)} className="auth-button">注册/登录</button>
              ) : (
                <button onClick={handleLogout} className="auth-button">登出</button>
              )}
            </div>
          </nav>

          <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} setToken={handleSetToken} />

          <main>
            <Routes>
              <Route path="/trial" element={<TrialGame />} />
              <Route path="/game/:roomId" element={token && user ? <Game token={token} user={user} /> : <Navigate to="/" />} />
              <Route path="/" element={token ? <Lobby token={token} /> : <div className="login-prompt"><h2>请登录</h2><p>登录以访问游戏大厅或尝试离线练习模式。</p></div>} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
