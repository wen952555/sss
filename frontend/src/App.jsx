import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import apiService from './api/apiService';
import './App.css';
import './styles/mobile.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('lobby'); // 'lobby', 'game'
  const [currentTable, setCurrentTable] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        apiService.setToken(token);
        try {
          const response = await apiService.getUser();
          if (response.success) {
            setUser(response.user);
          } else {
            console.log('Token verification failed:', response.message);
            handleLogout();
          }
        } catch (error) {
          console.error('Token verification error:', error);
          handleLogout();
        }
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
        }
      } catch (error) {
        console.error('Failed to get user after login:', error);
      }
    } else {
      setUser(userData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    apiService.setToken(null);
    setCurrentView('lobby');
    setCurrentTable(null);
  };

  const handleJoinTable = async (tableId) => {
    // 直接进入游戏，不显示任何提示
    setCurrentTable(tableId);
    setCurrentView('game');
  };

  const handleExitGame = () => {
    setCurrentView('lobby');
    setCurrentTable(null);
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>十三水游戏</h1>
        {user && (
          <div className="user-info">
            <span>ID: {user.user_id_4d} | 积分: {user.points}</span>
            <button onClick={handleLogout}>退出登录</button>
          </div>
        )}
      </header>
      
      <main>
        {!token || !user ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : currentView === 'lobby' ? (
          <Lobby onJoinTable={handleJoinTable} />
        ) : (
          <GameBoard 
            tableId={currentTable} 
            onExitGame={handleExitGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;
