// --- START OF FILE App.jsx ---

import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import './App.css';

import { Browser } from '@capacitor/browser';

// --- 工具函数：在前端生成并分发牌局 (用于离线试玩模式) ---
const createOfflineGame = (gameType) => {
  const ranksDeck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const suitsDeck = ['spades', 'hearts', 'clubs', 'diamonds'];
  let fullDeck = [];
  for (const suit of suitsDeck) {
    for (const rank of ranksDeck) {
      fullDeck.push({ rank, suit });
    }
  }

  // 洗牌 (Fisher-Yates shuffle)
  for (let i = fullDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
  }

  const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
  const playerCount = 4; // 试玩模式总是4人

  const playerHand = fullDeck.slice(0, cardsPerPlayer);
  const ai1Hand = fullDeck.slice(cardsPerPlayer, cardsPerPlayer * 2);
  const ai2Hand = fullDeck.slice(cardsPerPlayer * 2, cardsPerPlayer * 3);
  const ai3Hand = fullDeck.slice(cardsPerPlayer * 3, cardsPerPlayer * 4);

  // 模拟后端返回的数据结构
  return {
    success: true,
    hands: {
      '你': { top: playerHand.slice(0,3), middle: playerHand.slice(3,8), bottom: playerHand.slice(8,13) }, // 粗略分牌
      '电脑 2': { top: ai1Hand.slice(0,3), middle: ai1Hand.slice(3,8), bottom: ai1Hand.slice(8,13) },
      '电脑 3': { top: ai2Hand.slice(0,3), middle: ai2Hand.slice(3,8), bottom: ai2Hand.slice(8,13) },
      '电脑 4': { top: ai3Hand.slice(0,3), middle: ai3Hand.slice(3,8), bottom: ai3Hand.slice(8,13) },
    }
  };
};


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
  // 新增 isTrial 状态，传递给游戏组件
  const [gameState, setGameState] = useState({ gameType: null, hand: null, otherPlayers: {}, error: null, isTrial: false });
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
    setGameState({ gameType: null, hand: null, otherPlayers: {}, error: null, isTrial: false });
  };

  // --- 核心修改：handleSelectGame 函数 ---
  const handleSelectGame = async (gameType, isTrial) => {
    setGameState(prev => ({ ...prev, error: null }));
    let data;

    if (isTrial) {
      // --- 人机试玩（离线模式） ---
      data = createOfflineGame(gameType);
    } else {
      // --- 正式对战（在线模式） ---
      const playerCount = 1; // 正式对战总是请求自己的牌
      const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
      const params = `players=${playerCount}&cards=${cardsPerPlayer}&game=${gameType}`;
      const apiUrl = `/api/deal_cards.php?${params}`;

      try {
        const response = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        data = await response.json();
      } catch (err) {
        const errorMsg = err instanceof SyntaxError ? '服务器响应格式错误，请检查API或部署。' : `网络请求失败 (${err.message})`
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: errorMsg, isTrial: false });
        return;
      }
    }

    // --- 通用逻辑：处理获取到的牌局数据 ---
    if (data.success && data.hands && typeof data.hands === 'object' && Object.keys(data.hands).length > 0) {
      let playerHand;
      let playerHandKey = isTrial ? '你' : '玩家 1'; // 试玩和正式模式的key可能不同
      
      if (!data.hands[playerHandKey]) {
          playerHandKey = Object.keys(data.hands)[0]; // Fallback
      }

      playerHand = data.hands[playerHandKey];
      delete data.hands[playerHandKey];
      const aiPlayers = data.hands;

      // 将 isTrial 存入 gameState，以便传递给游戏组件
      setGameState({ gameType, hand: playerHand, otherPlayers: aiPlayers, error: null, isTrial });
    } else {
      setGameState({ gameType: null, hand: null, otherPlayers: {}, error: data.message || '获取牌局数据失败。', isTrial: false });
    }
  };


  const handleBackToLobby = () => {
    setGameState({ gameType: null, hand: null, otherPlayers: {}, error: null, isTrial: false });
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

  const isInGame = gameState.gameType && gameState.hand && typeof gameState.hand === 'object' && 'top' in gameState.hand;

  const renderMainContent = () => {
    if (isInGame) {
      const gameProps = {
        playerHand: gameState.hand,
        otherPlayers: gameState.otherPlayers,
        onBackToLobby: handleBackToLobby,
        isTrial: gameState.isTrial, // 将 isTrial 传递下去
      };
      if (gameState.gameType === 'thirteen') return <ThirteenGame {...gameProps} />;
      if (gameState.gameType === 'eight') return <EightCardGame {...gameProps} />;
    }
    if (gameState.error) return <p className="error-message" style={{ margin: '20px', padding: '15px', textAlign: 'center' }}>{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;
    
    switch (currentView) {
      case 'profile': return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} />;
      case 'transfer': return <TransferPoints fromId={user.id} onClose={() => setCurrentView('profile')} onSuccess={handleTransferSuccess} />;
      case 'lobby':
      default: return <GameLobby onSelectGame={handleSelectGame} />;
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
        <TopBanner user={user} onLobby={() => { setCurrentView('lobby'); handleBackToLobby(); }} onProfile={() => setCurrentView('profile')} onLogout={handleLogout} />
      )}
      <main className="app-main">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
// --- END OF FILE App.jsx ---