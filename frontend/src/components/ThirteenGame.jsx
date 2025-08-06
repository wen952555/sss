// --- START OF FILE ThirteenGame.jsx ---

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { calcSSSAllScores } from '../utils/sssScorer';
import { sortCards } from '../utils/pokerEvaluator';

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const convertCardsToStingFormat = (cards) => {
  if (!cards || cards.length === 0) return [];
  return cards.map(card => `${card.rank}_of_${card.suit}`);
};

const ThirteenGame = ({ playerHand, otherPlayers, onBackToLobby, isTrial }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };
  
  const initialAllCards = playerHand.top.concat(playerHand.middle, playerHand.bottom);
  
  const [topLane, setTopLane] = useState(initialAllCards.slice(0, 3));
  const [middleLane, setMiddleLane] = useState(initialAllCards.slice(3, 8));
  const [bottomLane, setBottomLane] = useState(initialAllCards.slice(8, 13));

  const [selectedCards, setSelectedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [aiPlayerStatus, setAiPlayerStatus] = useState(
    Object.keys(otherPlayers).reduce((acc, name) => {
      acc[name] = { status: '理牌中...', sortedHand: null };
      return acc;
    }, {})
  );

  useEffect(() => {
    if (!isTrial) return;

    const aiNames = Object.keys(otherPlayers);
    if (aiNames.length === 0) return;

    const processNextAi = (index) => {
      if (index >= aiNames.length) return;
      
      const aiName = aiNames[index];
      const aiUnsortedHand = otherPlayers[aiName];
      const allAiCards = [...aiUnsortedHand.top, ...aiUnsortedHand.middle, ...aiUnsortedHand.bottom];
      
      const sortedHand = getSmartSortedHand(allAiCards);
      
      setAiPlayerStatus(prevStatus => ({
        ...prevStatus,
        [aiName]: { status: '已准备', sortedHand: sortedHand }
      }));
      
      setTimeout(() => processNextAi(index + 1), 2000);
    };

    const firstAiTimeout = setTimeout(() => processNextAi(0), 1000); // 第一个AI稍作停顿后开始
    
    return () => clearTimeout(firstAiTimeout); // 组件卸载时清除定时器
  }, [isTrial, otherPlayers]);

  const handleCardClick = (card) => {
    setSelectedCards(prev =>
      prev.some(c => areCardsEqual(c, card))
        ? prev.filter(c => !areCardsEqual(c, card))
        : [...prev, card]
    );
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;
    const removeSelected = (lane) => lane.filter(c => !selectedCards.some(s => areCardsEqual(s, c)));

    let newTop = removeSelected(topLane);
    let newMiddle = removeSelected(middleLane);
    let newBottom = removeSelected(bottomLane);

    if (targetLaneName === 'top') newTop = sortCards([...newTop, ...selectedCards]);
    if (targetLaneName === 'middle') newMiddle = sortCards([...newMiddle, ...selectedCards]);
    if (targetLaneName === 'bottom') newBottom = sortCards([...newBottom, ...selectedCards]);

    if (newTop.length > LANE_LIMITS.top || newMiddle.length > LANE_LIMITS.middle || newBottom.length > LANE_LIMITS.bottom) {
      alert('空间不足!');
      return;
    }

    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    const allCards = [...topLane, ...middleLane, ...bottomLane];
    if (allCards.length !== 13) return;

    const sortedHand = getSmartSortedHand(allCards);
    if (sortedHand) {
      setTopLane(sortedHand.top);
      setMiddleLane(sortedHand.middle);
      setBottomLane(sortedHand.bottom);
    } else {
      alert("智能理牌未能找到有效组合。");
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage('');

    const playerLanes = { top: topLane, middle: middleLane, bottom: bottomLane };

    if (isTrial) {
      const allAiReady = Object.values(aiPlayerStatus).every(s => s.status === '已准备');
      if (!allAiReady) {
        alert("请等待所有电脑玩家准备就绪！");
        setIsLoading(false);
        return;
      }

      setTimeout(() => {
        const playersForScorer = [
          { name: "你", head: convertCardsToStingFormat(playerLanes.top), middle: convertCardsToStingFormat(playerLanes.middle), tail: convertCardsToStingFormat(playerLanes.bottom) },
          ...Object.entries(aiPlayerStatus).map(([name, status]) => ({ name, head: convertCardsToStingFormat(status.sortedHand.top), middle: convertCardsToStingFormat(status.sortedHand.middle), tail: convertCardsToStingFormat(status.sortedHand.bottom) }))
        ];

        const finalScores = calcSSSAllScores(playersForScorer);

        const result = {
          players: playersForScorer.map(p => ({
            name: p.name,
            hand: {
              top: p.head.map(c => ({ rank: c.split('_')[0], suit: c.split('_')[2] })),
              middle: p.middle.map(c => ({ rank: c.split('_')[0], suit: c.split('_')[2] })),
              bottom: p.tail.map(c => ({ rank: c.split('_')[0], suit: c.split('_')[2] }))
            }
          })),
          scores: finalScores
        };
        
        setGameResult(result);
        setIsLoading(false);
      }, 500);
    } else {
      // 在线模式逻辑...
      try {
        const response = await fetch('/api/compare_thirteen.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(playerLanes) });
        if (!response.ok) throw new Error(`服务器错误: ${response.status}`);
        const data = await response.json();
        if (data.success) {
          // ... process backend result
        } else {
          throw new Error(data.message || '后端比牌失败');
        }
      } catch (error) {
        setErrorMessage(`比牌失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
          <div className="table-score-box">{isTrial ? "试玩模式" : "积分: 1000"}</div>
        </div>
        <div className="players-status-bar">
          <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
          {Object.entries(aiPlayerStatus).map(([name, status]) => (
            <div key={name} className={`player-status-item ${status.status === '已准备' ? 'ready' : ''}`}>
              <span className="player-name">{name}</span>
              <span className="status-text">{status.status}</span>
            </div>
          ))}
        </div>
        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} disabled={isLoading} className="action-btn green">确认牌型</button>
        </div>
        {isLoading && <div className="loading-overlay">正在比牌...</div>}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default ThirteenGame;

// --- END OF FILE ThirteenGame.jsx ---