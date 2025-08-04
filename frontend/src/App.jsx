import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import './App.css';

// --- 核心修正：导入 Capacitor 核心库和插件 ---
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Http } from '@capacitor/http'; // 导入 HTTP 插件

const UpdateModal = ({ show, version, notes, onUpdate, onCancel }) => {
  if (!show) return null;
  return (
    <div className="update-modal-backdrop">
      <div className="update-modal-content">
        <h3>发现新版本: {version}</h3>
        <div className="release-notes"><p>更新内容:</p><ul>{notes.map((note, index) => <li key={index}>{note}</li>)}</ul></div>
        <div className="modal-actions"><button onClick={onCancel} className="cancel-btn">稍后提醒</button><button onClick={onUpdate} className="update-btn">立即更新</button></div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState({ gameType: null, hand: null, otherPlayers: {}, error: null });
  const [currentView, setCurrentView] = useState('lobby');
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });

  useEffect(() => {
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
    setGameState({ gameType: null, hand: null, otherPlayers: {}, error: null });
  };
  
  // --- 核心逻辑更新：使用 Capacitor HTTP 插件 ---
  const handleSelectGame = async (gameType, isTrial) => {
    const playerCount = isTrial ? 4 : 1;
    const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
    const params = `players=${playerCount}&cards=${cardsPerPlayer}&game=${gameType}`;
    
    // 1. 定义完整的 API URL，这是原生请求所必需的
    const apiUrl = `https://9522.ip-ddns.com/api/deal_cards.php?${params}`;

    try {
      // 2. 使用 Http.get 发出原生网络请求
      const response = await Http.get({
        url: apiUrl,
        // (可选)可以添加 headers
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // 3. Http 插件返回的数据直接就是 JSON 对象，存储在 response.data 中
      const data = response.data;

      if (data.success) {
        const player1Hand = data.hands['玩家 1'];
        delete data.hands['玩家 1']; 
        const aiPlayers = data.hands;

        setGameState({ gameType, hand: player1Hand, otherPlayers: aiPlayers, error: null });
      } else {
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: data.message });
      }
    } catch (err) {
      console.error('Capacitor HTTP request failed:', err);
      // 提供更详细的错误信息给用户
      setGameState({ gameType: null, hand: null, otherPlayers: {}, error: `网络请求失败，请检查网络连接或稍后再试。(${err.message})` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hand: null, otherPlayers: {}, error: null });
  };
  
  const handleUpdate = async () => {
      await Browser.open({ url: updateInfo.url });
      setUpdateInfo({ ...updateInfo, show: false });
  };

  const renderMainContent = () => {
    // ... (这部分逻辑保持不变)
    if (gameState.gameType && gameState.hand) {
      const gameProps = {
        playerHand: gameState.hand,
        otherPlayers: gameState.otherPlayers,
        onBackToLobby: handleBackToLobby,
      };
      if (gameState.gameType === 'thirteen') {
        return <ThirteenGame {...gameProps} />;
      }
      if (gameState.gameType === 'eight') {
        return <EightCardGame {...gameProps} />;
      }
    }
    
    switch (currentView) {
      case 'profile': return <UserProfile user={user} />;
      case 'transfer': return <TransferPoints currentUser={user} onTransferSuccess={() => setCurrentView('lobby')} />;
      case 'lobby': default: return <GameLobby onSelectGame={handleSelectGame} />;
    }
  };

  if (!user) {
    // ... (这部分逻辑保持不变)
    return (
      <>
        <Auth onLoginSuccess={handleLoginSuccess} />
        <UpdateModal show={updateInfo.show} version={updateInfo.version} notes={updateInfo.notes} onUpdate={handleUpdate} onCancel={() => setUpdateInfo({ ...updateInfo, show: false })} />
      </>
    );
  }

  return (
    // ... (这部分逻辑保持不变)
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
      main>
    </div>
  );
}

export default App;