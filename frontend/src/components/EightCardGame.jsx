import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
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

  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };
  const isMultiplayerTrial = Object.keys(otherPlayers).length > 0;

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
        body: JSON.stringify({ hand, gameType: 'eight' }),
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
    <div className="eight-game-container">
      <div className="eight-game-panel">
        <div className="game-header">
          <button className="quit-button" onClick={onBackToLobby}>退出</button>
          <h2>八张牌</h2>
        </div>
        
        {isMultiplayerTrial && (
          <div className="eight-game-players">
            <div className="player-group">
              <div className="player-status-item you">
                <span className="player-name">你</span>
                <span className="status-text">理牌中...</span>
              </div>
              {Object.keys(otherPlayers).slice(0, 1).map((name) => (
                <div key={name} className="player-status-item ready">
                  <span className="player-name">{name}</span><span className="status-text">已理牌</span>
                </div>
              ))}
            </div>
             {Object.keys(otherPlayers).length > 1 && (
                <div className="player-group">
                  {Object.keys(otherPlayers).slice(1, 3).map((name) => (
                    <div key={name} className="player-status-item ready">
                      <span className="player-name">{name}</span><span className="status-text">已理牌</span>
                    </div>
                  ))}
                </div>
             )}
          </div>
        )}

        <div className="lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={(c) => handleCardClick(c, 'top')} onLaneClick={() => handleLaneClick('top')} expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name} selected={selectedCard} />
          <Lane title="中道" cards={middleLane} onCardClick={(c) => handleCardClick(c, 'middle')} onLaneClick={() => handleLaneClick('middle')} expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name} selected={selectedCard} />
          <Lane title="尾道" cards={bottomLane} onCardClick={(c) => handleCardClick(c, 'bottom')} onLaneClick={() => handleLaneClick('bottom')} expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name} selected={selectedCard} />
        </div>

        {isInvalid && <div className="error-message">无效牌型组合（倒水）</div>}
        
        <div className="game-actions-new">
          <button className="action-button-new auto-sort" onClick={handleAutoSort} disabled={isLoading}>
            智能理牌
          </button>
          <button
            className="action-button-new confirm"
            onClick={handleConfirm}
            disabled={
              isLoading || isInvalid || 
              topLane.length !== LANE_LIMITS.top || 
              middleLane.length !== LANE_LIMITS.middle || 
              bottomLane.length !== LANE_LIMITS.bottom
            }>
            确认出牌
          </button>
        </div>
      </div>
      {isLoading && <div className="loading-overlay">处理中...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;