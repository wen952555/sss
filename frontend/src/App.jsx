import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import './App.css';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// 新版本提示模态框组件
const UpdateModal = ({ show, version, notes, onUpdate, onCancel }) => {
  if (!show) return null;
  return (
    <div className="update-modal-backdrop">
      <div className="update-modal-content">
        <h3>发现新版本: {version}</h3>
        <div className="release-notes">
          <p>更新内容:</p>
          <ul>
            {notes.map((note, index) => <li key={index}>{note}</li>)}
          </ul>
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">稍后提醒</button>
          <button onClick={onUpdate} className="update-btn">立即更新</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState({ gameType: null, hand: null, error: null });
  const [currentView, setCurrentView] = useState('lobby');
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });

  useEffect(() => {
    // 版本检查
    if (Capacitor.isNativePlatform()) {
      const checkVersion = async () => {
        // ... (version check logic is correct)
      };
      checkVersion();
    }
    // 用户信息加载
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userId, userData) => {
    const fullUserData = { id: userId, ...userData };
    localStorage.setItem('user', JSON.stringify(fullUserData));
    setUser(fullUserData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setGameState({ gameType: null, hand: null, error: null }); // 登出时重置游戏状态
  };

  const handleSelectGame = async (gameType) => {
    const params = gameType === 'thirteen' ? 'players=1&cards=13&game=thirteen' : 'players=6&cards=8&game=eight';
    try {
      const response = await fetch(`/api/deal_cards.php?${params}`);
      const data = await response.json();
      if (data.success) {
        setGameState({ gameType, hand: data.hands['玩家 1'], error: null });
      } else {
        setGameState({ gameType: null, hand: null, error: data.message });
      }
    } catch (err) {
      setGameState({ gameType: null, hand: null, error: `无法连接到API: ${err.message}` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hand: null, error: null });
  };
  
  const handleUpdate = async () => {
      await Browser.open({ url: updateInfo.url });
      setUpdateInfo({ ...updateInfo, show: false });
  };

  const renderMainContent = () => {
    if (gameState.gameType && gameState.hand) {
      if (gameState.gameType === 'thirteen') {
        return <ThirteenGame playerHand={gameState.hand} onBackToLobby={handleBackToLobby} />;
      }
      if (gameState.gameType === 'eight') {
        return <EightCardGame playerHand={gameState.hand} onBackToLobby={handleBackToLobby} />;
      }
    }
    // 根据currentView渲染不同内容
    switch (currentView) {
      case 'profile':
        return <UserProfile user={user} />;
      case 'transfer':
        return <TransferPoints currentUser={user} onTransferSuccess={() => setCurrentView('lobby')} />;
      case 'lobby':
      default:
        return <GameLobby onSelectGame={handleSelectGame} />;
    }
  };

  if (!user) {
    return (
      <>
        <Auth onLoginSuccess={handleLoginSuccess} />
        <UpdateModal show={updateInfo.show} version={updateInfo.version} notes={updateInfo.notes} onUpdate={handleUpdate} onCancel={() => setUpdateInfo({ ...updateInfo, show: false })} />
      </>
    );
  }

  return (
    <div className="app">
      <UpdateModal show={updateInfo.show} version={updateInfo.version} notes={updateInfo.notes} onUpdate={handleUpdate} onCancel={() => setUpdateInfo({ ...updateInfo, show: false })} />
      <header className="app-header">
        <h1>游戏中心</h1>
        <div className="user-actions">
          <span>欢迎, {user.phone}</span>
          <button onClick={() => { setCurrentView('lobby'); handleBackToLobby(); }}>游戏大厅</button>
          <button onClick={() => setCurrentView('profile')}>我的资料</button>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </header>
      <main className="app-main">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
