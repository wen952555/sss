import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import apiService from './api/apiService';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

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
      setAuthChecked(true);
    };
    
    verifyToken();
  }, [token]);

  const handleLoginSuccess = async (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    apiService.setToken(newToken);
    setToken(newToken);
    
    // 确保 token 设置后再获取用户信息
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
  };

  if (isLoading) {
    return (
      <div className="App">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>十三水游戏</h1>
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
        ) : (
          <Lobby />
        )}
      </main>
    </div>
  );
}

export default App;