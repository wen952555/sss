import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import Header from './components/Header';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <div className="content">
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
