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
import { Http } from '@capacitor/http';

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
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 用于更新本地 user 数据（如积分变化）
  const updateUserData = (newUser) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

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

  const handleSelectGame = async (gameType, isTrial) => {
    const playerCount = isTrial ? 4 : 1;
    const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
    const params = `players=${playerCount}&cards=${cardsPerPlayer}&game=${gameType}`;
    const apiUrl = `https://9522.ip-ddns.com/api/deal_cards.php?${params}`;

    try {
      const response = await Http.get({
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json'
        }
      });
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

  // 赠送积分后回调，刷新用户积分
  const handleTransferSuccess = (updatedUser) => {
    updateUserData(updatedUser);
    setShowTransfer(false);
    setCurrentView('profile');
  };

  const renderMainContent = () => {
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

    if (showTransfer && user) {
      return (
        <TransferPoints
          fromId={user.id}
          onClose={() => setShowTransfer(false)}
          onSuccess={handleTransferSuccess}
        />
      );
    }

    switch (currentView) {
      case 'profile':
        return (
          <UserProfile
            userId={user.id}
            user={user}
            onLogout={handleLogout}
            onTransferClick={() => setShowTransfer(true)}
          />
        );
      case 'transfer':
        return (
          <TransferPoints
            fromId={user.id}
            onClose={() => setCurrentView('profile')}
            onSuccess={handleTransferSuccess}
          />
        );
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
