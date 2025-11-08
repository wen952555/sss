import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import apiService from './api/apiService';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        apiService.setToken(token);
        try {
          const response = await apiService.getUser();
          if (response.success) {
            setUser(response.user);
          } else {
            handleLogout();
          }
        } catch (error) {
          handleLogout();
        }
      }
    };
    verifyToken();
  }, [token]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    apiService.setToken(null);
  };

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
          // 这里可以根据状态切换到 GameBoard
        )}
      </main>
    </div>
  );
}

export default App;