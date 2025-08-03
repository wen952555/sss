// frontend/src/components/GameLobby.jsx
import React, { useState } from 'react';
import ThirteenGame from './ThirteenGame';
import UserProfile from './UserProfile';
import TransferPoints from './TransferPoints'; // 准备好要引入的组件
import Card, { sortCards } from './Card';
import '../App.css'; // 使用根目录的App.css

const GameLobby = ({ userId, user, onLogout, updateUser }) => {
  const [gameState, setGameState] = useState({ gameType: null, hands: null, error: null });
  const [isTransferring, setIsTransferring] = useState(false); // 控制赠送弹窗的显示

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
      setGameState({ gameType: null, hands: null, error: `无法连接到后端API。${err.message}` });
    }
  };

  const handleBackToLobby = () => {
    setGameState({ gameType: null, hands: null, error: null });
  };
  
  // 赠送积分成功后的回调
  const handleTransferSuccess = (updatedUser) => {
      updateUser(updatedUser); // 更新顶层App的user state
      setIsTransferring(false); // 关闭弹窗
  }

  // --- 渲染逻辑 ---

  if (gameState.gameType === 'thirteen' && gameState.hands) {
    const player1Hand = gameState.hands['玩家 1'];
    return <ThirteenGame playerHand={player1Hand} onBackToLobby={handleBackToLobby} />;
  }

  return (
    <div className="lobby-container">
      {/* 用户信息和操作栏 */}
      <UserProfile 
        userId={userId} 
        user={user} 
        onLogout={onLogout}
        onTransferClick={() => setIsTransferring(true)}
      />

      {/* 赠送积分弹窗 */}
      {isTransferring && (
        <TransferPoints 
            fromId={userId}
            onClose={() => setIsTransferring(false)}
            onSuccess={handleTransferSuccess}
        />
      )}

      <h1 className="lobby-title">游戏大厅</h1>
      <p className="lobby-subtitle">选择你想玩的游戏</p>
      
      <div className="game-selection-container">
        <div className="game-card" onClick={() => fetchHands(4, 13, 'thirteen')}>
          <img src="/thirteen_game_banner.png" alt="十三张游戏" className="game-card-image" />
          <div className="game-card-overlay">
            <h2 className="game-card-title">十三张</h2>
            <p className="game-card-description">经典策略，与AI对战。</p>
          </div>
        </div>
        <div className="game-card" onClick={() => fetchHands(6, 8, 'eight')}>
          <img src="/eight_game_banner.png" alt="八张游戏" className="game-card-image" />
          <div className="game-card-overlay">
            <h2 className="game-card-title">八张</h2>
            <p className="game-card-description">快速对局，休闲首选。</p>
          </div>
        </div>
      </div>

      {gameState.error && <p className="error-message">{gameState.error}</p>}
      
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
