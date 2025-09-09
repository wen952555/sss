import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import GameModeSelection from './components/GameModeSelection';
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

function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState({ gameType: null, gameMode: null, roomId: null, error: null, gameUser: null });
  const [currentView, setCurrentView] = useState('lobby');
  const [matchingStatus, setMatchingStatus] = useState({ thirteen: false, eight: false });
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [viewingGame, setViewingGame] = useState(null); // null, 'thirteen', or 'eight'
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null, gameUser: null });
    setMatchingStatus({ thirteen: false, eight: false });
    setViewingGame(null);
  };

  const handleSelectGameType = (gameType) => {
    setViewingGame(gameType);
    setCurrentView('modeSelection');
  };

  const handleSelectMode = async (gameMode, gameType = viewingGame) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!gameType || matchingStatus[gameType]) return;

    const currentUser = user; // Capture user state at time of call
    const userId = currentUser.id;

    setMatchingStatus(prev => ({ ...prev, [gameType]: true }));
    // Reset game state but keep mode info
    setGameState({ gameType, gameMode, roomId: null, error: null, gameUser: currentUser });

    try {
      const response = await fetch(`/api/index.php?action=match&gameType=${gameType}&gameMode=${gameMode}&userId=${userId}`);
      const data = await response.json();
      if (data.success && data.roomId) {
        setGameState({ gameType, gameMode, roomId: data.roomId, error: null, gameUser: currentUser });
        setViewingGame(null);
      } else {
        setMatchingStatus(prev => ({ ...prev, [gameType]: false }));
        setGameState(prev => ({ ...prev, error: data.message || '匹配失败，请重试' }));
      }
    } catch (err) {
      setMatchingStatus(prev => ({ ...prev, [gameType]: false }));
      setGameState(prev => ({ ...prev, error: '无法连接到匹配服务器' }));
    }
  };

  // This effect is for polling for a match for logged-in users.
  useEffect(() => {
    const currentGame = gameState.gameType;
    if (!currentGame || !matchingStatus[currentGame] || !user || (user && user.id === 0)) return; // Only for logged in users
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
      await handleSelectMode(gameState.gameMode);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [matchingStatus, user, gameState.roomId, gameState.gameType, gameState.gameMode]);

  const handleBackToLobby = () => {
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null, gameUser: null });
    setCurrentView('lobby');
    setMatchingStatus({ thirteen: false, eight: false });
    setViewingGame(null);
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
        user: gameState.gameUser || user, // Use gameUser if it exists, otherwise fallback to logged-in user
        onGameEnd: (updatedUser) => updateUserData(updatedUser),
      };
      if (gameState.gameType === 'thirteen') return <ThirteenGame {...gameProps} />;
    }
    if (gameState.error) return <p className="error-message">{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;

    switch (currentView) {
      case 'profile':
        return <UserProfile userId={user.id} user={user} onLogout={handleLogout} onTransferClick={() => setShowTransfer(true)} onBack={handleBackToLobby} />;
      case 'modeSelection':
        return <GameModeSelection gameType={viewingGame} onSelectMode={handleSelectMode} onBack={handleBackToLobby} />;
      case 'lobby':
      default:
        return (
          <GameLobby
            onSelectGameType={handleSelectGameType}
            matchingStatus={matchingStatus}
            user={user}
            onProfile={() => setCurrentView('profile')}
            onLogout={handleLogout}
            onLoginClick={() => setShowAuthModal(true)}
          />
        );
    }
  };

  return (
    <div className="app">
      <UpdateModal show={updateInfo.show} version={updateInfo.version} notes={updateInfo.notes} onUpdate={handleUpdate} onCancel={() => setUpdateInfo({ ...updateInfo, show: false })} />
      {showAuthModal && <Auth onLoginSuccess={handleLoginSuccess} onClose={() => setShowAuthModal(false)} />}
      <main className="app-main">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;