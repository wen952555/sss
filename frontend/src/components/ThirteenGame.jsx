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
  }, [topLane, middleLane, bottomLane]);

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
        {/* 顶部栏 */}
        <div className="table-top-bar">
          <button className="table-quit-btn" onClick={onBackToLobby}>退出游戏</button>
          <div className="table-score-box">积分: 100</div>
        </div>

        {/* 玩家区 */}
        <div className="table-players-row">
          <div className="player-box you">
            <div className="player-you">你</div>
            <div className="player-status">独头</div>
          </div>
          <div className="player-box ready">小明<br/>已理牌</div>
          <div className="player-box ready">小红<br/>已理牌</div>
          <div className="player-box ready">小刚<br/>已理牌</div>
        </div>

        {/* 牌墩区 */}
        <div className="table-lanes-area">
          <div className="lane-block">
            <Lane
              title="头道"
              cards={topLane}
              onCardClick={(c) => handleCardClick(c, 'top')}
              expectedCount={LANE_LIMITS.top}
              handType={topLaneHand?.name}
              selected={selectedCard}
            />
          </div>
          <div className="lane-block">
            <Lane
              title="中道"
              cards={middleLane}
              onCardClick={(c) => handleCardClick(c, 'middle')}
              expectedCount={LANE_LIMITS.middle}
              handType={middleLaneHand?.name}
              selected={selectedCard}
            />
          </div>
          <div className="lane-block">
            <Lane
              title="后道"
              cards={bottomLane}
              onCardClick={(c) => handleCardClick(c, 'bottom')}
              expectedCount={LANE_LIMITS.bottom}
              handType={bottomLaneHand?.name}
              selected={selectedCard}
            />
          </div>
        </div>

        {/* 操作按钮区 */}
        <div className="table-actions-bar">
          <button className="action-btn orange" onClick={handleAutoSort}>智能分牌</button>
          <button className="action-btn green" onClick={handleConfirm}>开始比牌</button>
        </div>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;