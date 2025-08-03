import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import GameLobby from './components/GameLobby'; // 确保 GameLobby 组件的路径正确
import './App.css';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 在应用启动时，尝试从 localStorage 恢复登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUser && savedUserId) {
      setCurrentUser(JSON.parse(savedUser));
      setCurrentUserId(savedUserId);
    }
  }, []);

  // 登录成功后的回调函数
  const handleLoginSuccess = (userId, user) => {
    setCurrentUserId(userId);
    setCurrentUser(user);
    // 将登录状态保存到 localStorage
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  // 退出登录的处理函数
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserId(null);
    // 清除 localStorage
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUser');
  };

  return (
    <div className="app-container">
      {currentUser ? (
        // 如果用户已登录，显示游戏大厅，并传入用户信息和退出函数
        <GameLobby 
          userId={currentUserId} 
          user={currentUser} 
          onLogout={handleLogout} 
          // 传递一个函数用于更新顶层的用户信息（例如，在赠送积分后）
          updateUser={setCurrentUser}
        />
      ) : (
        // 如果用户未登录，显示认证组件
        <Auth onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
