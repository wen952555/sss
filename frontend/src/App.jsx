import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import DoudizhuPage from './pages/DoudizhuPage';
import MahjongPage from './pages/MahjongPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/thirteen-cards" element={<GamePage />} />
      <Route path="/doudizhu" element={<DoudizhuPage />} />
      <Route path="/mahjong" element={<MahjongPage />} />
    </Routes>
  );
}

export default App;
