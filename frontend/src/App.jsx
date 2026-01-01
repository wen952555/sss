import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import SessionList from './components/SessionList';
import Board from './components/Board';

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [view, setView] = useState('lobby'); // lobby | game

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  if (!user) return <Auth onLoginSuccess={handleLogin} />;

  return (
    <div style={{ height: '100%' }}>
      {view === 'lobby' ? (
        <SessionList user={user} onEnterGame={() => setView('game')} />
      ) : (
        <Board user={user} onBack={() => setView('lobby')} />
      )}
    </div>
  );
}