/**
 * 路径: frontend/src/App.jsx
 */
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import Game from './components/Game';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('game'); // 'game' or 'points'

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  if (!user) return <Auth onLoginSuccess={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />;

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {view === 'game' ? (
        <Game user={user} onOpenLobby={() => setView('points')} />
      ) : (
        <Lobby user={user} onBack={() => setView('game')} />
      )}
    </div>
  );
}

export default App;
