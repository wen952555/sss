import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import MainMenu from './pages/MainMenu'
import GameRoom from './pages/GameRoom'
import { gameAPI } from './utils/api'
import './index.css'

function App() {
  const [currentPage, setCurrentPage] = useState('login')
  const [userInfo, setUserInfo] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)

  // 检查本地存储的登录状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserInfo(user);
        setCurrentPage('main');
        
        // 设置全局刷新函数
        window.refreshUserInfo = refreshUserInfo;
      } catch (error) {
        console.error('解析用户信息失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // 刷新用户信息
  const refreshUserInfo = async () => {
    try {
      const result = await gameAPI.getUserInfo();
      if (result.success) {
        setUserInfo(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  };

  const handleLogin = (userData) => {
    setUserInfo(userData);
    setCurrentPage('main');
    
    // 设置全局刷新函数
    window.refreshUserInfo = refreshUserInfo;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login onLogin={handleLogin} onNavigate={setCurrentPage} />
      case 'register':
        return <Register onNavigate={setCurrentPage} />
      case 'main':
        return <MainMenu 
          userInfo={userInfo} 
          onSelectRoom={setSelectedRoom}
          onNavigate={setCurrentPage}
        />
      case 'game':
        return <GameRoom 
          roomType={selectedRoom} 
          userInfo={userInfo}
          onExit={() => {
            setCurrentPage('main');
            refreshUserInfo();
          }}
        />
      default:
        return <Login onLogin={handleLogin} onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="app">
      {renderPage()}
    </div>
  )
}

export default App