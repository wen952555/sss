import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';
import { getCardImageUrl } from '../utils/cardHelper';

const GameBoard = ({ tableId }) => {
  const [gameState, setGameState] = useState(null);
  const [myCards, setMyCards] = useState([]); // 初始13张手牌
  const [topLane, setTopLane] = useState([]); // 头道 (3张)
  const [middleLane, setMiddleLane] = useState([]); // 中道 (5张)
  const [bottomLane, setBottomLane] = useState([]); // 尾道 (5张)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGameData = async () => {
      // 1. 调用API获取当前游戏状态和手牌
      // const response = await apiService.getGameStatus(tableId);
      // setMyCards(response.cards);
      
      // --- 示例数据 ---
      setMyCards(['s1', 's2', 's3', 'h4', 'h5', 'h6', 'c7', 'c8', 'c9', 'd10', 'd11', 'd12', 'd13']);
      setIsLoading(false);
    };

    fetchGameData();
  }, [tableId]);
  
  // ----- 这里需要实现卡牌的拖拽逻辑 -----
  // 您可以使用 react-dnd 或其他拖拽库
  // 或者通过点击事件来移动卡牌
  const handleCardClick = (card, sourceLane) => {
      console.log(`点击了卡牌 ${card} 从 ${sourceLane}`);
      // 实现将卡牌移动到不同道的逻辑...
  }
  
  const handleSubmitHand = async () => {
    // 1. 验证牌型是否合法 (头道3张, 中道5张, 尾道5张)
    // 2. 验证牌力大小 (尾道 > 中道 > 头道) -> 这部分验证后端必须做，前端做是优化体验
    if (topLane.length !== 3 || middleLane.length !== 5 || bottomLane.length !== 5) {
      alert('请将13张牌都摆放好');
      return;
    }
    
    const hand = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane
    };
    
    // 3. 调用API提交理牌结果
    // await apiService.submitHand(tableId, hand);
    alert(`提交理牌结果 (功能开发中): ${JSON.stringify(hand)}`);
  };

  if (isLoading) return <div>加载游戏中...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="game-board">
      <h3>我的手牌</h3>
      <div className="cards-container my-hand">
        {myCards.map(card => (
          <img key={card} src={getCardImageUrl(card)} alt={card} className="card" onClick={() => handleCardClick(card, 'my-hand')} />
        ))}
      </div>
      
      <hr />
      
      <h3>头道 (3张)</h3>
      <div className="cards-container top-lane">
        {topLane.map(card => (
          <img key={card} src={getCardImageUrl(card)} alt={card} className="card" onClick={() => handleCardClick(card, 'top-lane')} />
        ))}
      </div>
      
      <h3>中道 (5张)</h3>
      <div className="cards-container middle-lane">
        {middleLane.map(card => (
          <img key={card} src={getCardImageUrl(card)} alt={card} className="card" onClick={() => handleCardClick(card, 'middle-lane')} />
        ))}
      </div>
      
      <h3>尾道 (5张)</h3>
      <div className="cards-container bottom-lane">
        {bottomLane.map(card => (
          <img key={card} src={getCardImageUrl(card)} alt={card} className="card" onClick={() => handleCardClick(card, 'bottom-lane')} />
        ))}
      </div>
      
      <button onClick={handleSubmitHand}>确定</button>
    </div>
  );
};

export default GameBoard;