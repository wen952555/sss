import React, { useState, useEffect } from 'react';
import GameLobby from './components/GameLobby';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import TransferPoints from './components/TransferPoints';
import ThirteenGame from './components/ThirteenGame';
import EightCardGame from './components/EightCardGame';
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
  const [gameState, setGameState] = useState({
    roomId: null,
    gameType: null,
    gameMode: null,
    error: null,
    players: [],
    playersCount: 0,
    status: 'lobby',
    hand: null,
    result: null,
  });
  const [currentView, setCurrentView] = useState('lobby');
  const [matchingStatus, setMatchingStatus] = useState({ thirteen: false, eight: false });
  const [updateInfo, setUpdateInfo] = useState({ show: false, version: '', notes: [], url: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [viewingGame, setViewingGame] = useState(null);
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
    setGameState({ roomId: null, gameType: null, gameMode: null, error: null, players: [], status: 'lobby', hand: null, result: null });
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

    setMatchingStatus(prev => ({ ...prev, [gameType]: true }));
    setGameState(prev => ({ ...prev, gameType, gameMode, error: null }));

    try {
      const response = await fetch(`/api/index.php?action=match&gameType=${gameType}&gameMode=${gameMode}&userId=${user.id}`);
      const data = await response.json();
      if (data.success && data.roomId) {
        setGameState(prev => ({ ...prev, roomId: data.roomId, status: 'waiting' }));
        setViewingGame(null);
        setCurrentView('game'); // Switch to game view
      } else {
        setGameState(prev => ({ ...prev, error: data.message || '匹配失败，请重试' }));
      }
    } catch (err) {
      setGameState(prev => ({ ...prev, error: '无法连接到匹配服务器' }));
    } finally {
      setMatchingStatus(prev => ({ ...prev, [gameType]: false }));
    }
  };

  // Central polling logic for game status
  useEffect(() => {
    if (!gameState.roomId || !user) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/index.php?action=game_status&roomId=${gameState.roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setGameState(prev => ({
            ...prev,
            status: data.gameStatus,
            players: data.players,
            playersCount: data.playersCount,
            hand: data.hand || prev.hand,
            result: data.result || prev.result,
          }));
        } else {
          setGameState(prev => ({ ...prev, error: data.message || '无法获取游戏状态' }));
        }
      } catch (error) {
        setGameState(prev => ({ ...prev, error: '服务器连接失败' }));
      }
    };

    const intervalId = setInterval(poll, 3000);
    poll(); // Initial fetch

    return () => clearInterval(intervalId);
  }, [gameState.roomId, user]);

  const handleBackToLobby = () => {
    setGameState({ roomId: null, gameType: null, gameMode: null, error: null, players: [], status: 'lobby', hand: null, result: null });
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
        ...gameState,
        user: user,
        onBackToLobby: handleBackToLobby,
        onGameEnd: (updatedUser) => updateUserData(updatedUser),
      };
      if (gameState.gameType === 'thirteen') return <ThirteenGame {...gameProps} />;
      if (gameState.gameType === 'eight') return <EightCardGame {...gameProps} />;
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