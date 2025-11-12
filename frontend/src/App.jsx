import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import GameBoardIntegrated from './components/GameBoardIntegrated';
import apiService from './api/apiService';
import './App.css';
import './styles/mobile.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('auth'); // 'auth', 'lobby', 'game'
  const [matching, setMatching] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        apiService.setToken(token);
        try {
          const response = await apiService.getUser();
          if (response.success) {
            setUser(response.user);
            setCurrentView('lobby'); // 自动跳转到大厅
          } else {
            console.log('Token verification failed:', response.message);
            handleLogout();
          }
        } catch (error) {
          console.error('Token verification error:', error);
          handleLogout();
        }
      } else {
        setCurrentView('auth'); // 没有token显示登录界面
      }
      setIsLoading(false);
    };

    verifyToken();
  }, [token]);

  const handleLoginSuccess = async (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    apiService.setToken(newToken);
    setToken(newToken);

    if (!userData) {
      try {
        const response = await apiService.getUser();
        if (response.success) {
          setUser(response.user);
          setCurrentView('lobby');
        }
      } catch (error) {
        console.error('Failed to get user after login:', error);
      }
    } else {
      setUser(userData);
      setCurrentView('lobby');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    apiService.setToken(null);
    setCurrentView('auth');
    setMatching(false);
    setSelectedScore(null);
  };

  const handleJoinGame = async (scoreType) => {
    setSelectedScore(scoreType);
    setMatching(true);

    // 模拟匹配过程
    setTimeout(() => {
      setCurrentView('game');
      setMatching(false);
    }, 3000);
  };

  const handleExitGame = () => {
    setCurrentView('lobby');
    setSelectedScore(null);
    setMatching(false);
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
  };

  if (isLoading) {
    return (
      <div className="App">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  // 渲染当前视图
  const renderCurrentView = () => {
    switch (currentView) {
      case 'auth':
        return <Auth onLoginSuccess={handleLoginSuccess} />;
      
      case 'lobby':
        return (
          <Lobby
            onJoinGame={handleJoinGame}
            matching={matching}
            selectedScore={selectedScore}
            user={user}
            onBack={handleBackToLobby}
          />
        );
      
      case 'game':
        return (
          <GameBoardIntegrated
            scoreType={selectedScore}
            onExitGame={handleExitGame}
            user={user}
          />
        );
      
      default:
        return <Auth onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎴 十三水游戏</h1>
        {user && (
          <div className="user-info">
            <span>ID: {user.user_id_4d || '0000'} | 积分: {user.points || 1000}</span>
            <button onClick={handleLogout} className="logout-btn">
              退出登录
            </button>
          </div>
        )}
      </header>

      <main className="main-content">
        {renderCurrentView()}
      </main>

      <footer className="App-footer">
        <p>© 2024 十三水游戏 - 享受游戏的乐趣</p>
      </footer>
    </div>
  );
}

export default App;