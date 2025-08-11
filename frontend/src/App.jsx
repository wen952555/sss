// --- START OF FILE App.jsx (FINAL DB VERSION) ---

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
  // 简化 gameState，只关心当前是否在游戏中，以及游戏的基本信息
  const [gameState, setGameState] = useState({ 
    gameType: null, 
    gameMode: null, 
    roomId: null,
    error: null 
  });
  const [currentView, setCurrentView] = useState('lobby');
  const [isMatching, setIsMatching] = useState(false);
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
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null });
  };

  const handleSelectGame = async (gameType, gameMode) => {
    if (isMatching || !user) return;
    setIsMatching(true);
    setGameState({ ...gameState, error: null });

    try {
      // 发起匹配请求，后端会返回一个 roomId
      const response = await fetch(`/api/match.php?gameType=${gameType}&gameMode=${gameMode}&userId=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.roomId) {
        // 成功获取roomId，直接进入游戏状态，让游戏组件自己去轮询
        setGameState({
          gameType: gameType,
          gameMode: gameMode,
          roomId: data.roomId,
          error: null,
        });
      } else {
        // 匹配API可能因为在队列中而返回202，或者其他错误
        // 这里可以不做处理，或者给个提示
        console.warn("Match response:", data.message);
        // 为了简单，我们让用户继续等待，isMatching 状态保持
      }
    } catch (err) {
      setGameState({ ...gameState, error: '无法连接到匹配服务器' });
      setIsMatching(false); // 出错时停止匹配
    }
  };

  // 轮询匹配状态，直到游戏开始
  useEffect(() => {
    if (!isMatching || !user) return;

    const intervalId = setInterval(async () => {
        // 如果已经进入游戏，则停止此处的轮询
        if (gameState.roomId) {
            setIsMatching(false);
            clearInterval(intervalId);
            return;
        }
        // 如果没有在匹配，也停止
        if (!isMatching) {
            clearInterval(intervalId);
            return;
        }
        // 重新调用一次匹配，如果已在队列，API应能处理；如果匹配成功，API应能让我们知道
        // 这是一个简化的逻辑，更好的方式是有一个专门的 'match_status.php' API
        handleSelectGame(gameState.gameType, gameState.gameMode);
    }, 2000); // 每2秒尝试一次

    return () => clearInterval(intervalId);
  }, [isMatching, user, gameState.roomId]);


  const handleBackToLobby = () => {
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null });
    setCurrentView('lobby');
    setIsMatching(false); // 确保退出后停止匹配
  };

  const handleUpdate = async () => {
    if (updateInfo.url) await Browser.open({ url: updateInfo.url });
    setUpdateInfo({ ...updateInfo, show: false });
  };

  const handleTransferSuccess = (updatedUser) => {
    updateUserData(updatedUser);
    setShowTransfer(false);
    setCurrentView('profile');
  };

  const isInGame = !!gameState.roomId;

  const renderMainContent = () => {
    if (isInGame) {
      const gameProps = {
        roomId: gameState.roomId,
        gameMode: gameState.gameMode,
        onBackToLobby: handleBackToLobby,
        user: user,
        onGameEnd: (updatedUser) => updateUserData(updatedUser),
      };
      if (gameState.gameType === 'thirteen') return <ThirteenGame {...gameProps} />;
      if (gameState.gameType === 'eight') return <EightCardGame {...gameProps} />;
    }

    if (gameState.error) return <p className="error-message">{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;
    
    switch (currentView) {
      case 'profile': return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} />;
      case 'lobby':
      default: return <GameLobby onSelectGame={handleSelectGame} isMatching={isMatching} />;
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

// --- END OF FILE App.jsx (FINAL DB VERSION) ---