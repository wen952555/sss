import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import GamePage from './pages/GamePage';
import DoudizhuPage from './pages/DoudizhuPage';
import MahjongPage from './pages/MahjongPage';
import LoginPage from './pages/LoginPage';
import PointsPage from './pages/PointsPage';
import ThirteenWatersPage from './pages/ThirteenWatersPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/thirteen-cards" element={<GamePage />} />
      <Route path="/doudizhu" element={<DoudizhuPage />} />
      <Route path="/mahjong" element={<MahjongPage />} />
      <Route path="/thirteen-waters" element={<ThirteenWatersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/points" element={<PointsPage />} />
    </Routes>
  );
}

export default App;
