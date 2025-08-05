import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedLane, setSelectedLane] = useState(null);
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- 修正：重新添加 LANE_LIMITS 的定义 ---
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  useEffect(() => {
    const top = evaluateHand(topLane);
    const middle = evaluateHand(middleLane);
    const bottom = evaluateHand(bottomLane);
    setTopLaneHand(top);
    setMiddleLaneHand(middle);
    setBottomLaneHand(bottom);

    if (
      topLane.length === LANE_LIMITS.top &&
      middleLane.length === LANE_LIMITS.middle &&
      bottomLane.length === LANE_LIMITS.bottom
    ) {
      const middleVsBottom = compareHands(middle, bottom);
      const topVsMiddle = compareHands(top, middle);
      setIsInvalid(middleVsBottom > 0 || topVsMiddle > 0);
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane, LANE_LIMITS]);

  const handleCardClick = (card, laneName) => {
    if (!selectedCard) {
      setSelectedCard(card);
      setSelectedLane(laneName);
      return;
    }
    if (selectedCard && selectedCard.rank === card.rank && selectedCard.suit === card.suit) {
      setSelectedCard(null);
      setSelectedLane(null);
      return;
    }
    moveCard(selectedCard, selectedLane, laneName);
    setSelectedCard(null);
    setSelectedLane(null);
  };

  const handleLaneClick = (laneName) => {
    if (!selectedCard || !selectedLane) return;
    if (laneName === selectedLane) return;
    moveCard(selectedCard, selectedLane, laneName);
    setSelectedCard(null);
    setSelectedLane(null);
  };

  const moveCard = (card, fromLane, toLane) => {
    if (fromLane === toLane) return;
    const lanes = { top: [...topLane], middle: [...middleLane], bottom: [...bottomLane] };
    if (lanes[toLane].length >= LANE_LIMITS[toLane]) return;
    lanes[fromLane] = lanes[fromLane].filter(
      (c) => !(c.rank === card.rank && c.suit === card.suit)
    );
    lanes[toLane].push(card);
    setTopLane(lanes.top);
    setMiddleLane(lanes.middle);
    setBottomLane(lanes.bottom);
  };

  const handleAutoSort = async () => {
    setIsLoading(true);
    setSelectedCard(null);
    setSelectedLane(null);
    try {
      const hand = [...topLane, ...middleLane, ...bottomLane];
      const res = await fetch('/api/auto_sort_hand.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hand, gameType: 'thirteen' }),
      });
      const data = await res.json();
      if (data.success && data.arrangedHand) {
        setTopLane(data.arrangedHand.top);
        setMiddleLane(data.arrangedHand.middle);
        setBottomLane(data.arrangedHand.bottom);
      }
    } catch (e) {
      // ignore
    }
    setIsLoading(false);
  };

  const handleConfirm = async () => {
    if (
      topLane.length !== LANE_LIMITS.top ||
      middleLane.length !== LANE_LIMITS.middle ||
      bottomLane.length !== LANE_LIMITS.bottom ||
      isInvalid
    ) {
      alert('请正确分配所有牌并避免倒水！');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/compare_hands.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          top: topLane,
          middle: middleLane,
          bottom: bottomLane,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGameResult(data);
      } else {
        alert(data.message || '比牌失败');
      }
    } catch (e) {
      alert('网络错误');
    }
    setIsLoading(false);
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby && onBackToLobby();
  };
    
  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button className="table-quit-btn" onClick={onBackToLobby}>退出</button>
          <div className="table-score-box">积分: 100</div>
        </div>

        <div className="players-grid">
          <div className="player-box you">
            <div className="player-name">你</div>
            <div className="player-status">理牌中...</div>
          </div>
          {Object.keys(otherPlayers).slice(0, 3).map((playerName, index) => (
            <div key={index} className="player-box ready">
              <div className="player-name">{playerName}</div>
              <div className="player-status">已理牌</div>
            </div>
          ))}
        </div>

        <div className="table-lanes-area">
          <Lane
              title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')}
              expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name} selected={selectedCard}
            />
          <Lane
              title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')}
              expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name} selected={selectedCard}
            />
          <Lane
              title="尾道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')}
              expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name} selected={selectedCard}
            />
        </div>
        
        {isInvalid && <div className="error-message">无效牌型组合（倒水）</div>}

        <div className="table-actions-bar">
          <button className="action-btn orange" onClick={handleAutoSort} disabled={isLoading}>智能理牌</button>
          {/* --- 修正：使用 LANE_LIMITS 进行判断 --- */}
          <button 
            className="action-btn green" 
            onClick={handleConfirm} 
            disabled={
              isLoading || isInvalid || 
              topLane.length !== LANE_LIMITS.top || 
              middleLane.length !== LANE_LIMITS.middle || 
              bottomLane.length !== LANE_LIMITS.bottom
            }
          >开始比牌</button>
        </div>
      </div>
      {isLoading && <div className="loading-overlay">处理中...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;