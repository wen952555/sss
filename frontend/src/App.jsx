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
    // 清除上一次可能存在的错误信息
    setGameState(prev => ({ ...prev, error: null }));
    
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
        // --- 核心修正：使用稳定可靠的逻辑获取玩家手牌 ---
        let playerHand;
        let playerHandKey;

        if (data.hands['玩家 1']) {
          // 优先使用 '玩家 1'，和您原始逻辑一致，最稳定
          playerHandKey = '玩家 1';
        } else {
          // 如果 '玩家 1' 不存在（作为备用方案），则取返回的第一个手牌
          playerHandKey = Object.keys(data.hands)[0];
        }

        playerHand = data.hands[playerHandKey];
        delete data.hands[playerHandKey]; // 从牌堆中移除玩家手牌
        const aiPlayers = data.hands; // 剩下的都是AI手牌

        setGameState({ gameType, hand: playerHand, otherPlayers: aiPlayers, error: null });
        // --- 修正结束 ---

      } else {
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: data.message || '获取牌局数据失败，或返回数据为空。' });
      }
    } catch (err) {
      // 对 JSON 解析错误进行特殊处理
      if (err instanceof SyntaxError) {
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: '服务器响应格式错误，不是有效的JSON。请检查后端API或部署配置。' });
      } else {
        setGameState({ gameType: null, hand: null, otherPlayers: {}, error: `网络请求失败，请检查网络连接。(${err.message})` });
      }
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
    // 优先渲染游戏组件
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

    // 如果有错误信息，则在主内容区显示错误
    if (gameState.error) {
        return <p className="error-message" style={{ margin: '20px', padding: '15px', textAlign: 'center' }}>{gameState.error}</p>;
    }
    
    // 根据视图渲染其他组件
    if (showTransfer && user) {
      return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;
    }
    switch (currentView) {
      case 'profile':
        return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} />;
      case 'transfer':
        return <TransferPoints fromId={user.id} onClose={() => setCurrentView('profile')} onSuccess={handleTransferSuccess} />;
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
