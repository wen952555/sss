// --- FINAL VERSION: App.jsx (独立匹配状态, 全流程修复) ---

import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
import ModeSelection from './components/ModeSelection';
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
  const [selectedGameType, setSelectedGameType] = useState(null);
  const [matchingStatus, setMatchingStatus] = useState({ thirteen: false, eight: false });
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });
  const [showTransfer, setShowTransfer] = useState(false);

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
    setMatchingStatus({ thirteen: false, eight: false });
    setCurrentView('lobby');
    setSelectedGameType(null);
  };

  const handleSelectGame = (gameType) => {
    setSelectedGameType(gameType);
    setCurrentView('modeSelection');
  };

  const handleSelectMode = async (gameType, gameMode) => {
    if (matchingStatus[gameType] || !user) return;
    setMatchingStatus(prev => ({ ...prev, [gameType]: true }));
    setGameState({ ...gameState, gameType, gameMode, error: null });
    try {
      const response = await fetch(`/api/match.php?gameType=${gameType}&gameMode=${gameMode}&userId=${user.id}`);
      const data = await response.json();
      if (data.success && data.roomId) {
        setGameState({ gameType: gameType, gameMode: gameMode, roomId: data.roomId, error: null });
        setCurrentView('game');
      } else {
        setMatchingStatus(prev => ({ ...prev, [gameType]: false }));
        setGameState({ ...gameState, error: data.message || '匹配失败，请重试' });
      }
    } catch (err) {
      setMatchingStatus(prev => ({ ...prev, [gameType]: false }));
      setGameState({ ...gameState, error: '无法连接到匹配服务器' });
    }
  };

  useEffect(() => {
    const currentGame = gameState.gameType;
    if (!currentGame || !matchingStatus[currentGame] || !user) return;
    const intervalId = setInterval(async () => {
      if (gameState.roomId) {
        setMatchingStatus(prev => ({ ...prev, [currentGame]: false }));
        clearInterval(intervalId);
        return;
      }
      if (!matchingStatus[currentGame]) {
        clearInterval(intervalId);
        return;
      }
      await handleSelectMode(currentGame, gameState.gameMode);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [matchingStatus, user, gameState.roomId, gameState.gameType, gameState.gameMode]);

  const handleBackToLobby = () => {
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null });
    setCurrentView('lobby');
    setMatchingStatus({ thirteen: false, eight: false });
    setSelectedGameType(null);
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

  // --- 试玩入口 ---
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

  const renderMainContent = () => {
    if (currentView === 'game' && gameState.roomId) {
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

    if (currentView === 'modeSelection' && selectedGameType) {
        return <ModeSelection gameType={selectedGameType} onSelectMode={handleSelectMode} onBack={handleBackToLobby} />;
    }

    if (gameState.error) return <p className="error-message">{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;

    switch (currentView) {
      case 'profile': return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} />;
      case 'lobby':
      default:
        return (
          <GameLobby
            onSelectGame={handleSelectGame}
            matchingStatus={matchingStatus}
          />
        );
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
// --- END FINAL VERSION ---