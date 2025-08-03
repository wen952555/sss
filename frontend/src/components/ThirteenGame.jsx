import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ playerHand, onBackToLobby }) => {
  // 直接接收分好的牌墩
  const [topLane, setTopLane] = useState(playerHand.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand.bottom || []);

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);

  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);

  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const top = evaluateHand(topLane);
    const middle = evaluateHand(middleLane);
    const bottom = evaluateHand(bottomLane);
    setTopLaneHand(top);
    setMiddleLaneHand(middle);
    setBottomLaneHand(bottom);

    if (topLane.length === 3 && middleLane.length === 5 && bottomLane.length === 5) {
      const middleVsBottom = compareHands(middle, bottom);
      const topVsMiddle = compareHands(top, middle);
      setIsInvalid(middleVsBottom > 0 || topVsMiddle > 0);
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane]);
  
  const resetGame = () => {
    // 重置时需要重新获取后端数据，这里简单地返回大厅
    onBackToLobby();
  };

  // --- 全新的卡牌交换逻辑 ---
  const handleCardClick = (card, laneName) => {
    if (!selectedCard) {
      // 第一次点击：选中一张牌
      setSelectedCard(card);
      setSelectedLane(laneName);
    } else {
      // 第二次点击：交换两张牌
      if (selectedLane === laneName) {
        // --- 墩内交换 ---
        const laneSetters = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };
        const currentLane = { top: topLane, middle: middleLane, bottom: bottomLane }[laneName];
        
        const index1 = currentLane.findIndex(c => c.rank === selectedCard.rank && c.suit === selectedCard.suit);
        const index2 = currentLane.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        
        const newLane = [...currentLane];
        [newLane[index1], newLane[index2]] = [newLane[index2], newLane[index1]]; // 交换位置
        
        laneSetters[laneName](newLane);

      } else {
        // --- 跨墩交换 ---
        const lanes = { top: [...topLane], middle: [...middleLane], bottom: [...bottomLane] };
        const setters = { top: setTopLane, middle: setMiddleLane, bottom: setBottomLane };

        // 从原墩中移除选中的牌
        const fromLane = lanes[selectedLane].filter(c => !(c.rank === selectedCard.rank && c.suit === selectedCard.suit));
        // 从目标墩中移除点击的牌
        const toLane = lanes[laneName].filter(c => !(c.rank === card.rank && c.suit === card.suit));

        // 互相添加
        fromLane.push(card);
        toLane.push(selectedCard);

        // 更新状态，但要检查牌墩数量是否合法
        if (fromLane.length <= {top:3, middle:5, bottom:5}[selectedLane] && toLane.length <= {top:3, middle:5, bottom:5}[laneName]) {
             setters[selectedLane](fromLane);
             setters[laneName](toLane);
        } else {
            alert("牌墩数量不匹配，无法交换！");
        }
      }
      // 重置选中状态
      setSelectedCard(null);
      setSelectedLane(null);
    }
  };


  const handleConfirm = async () => {
    if (topLane.length !== 3 || middleLane.length !== 5 || bottomLane.length !== 5) return alert("请将所有牌摆好！");
    if (isInvalid) return alert("牌型不合法（倒水）！");
    
    setIsLoading(true);
    try {
        const response = await fetch('/api/compare_hands.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ top: topLane, middle: middleLane, bottom: bottomLane }),
        });
        const result = await response.json();
        if (result.success) {
            setGameResult(result);
        } else {
            alert(`比牌失败: ${result.message}`);
        }
    } catch (error) {
        alert(`连接后端失败: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="thirteen-game-new">
      <div className="game-header">
        <button onClick={onBackToLobby} className="quit-button">退出游戏</button>
        <div className="points-display">积分: 100</div>
      </div>
      
      {/* 玩家状态区 - 这里可以后续添加其他玩家 */}
      <div className="player-status-area">
          <div className="player-box self">你 <br/><span>独头</span></div>
          <div className="player-box opponent">小明 <br/><span>已理牌</span></div>
          <div className="player-box opponent">小红 <br/><span>已理牌</span></div>
          <div className="player-box opponent">小刚 <br/><span>已理牌</span></div>
      </div>

      {isLoading && <div className="loading-overlay">正在与AI比牌...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={resetGame} />}

      <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        <Lane title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')} expectedCount={3} handType={topLaneHand?.name} selected={selectedCard}/>
        <Lane title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')} expectedCount={5} handType={middleLaneHand?.name} selected={selectedCard}/>
        <Lane title="后道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')} expectedCount={5} handType={bottomLaneHand?.name} selected={selectedCard}/>
      </div>
       {isInvalid && <div className="error-message">无效牌型：头道必须小于中道，中道必须小于后道（倒水）！</div>}
      
      <div className="game-actions-new">
        <button className="action-button-new auto-sort">智能分牌</button>
        <button onClick={handleConfirm} className="action-button-new confirm" disabled={isInvalid || isLoading}>开始比牌</button>
      </div>
    </div>
  );
};

export default ThirteenGame;
