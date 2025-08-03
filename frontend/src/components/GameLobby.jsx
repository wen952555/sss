import React, { useState } from 'react';
import ThirteenGame from './ThirteenGame';
import Card, { sortCards } from './Card'; // 导入Card和排序函数
import '../App.css'; // 使用App.css的样式

const GameLobby = () => {
  const [gameState, setGameState] = useState({
    gameType: null,
    hands: null,
    error: null,
  });

  const fetchHands = async (players, cards, gameType) => {
    setGameState({ gameType: null, hands: null, error: null });
    try {
      const response = await fetch(`/api/deal_cards.php?players=${players}&cards=${cards}`);
      const data = await response.json();
      if (data.success) {
        setGameState({ gameType, hands: data.hands, error: null });
      } else {
        setGameState({ gameType: null, hands: null, error: data.message });
      }
    } catch (err)      {
      setGameState({ gameType: null, hands: null, error: `无法连接到后端API。请确保后端服务正在运行，并且API地址正确。${err.message}` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hands: null, error: null });
  };
  
  if (gameState.gameType === 'thirteen' && gameState.hands) {
    const player1Hand = gameState.hands['玩家 1'];
    return <ThirteenGame playerHand={player1Hand} onBackToLobby={handleBackToLobby} />;
  }

  return (
    <div className="game-lobby">
      <h2>选择一个游戏开始</h2>
      <div className="game-controls">
        <button onClick={() => fetchHands(4, 13, 'thirteen')}>开始十三张 (4人)</button>
        {/* 如果有其他游戏，可以在这里添加 */}
      </div>

      {gameState.error && <p className="error-message">{gameState.error}</p>}
      
      {/* 可以在这里为其他游戏类型添加结果展示 */}
    </div>
  );
};

export default GameLobby;
