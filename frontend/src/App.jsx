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
  const [joinMessage, setJoinMessage] = useState('');

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
    setJoinMessage('');
  };

  const handleJoinTable = async (tableId) => {
    try {
      setJoinMessage(`正在加入桌子 ${tableId}...`);
      
      // 模拟加入过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 这里可以调用真实的加入API
      // const response = await apiService.joinTable(tableId);
      // if (response.success) {
      //   setCurrentTable(tableId);
      //   setCurrentView('game');
      // } else {
      //   setJoinMessage(`加入失败: ${response.message}`);
      //   setTimeout(() => setJoinMessage(''), 3000);
      // }
      
      // 临时：直接进入游戏
      setCurrentTable(tableId);
      setCurrentView('game');
      setJoinMessage('');
      
    } catch (error) {
      console.error('Join table error:', error);
      setJoinMessage('加入游戏失败，请重试');
      setTimeout(() => setJoinMessage(''), 3000);
    }
  };

  const handleExitGame = () => {
    setCurrentView('lobby');
    setCurrentTable(null);
    setJoinMessage('已退出游戏');
    setTimeout(() => setJoinMessage(''), 2000);
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
      
      {/* 加入游戏提示 */}
      {joinMessage && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#3498db',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '20px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {joinMessage}
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateX(-50%) translateY(-20px);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
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