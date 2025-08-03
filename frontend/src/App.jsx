import React, { useState } from 'react';
import ThirteenGame from './components/ThirteenGame';
import Card, { sortCards } from './components/Card'; // 导入Card和排序函数
import './App.css';

const GameLobby = () => {
  const [gameState, setGameState] = useState({
    gameType: null,
    hands: null,
    error: null,
  });

  const fetchHands = async (players, cards, gameType) => {
    // ... (这部分代码保持不变)
    setGameState({ gameType: null, hands: null, error: null });
    try {
      const response = await fetch(`/api/deal_cards.php?players=${players}&cards=${cards}`);
      const data = await response.json();
      if (data.success) {
        setGameState({ gameType, hands: data.hands, error: null });
      } else {
        setGameState({ gameType: null, hands: null, error: data.message });
      }
    } catch (err) {
      setGameState({ gameType: null, hands: null, error: `无法连接到后端API。请确保后端服务正在运行，并且API地址正确。${err.message}` });
    }
  };

  // 返回大厅的函数
  const handleBackToLobby = () => {
    setGameState({ gameType: null, hands: null, error: null });
  };
  
  // 当游戏类型是十三张时，渲染游戏组件
  if (gameState.gameType === 'thirteen' && gameState.hands) {
    const player1Hand = gameState.hands['玩家 1'];
    const otherPlayers = Object.fromEntries(Object.entries(gameState.hands).filter(([key]) => key !== '玩家 1'));
    
    return <ThirteenGame 
              playerHand={player1Hand} 
              otherPlayers={otherPlayers} 
              onBackToLobby={handleBackToLobby} // 传递返回函数
           />;
  }

  // 默认显示游戏大厅
  return (
    <div className="app">
      <h1>游戏大厅</h1>
      <div className="game-controls">
        <button onClick={() => fetchHands(4, 13, 'thirteen')}>开始十三张 (4人)</button>
        <button onClick={() => fetchHands(6, 8, 'eight')}>开始八张 (6人)</button>
      </div>

      {gameState.error && <p className="error-message">{gameState.error}</p>}
      
      {/* 八张游戏结果展示 (保持不变) */}
      {gameState.gameType === 'eight' && gameState.hands && (
         <div className="game-board">
          <h2>八张游戏发牌结果:</h2>
          {Object.entries(gameState.hands).map(([player, hand]) => (
            <div key={player} className="player-hand">
              <h3>{player}</h3>
              <div className="card-container">
                {/* 使用 sortCards 对八张的牌也进行排序显示 */}
                {sortCards(hand).map((card, index) => (
                  <Card key={index} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameLobby;
