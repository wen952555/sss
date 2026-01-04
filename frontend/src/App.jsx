import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Game from './pages/Game'; // Corrected import

export default function App() {
  // 尝试从 localStorage 获取用户信息
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  });

  // 登录成功后的处理
  const handleLogin = (loggedInUser) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  // 登出处理
  const handleLogout = () => {
      localStorage.removeItem('user');
      setUser(null);
  };

  // 如果没有用户信息，则显示认证组件
  if (!user) {
    return <Auth onLoginSuccess={handleLogin} />;
  }

  // 如果有用户信息，则显示游戏界面
  // onBack prop 现在用于处理登出逻辑
  return <Game user={user} onBack={handleLogout} />;

}
