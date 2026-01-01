import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import SessionList from './components/SessionList';
import Board from './components/Board';

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [view, setView] = useState('sessions'); // sessions | game

  if (!user) return <Auth onLoginSuccess={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />;

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {view === 'sessions' ? (
        <SessionList user={user} onJoin={() => setView('game')} />
      ) : (
        <Board user={user} onBack={() => setView('sessions')} />
      )}
    </div>
  );
}