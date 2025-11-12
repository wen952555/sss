import React, { useState } from 'react';
import GameBoardIntegrated from './components/GameBoardIntegrated';

function App() {
  const [currentView, setCurrentView] = useState('lobby');
  const [currentTable, setCurrentTable] = useState(null);

  const handleJoinTable = (tableId) => {
    setCurrentTable(tableId);
    setCurrentView('game');
  };

  const handleExitGame = () => {
    setCurrentView('lobby');
    setCurrentTable(null);
  };

  return (
    <div className="App">
      {currentView === 'lobby' ? (
        // 你的大厅组件
        <div>
          <button onClick={() => handleJoinTable(1)}>
            加入游戏
          </button>
        </div>
      ) : (
        <GameBoardIntegrated 
          tableId={currentTable}
          onExitGame={handleExitGame}
        />
      )}
    </div>
  );
}

export default App;