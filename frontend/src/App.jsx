import React, { useState } from 'react';
import ThirteenGame from './components/ThirteenGame';
import Card from './components/Card'; // Import Card
import './App.css';

const GameLobby = () => {
  const [gameState, setGameState] = useState({
    gameType: null,
    hands: null,
    error: null,
  });

  const fetchHands = async (players, cards, gameType) => {
    setGameState({ gameType: null, hands: null, error: null });
    try {
      // 更新 API URL，使其指向前端域名下的 /api/ 路径
      const response = await fetch(`/api/deal_cards.php?players=${players}&cards=${cards}`);
      const data = await response.json();
      if (data.success) {
        setGameState({ gameType, hands: data.hands, error: null });
      } else {
        setGameState({ gameType: null, hands: null, error: data.message });
      }
    } catch (err) {
      // 修复：删除未转义的换行符，或者使用模板字符串
      setGameState({ gameType: null, hands: null, error: `无法连接到后端API。请确保后端服务正在运行，并且API地址正确。${err.message}` });
    }
  };

  if (gameState.gameType === 'thirteen' && gameState.hands) {
    const player1Hand = gameState.hands['玩家 1'];
    // In a real game, you wouldn't see other players' hands until showdown.
    // We pass them in case we want to display placeholders.
    const otherPlayers = Object.fromEntries(Object.entries(gameState.hands).filter(([key]) => key !== '玩家 1'));
    
    return <ThirteenGame playerHand={player1Hand} otherPlayers={otherPlayers} />;
  }

  return (
    <div className="app">
      <h1>游戏大厅</h1>
      <div className="game-controls">
        <button onClick={() => fetchHands(4, 13, 'thirteen')}>开始十三张 (4人, 每人13张)</button>
        <button onClick={() => fetchHands(6, 8, 'eight')}>开始八张 (6人, 每人8张)</button>
      </div>

      {gameState.error && <p className="error-message">{gameState.error}</p>}
      
      {/* Fallback for "Eight" game - just display cards like before */}
      {gameState.gameType === 'eight' && gameState.hands && (
         <div className="game-board">
          <h2>八张游戏发牌结果:</h2>
          {Object.entries(gameState.hands).map(([player, hand]) => (
            <div key={player} className="player-hand">
              <h3>{player}</h3>
              <div className="card-container">
                {hand.map((card, index) => (
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
