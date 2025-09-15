import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import GameModeSelection from './components/GameModeSelection';
import GameRules from './components/GameRules';
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
  const [matchingStatus, setMatchingStatus] = useState({ thirteen: false, 'thirteen-5': false });
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [viewingGame, setViewingGame] = useState(null); // null, 'thirteen', or 'eight'
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUser(user);

      const storedGame = localStorage.getItem('activeGame');
      if (storedGame) {
        const { roomId, gameType, gameMode, playerCount } = JSON.parse(storedGame);
        setGameState({ roomId, gameType, gameMode, playerCount, error: null, gameUser: user });
      }
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
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('activeGame');
    setUser(null);
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null, gameUser: null });
    setMatchingStatus({ thirteen: false, 'thirteen-5': false });
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

    let playerCount = 4; // Default player count
    let finalGameMode = gameMode;

    // If the gameMode string contains player count info (e.g., "4-normal"), parse it.
    if (gameMode.includes('-')) {
      const parts = gameMode.split('-');
      playerCount = parseInt(parts[0], 10);
      finalGameMode = parts[1];
    }

    const currentUser = user; // Capture user state at time of call
    const userId = currentUser.id;

    setMatchingStatus(prev => ({ ...prev, [gameType]: true }));
    // Reset game state but keep mode info
    setGameState({ gameType, gameMode, roomId: null, error: null, gameUser: currentUser, playerCount });

    try {
      const response = await fetch(`/api/index.php?action=match&gameType=${gameType}&gameMode=${finalGameMode}&userId=${userId}&playerCount=${playerCount}`);
      const data = await response.json();
      if (data.success && data.roomId) {
        const newGameState = {
          gameType,
          gameMode,
          roomId: data.roomId,
          error: null,
          gameUser: currentUser,
          playerCount
        };
        setGameState(newGameState);
        localStorage.setItem('activeGame', JSON.stringify({
          roomId: data.roomId,
          gameType,
          gameMode,
          playerCount
        }));
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
      // Pass both gameMode and gameType for polling
      await handleSelectMode(gameState.gameMode, gameState.gameType);
    }, 2000);
    return () => clearInterval(intervalId);
  }, [matchingStatus, user, gameState.roomId, gameState.gameType, gameState.gameMode]);

  const handleBackToLobby = () => {
    localStorage.removeItem('activeGame');
    setGameState({ gameType: null, gameMode: null, roomId: null, error: null, gameUser: null });
    setCurrentView('lobby');
    setMatchingStatus({ thirteen: false, 'thirteen-5': false });
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
        playerCount: gameState.playerCount,
      };
      if (['thirteen', 'thirteen-5'].includes(gameState.gameType)) {
        return <ThirteenGame {...gameProps} gameType={gameState.gameType} />;
      }
    }
    if (gameState.error) return <p className="error-message">{gameState.error}</p>;
    if (showTransfer && user) return <TransferPoints fromId={user.id} onClose={() => setShowTransfer(false)} onSuccess={handleTransferSuccess} />;

    switch (currentView) {
      case 'rules':
        return <GameRules onBack={() => setCurrentView('lobby')} />;
      case 'profile':
        return <UserProfile userId={user.id} user={user} onTransferClick={() => setShowTransfer(true)} onBack={handleBackToLobby} />;
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
            onShowRules={() => setCurrentView('rules')}
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