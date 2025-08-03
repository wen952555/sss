import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('lobby'); // 'lobby', 'profile', 'transfer'

  useEffect(() => {
    // 尝试从localStorage获取用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userId, userData) => {
    const fullUserData = { id: userId, ...userData };
    localStorage.setItem('user', JSON.stringify(fullUserData));
    setUser(fullUserData);
    setCurrentView('lobby'); // 登录成功后返回大厅
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
  
  const renderCurrentView = () => {
      switch (currentView) {
          case 'profile':
              return <UserProfile user={user} />;
          case 'transfer':
              // 注意：确保TransferPoints组件能够接收并处理user和onBack属性
              return <TransferPoints currentUser={user} onTransferSuccess={() => setCurrentView('lobby')} />;
          case 'lobby':
          default:
              return <GameLobby />;
      }
  };

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>游戏大厅</h1>
        <div className="user-actions">
          <span>欢迎, {user.phone} (ID: {user.id})</span>
          <button onClick={() => setCurrentView('lobby')}>主页</button>
          <button onClick={() => setCurrentView('profile')}>我的资料</button>
          <button onClick={() => setCurrentView('transfer')}>积分转移</button>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </header>
      <main className="app-main">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
