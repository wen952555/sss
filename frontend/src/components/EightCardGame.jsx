import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css'; // 复用十三张的样式
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const [topLane, setTopLane] = useState(playerHand.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand.bottom || []);
  // ... other states are the same ...
  const [isLoading, setIsLoading] = useState(false);

  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  useEffect(() => {
    // ... evaluation logic is the same ...
  }, [topLane, middleLane, bottomLane]);
  
  const handleCardClick = (card, laneName) => {
    // ... card interaction logic is the same ...
  };

  // --- 新增：智能分牌处理函数 ---
  const handleAutoSort = async () => {
    setIsLoading(true);
    const currentHand = [...topLane, ...middleLane, ...bottomLane];
    
    try {
      const response = await fetch('/api/auto_sort_hand.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hand: currentHand, gameType: 'eight' }),
      });
      const data = await response.json();
      if (data.success) {
        setTopLane(data.arrangedHand.top);
        setMiddleLane(data.arrangedHand.middle);
        setBottomLane(data.arrangedHand.bottom);
      } else {
        alert(`智能分牌失败: ${data.message}`);
      }
    } catch (error) {
      alert(`连接后端失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    // ... confirm logic is the same ...
  };

  return (
    <div className="thirteen-game-new">
      <div className="game-header">
        <button onClick={onBackToLobby} className="quit-button">退出游戏</button>
      </div>
      <div className="player-status-area">
        <div className="player-box self">你</div>
        {Object.keys(otherPlayers).map((playerName, index) => (
          <div key={index} className="player-box opponent">{playerName}<br/><span>已理牌</span></div>
        ))}
      </div>
      {/* ... rest of the JSX is the same ... */}
      <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        {/* ... lanes ... */}
      </div>
      <div className="game-actions-new">
        {/* 绑定新的处理函数 */}
        <button onClick={handleAutoSort} className="action-button-new auto-sort" disabled={isLoading}>智能分牌</button>
        <button onClick={handleConfirm} className="action-button-new confirm" disabled={isInvalid || isLoading}>确认牌型</button>
      </div>
    </div>
  );
};

export default EightCardGame;
