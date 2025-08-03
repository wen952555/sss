import React, { useState, useEffect } from 'react';
import Card, { sortCards } from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { evaluateHand, compareHands } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal'; // 引入结果弹窗组件

const areCardsEqual = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const ThirteenGame = ({ playerHand, onBackToLobby }) => {
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  
  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);

  // 新增State，用于处理游戏结果
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

  // 初始化或重置游戏
  const resetGame = () => {
    setUnassignedCards(sortCards(playerHand || []));
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedCard(null);
    setGameResult(null);
    setIsLoading(false);
  };

  useEffect(() => {
    resetGame();
  }, [playerHand]);

  const handleSelectCard = (cardToSelect) => {
    if (areCardsEqual(selectedCard, cardToSelect)) setSelectedCard(null);
    else setSelectedCard(cardToSelect);
  };
  
  const moveCardFromLaneToUnassigned = (card, lane, setLane) => {
    setLane(lane.filter(c => !areCardsEqual(c, card)));
    setUnassignedCards(sortCards([...unassignedCards, card]));
    setSelectedCard(null);
  }

  const handleLaneClick = (laneName) => {
    if (!selectedCard) return;
    const target = { top: { l: topLane, s: setTopLane, c: 3 }, middle: { l: middleLane, s: setMiddleLane, c: 5 }, bottom: { l: bottomLane, s: setBottomLane, c: 5 } }[laneName];
    if (target.l.length >= target.c) return alert("墩已满！");
    if (unassignedCards.some(c => areCardsEqual(c, selectedCard))) {
        setUnassignedCards(unassignedCards.filter(c => !areCardsEqual(c, selectedCard)));
        target.s(sortCards([...target.l, selectedCard]));
        setSelectedCard(null);
    } else {
        alert("请从手牌区选择牌！");
    }
  };
  
  // 确认牌型并发送到后端进行比牌
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
    <div className="thirteen-game">
      {isLoading && <div className="loading-overlay">正在与AI比牌...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={resetGame} />}

      <h2>十三张游戏 - 请手动理牌</h2>
      
      <div className={`lanes-area ${isInvalid ? 'invalid' : ''}`}>
        <Lane title="头墩" cards={topLane} onLaneClick={() => handleLaneClick('top')} onCardClick={(c) => moveCardFromLaneToUnassigned(c, topLane, setTopLane)} expectedCount={3} handType={topLaneHand?.name} />
        <Lane title="中墩" cards={middleLane} onLaneClick={() => handleLaneClick('middle')} onCardClick={(c) => moveCardFromLaneToUnassigned(c, middleLane, setMiddleLane)} expectedCount={5} handType={middleLaneHand?.name} />
        <Lane title="尾墩" cards={bottomLane} onLaneClick={() => handleLaneClick('bottom')} onCardClick={(c) => moveCardFromLaneToUnassigned(c, bottomLane, setBottomLane)} expectedCount={5} handType={bottomLaneHand?.name} />
      </div>
       {isInvalid && <div className="error-message">无效牌型：头墩必须小于中墩，中墩必须小于尾墩（倒水）！</div>}

      <div className="unassigned-cards-area">
        <h4>手牌区 ({unassignedCards.length}/13)</h4>
        <div className="card-container">
          {unassignedCards.map(card => ( <Card key={`${card.rank}-${card.suit}`} card={card} isSelected={areCardsEqual(selectedCard, card)} onClick={() => handleSelectCard(card)} /> ))}
        </div>
      </div>
      
      <div className="game-actions">
        <button onClick={onBackToLobby} className="action-button">返回大厅</button>
        <button onClick={resetGame} className="action-button reset">全部重置</button>
        <button onClick={handleConfirm} className="action-button confirm" disabled={isInvalid || isLoading}>确认牌型</button>
      </div>
    </div>
  );
};

export default ThirteenGame;
