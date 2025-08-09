// --- START OF FILE App.jsx (FIXED & MORE ROBUST) ---

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

  for (let i = fullDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
  }

  const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
  
  const dealUnsortedHand = (deck, startIndex) => {
    const hand = deck.slice(startIndex, startIndex + cardsPerPlayer);
    const topSize = gameType === 'thirteen' ? 3 : (gameType === 'eight' ? 2 : 3);
    const middleSize = gameType === 'thirteen' ? 5 : (gameType === 'eight' ? 3 : 5);
    return {
      top: hand.slice(0, topSize),
      middle: hand.slice(topSize, topSize + middleSize),
      bottom: hand.slice(topSize + middleSize)
    };
  };
  
  const playerCount = gameType === 'thirteen' ? 4 : 6; 

  let hands = { '你': dealUnsortedHand(fullDeck, 0) };
  for (let i = 1; i < playerCount; i++) {
    hands[`电脑 ${i + 1}`] = dealUnsortedHand(fullDeck, cardsPerPlayer * i);
  }

  return {
    success: true,
    hands: hands
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

  const handleSelectGame = async (gameType, isTrial) => {
    setGameState(prev => ({ ...prev, error: null }));
    let data;

    if (isTrial) {
      data = createOfflineGame(gameType);
    } else {
      const playerCount = 1;
      const cardsPerPlayer = gameType === 'thirteen' ? 13 : 8;
      const params = `players=${playerCount}&cards=${cardsPerPlayer}&game=${gameType}`;
      const apiUrl = `/api/deal_cards.php?${params}`;

      try {
        const response = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        data = await response.json();
      } catch (err) {
        const errorMsg = err instanceof SyntaxError ? '服务器响应格式错误' : `网络请求失败 (${err.message})`
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: errorMsg, isTrial: false });
        return;
      }
    }

    if (data.success && data.hands && typeof data.hands === 'object' && Object.keys(data.hands).length > 0) {
      let playerHandKey = isTrial ? '你' : (data.hands['玩家 1'] ? '玩家 1' : Object.keys(data.hands)[0]);
      
      const playerHand = data.hands[playerHandKey];
      
      // --- 核心修复：增加对 playerHand 结构的健壮性检查 ---
      if (playerHand && typeof playerHand === 'object' && Array.isArray(playerHand.top) && Array.isArray(playerHand.middle) && Array.isArray(playerHand.bottom)) {
        delete data.hands[playerHandKey];
        const aiPlayers = data.hands;
        setGameState({ gameType, hand: playerHand, otherPlayers: aiPlayers, error: null, isTrial });
      } else {
        // 如果数据结构不正确，则设置错误信息
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: '从服务器获取的牌局数据格式不正确', isTrial: false });
      }
    } else {
      setGameState({ gameType: null, hand: null, otherPlayers: {}, error: data.message || '获取牌局数据失败', isTrial: false });
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
        isTrial: gameState.isTrial,
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
// --- END OF FILE App.jsx (FIXED & MORE ROBUST) ---