import React from 'react';
import Table from './components/Table';
import Controls from './components/Controls';
import ResultModal from './components/ResultModal';
import { GameProvider } from './contexts/GameContext';
import './assets/styles.css';

function App() {
  return (
    <GameProvider>
      <div className="app">
        <h1 className="game-title">豪华十三水</h1>
        <div className="game-container">
          <Table />
          <Controls />
          <ResultModal />
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
