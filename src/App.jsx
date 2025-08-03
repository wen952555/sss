jsx
import React, { useState } from 'react';
import ThirteenGame from './components/ThirteenGame';
import Card, { sortCards } from './components/Card';
import './App.css'; // 确保 App.css 被导入

// 假设你有两张代表游戏的图片放在 public 目录下
// 例如：public/thirteen_game_banner.png
// 例如：public/eight_game_banner.png

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
    } catch (err) {
      setGameState({ gameType: null, hands: null, error: `无法连接到后端API。请确保后端服务正在运行。${err.message}` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hands: null, error: null });
  };

  if (gameState.gameType === 'thirteen' && gameState.hands) {
    const player1Hand = gameState.hands['玩家 1'];
    const otherPlayers = Object.fromEntries(Object.entries(gameState.hands).filter(([key]) => key !== '玩家 1'));
    return <ThirteenGame playerHand={player1Hand} otherPlayers={otherPlayers} onBackToLobby={handleBackToLobby} />;
  }

  // --- 这是修改的核心部分 ---
  return (
    <div className="lobby-container">
      <h1 className="lobby-title">游戏大厅</h1>
      <p className="lobby-subtitle">选择你想玩的游戏</p>
      
      <div className="game-selection-container">
        {/* 十三张板块 */}
        <div className="game-card" onClick={() => fetchHands(4, 13, 'thirteen')}>
          <img src="/thirteen_game_banner.png" alt="十三张游戏" className="game-card-image" />
          <div className="game-card-overlay">
            <h2 className="game-card-title">十三张</h2>
            <p className="game-card-description">经典策略，三分天注定，七分靠打拼。</p>
          </div>
        </div>

        {/* 八张板块 */}
        <div className="game-card" onClick={() => fetchHands(6, 8, 'eight')}>
          <img src="/eight_game_banner.png" alt="八张游戏" className="game-card-image" />
          <div className="game-card-overlay">
            <h2 className="game-card-title">八张</h2>
            <p className="game-card-description">快速对局，轻松上手，休闲娱乐首选。</p>
          </div>
        </div>
      </div>

      {gameState.error && <p className="error-message">{gameState.error}</p>}
      
      {/* 八张游戏结果的展示，可以考虑将其也做成一个独立的组件或模态框 */}
      {gameState.gameType === 'eight' && gameState.hands && (
         <div className="game-board-simple">
          <h2>八张游戏发牌结果:</h2>
          {Object.entries(gameState.hands).map(([player, hand]) => (
            <div key={player} className="player-hand-simple">
              <h3>{player}</h3>
              <div className="card-container-simple">
                {sortCards(hand).map((card, index) => (
                  <Card key={index} card={card} />
                ))}
              </div>
            </div>
          ))}
          <button onClick={handleBackToLobby} className="back-button">返回大厅</button>
         </div>
      )}
    </div>
  );
};

export default GameLobby;