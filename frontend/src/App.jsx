// --- UPDATED App.jsx: 支持试玩模式 ---

import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import PracticeThirteenGame from './components/PracticeThirteenGame';
import PracticeEightCardGame from './components/PracticeEightCardGame';
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
  const [gameState, setGameState] = useState({ gameType: null, gameMode: null, roomId: null, error: null });
  const [currentView, setCurrentView] = useState('lobby');
  const [isMatching, setIsMatching] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });
  const [showTransfer, setShowTransfer] = useState(false);

  // 试玩模式相关
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
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
    setPracticeMode(false);
    setPracticeConfig(null);
  };

  const handleSelectGame = async (gameType, gameMode) => {
    if (isMatching || !user) return;
    setIsMatching(true);
    setGameState({ ...gameState, error: null });

    try {
      const response = await fetch(`/api/match.php?gameType=${gameType}&gameMode=${gameMode}&userId=${user.id}`);
      const data = await response.json();
      if (data.success && data.roomId) {
        setGameState({ gameType: gameType, gameMode: gameMode, roomId: data.roomId, error: null });
      }
    } catch (err) {
      setGameState({ ...gameState, error: '无法连接到匹配服务器' });
      setIsMatching(false);
    }
  };

  useEffect(() => {
    if (!isMatching || !user) return;
    const intervalId = setInterval(async () => {
      if (gameState.roomId) {
        setIsMatching(false);
        clearInterval(intervalId);
        return;
      }
      if (!isMatching) {
        clearInterval(intervalId);
        return;
      }
      handleSelectGame(gameState.gameType, gameState.gameMode);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [isMatching, user, gameState.roomId]);

  const handleBackToLobby = () => {
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null });
    setCurrentView('lobby');
    setIsMatching(false);
    setPracticeMode(false);
    setPracticeConfig(null);
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

  // --- 试玩入口
  const handlePracticeStart = (gameType, aiCount) => {
    setPracticeMode(true);
    setPracticeConfig({ gameType, aiCount });
    setCurrentView('practice');
  };
  const handlePracticeEnd = () => {
    setPracticeMode(false);
    setPracticeConfig(null);
    setCurrentView('lobby');
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
    if (practiceMode && practiceConfig && user) {
      if (practiceConfig.gameType === 'thirteen')
        return <PracticeThirteenGame aiCount={practiceConfig.aiCount} onBackToLobby={handlePracticeEnd} user={user} />;
      if (practiceConfig.gameType === 'eight')
        return <PracticeEightCardGame aiCount={practiceConfig.aiCount} onBackToLobby={handlePracticeEnd} user={user} />;
    }
    if (gameState.error) return <p className="error-message">{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;
    switch (currentView) {
      case 'profile': return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} />;
      case 'lobby':
      default: return <GameLobby onSelectGame={handleSelectGame} isMatching={isMatching} onPractice={handlePracticeStart} />;
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
      {!isInGame && !practiceMode && (
        <TopBanner user={user} onLobby={() => { setCurrentView('lobby'); handleBackToLobby(); }} onProfile={() => setCurrentView('profile')} onLogout={handleLogout} />
      )}
      <main className="app-main">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;