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
  const [loading, setLoading] = useState(true)

  // 检查本地存储的登录状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const user = JSON.parse(savedUser);
          
          // 验证token是否仍然有效
          try {
            const result = await gameAPI.getUserInfo();
            if (result.success) {
              setUserInfo(result.user);
              setCurrentPage('main');
              console.log('Token验证成功，用户已登录');
            } else {
              throw new Error('Token无效');
            }
          } catch (error) {
            console.error('Token验证失败:', error);
            // Token无效，清除存储
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentPage('login');
          }
        } catch (error) {
          console.error('解析用户信息失败:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCurrentPage('login');
        }
      } else {
        setCurrentPage('login');
      }
      
      setLoading(false);
    };

    checkAuthStatus();

    // 设置全局刷新函数
    window.refreshUserInfo = refreshUserInfo;
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
      // 如果刷新失败，可能是token过期，跳转到登录页
      if (error.message.includes('登录已过期')) {
        handleLogout();
      }
    }
  };

  const handleLogin = (userData) => {
    setUserInfo(userData);
    setCurrentPage('main');
    console.log('用户登录成功:', userData.phone);

    // 设置全局刷新函数
    window.refreshUserInfo = refreshUserInfo;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserInfo(null);
    setCurrentPage('login');
    console.log('用户已退出登录');
  };

  // 在GameRoom中添加登出处理
  const handleGameRoomExit = () => {
    setCurrentPage('main');
    refreshUserInfo();
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading">检查登录状态...</div>
        </div>
      );
    }

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
          onLogout={handleLogout}
        />
      case 'game':
        return <GameRoom
          roomType={selectedRoom}
          userInfo={userInfo}
          onExit={handleGameRoomExit}
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