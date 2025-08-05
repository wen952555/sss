import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import './App.css';

import { Browser } from '@capacitor/browser';

const UpdateModal = ({ show, version, notes, onUpdate, onCancel }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>发现新版本: {version}</h3>
        <div className="release-notes"><p>更新内容:</p><ul>{notes.map((note, index) => <li key={index}>{note}</li>)}</ul></div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">稍后提醒</button>
          <button onClick={onUpdate} className="update-btn">立即更新</button>
        </div>
      </div>
    </div>
  );
};

function TopBanner({ user, onLobby, onProfile, onLogout }) {
  return (
    <div className="top-banner">
      <div className="banner-title">游戏中心</div>
      <div className="banner-welcome">欢迎, {user.phone}</div>
      <div className="banner-actions">
        <button className="banner-btn" onClick={onLobby}>游戏大厅</button>
        <button className="banner-btn" onClick={onProfile}>我的资料</button>
        <button className="banner-btn" onClick={onLogout}>退出登录</button>
      </div>
    </div>
  );
}

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
    const apiUrl = `/api/deal_cards.php?${params}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success && data.hands && typeof data.hands === 'object' && Object.keys(data.hands).length > 0) {
        // --- 核心修正：不再依赖写死的 '玩家 1' 键名 ---
        const handKeys = Object.keys(data.hands);
        const playerHandKey = handKeys[0]; // 默认取第一个作为玩家手牌
        
        const playerHand = data.hands[playerHandKey];
        delete data.hands[playerHandKey]; // 从牌堆中移除玩家手牌
        const aiPlayers = data.hands; // 剩下的都是AI手牌

        setGameState({ gameType, hand: playerHand, otherPlayers: aiPlayers, error: null });
        // --- 修正结束 ---
      } else {
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: data.message || '获取牌局数据失败，或返回数据为空。' });
      }
    } catch (err) {
      setGameState({ gameType: null, hand: null, otherPlayers: {}, error: `网络请求失败，请检查网络连接或稍后再试。(${err.message})` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hand: null, otherPlayers: {}, error: null });
    setCurrentView('lobby');
  };

  const handleUpdate = async () => {
    await Browser.open({ url: updateInfo.url });
    setUpdateInfo({ ...updateInfo, show: false });
  };

  const handleTransferSuccess = (updatedUser) => {
    updateUserData(updatedUser);
    setShowTransfer(false);
    setCurrentView('profile');
  };

  const isInGame = gameState.gameType && Array.isArray(gameState.hand);

  const renderMainContent = () => {
    if (isInGame) {
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
        // 如果有错误信息，则在主内容区显示
        if (gameState.error) {
            return <p className="error-message">{gameState.error}</p>;
        }
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
      {!isInGame && (
        <TopBanner
          user={user}
          onLobby={() => { setCurrentView('lobby'); handleBackToLobby(); }}
          onProfile={() => setCurrentView('profile')}
          onLogout={handleLogout}
        />
      )}
      <main className="app-main">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
