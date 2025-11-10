import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import apiService from './api/apiService';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    if (userData) {
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
    return <div className="App">加载中...</div>;
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