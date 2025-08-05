import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { evaluateHand, compareHands, sortCards } from '../utils/pokerEvaluator';
import GameResultModal from './GameResultModal';

// 辅助函数：比较两张卡牌是否相同
const areCardsEqual = (card1, card2) => {
  return card1.rank === card2.rank && card1.suit === card2.suit;
};

const EightCardGame = ({ playerHand, otherPlayers, onBackToLobby }) => {
  const [topLane, setTopLane] = useState(playerHand?.top || []);
  const [middleLane, setMiddleLane] = useState(playerHand?.middle || []);
  const [bottomLane, setBottomLane] = useState(playerHand?.bottom || []);
  const [selectedCards, setSelectedCards] = useState([]);

  const [topLaneHand, setTopLaneHand] = useState(null);
  const [middleLaneHand, setMiddleLaneHand] = useState(null);
  const [bottomLaneHand, setBottomLaneHand] = useState(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };

  useEffect(() => {
    // 评估每道牌的牌型
    const topEval = evaluateHand(topLane);
    const middleEval = evaluateHand(middleLane);
    const bottomEval = evaluateHand(bottomLane);

    setTopLaneHand(topEval);
    setMiddleLaneHand(middleEval);
    setBottomLaneHand(bottomEval);

    // 检查是否满足牌型大小规则
    const allCardsPlaced = topLane.length + middleLane.length + bottomLane.length === 8;
    if (allCardsPlaced) {
      const middleVsTop = compareHands(middleEval, topEval);
      const bottomVsMiddle = compareHands(bottomEval, middleEval);
      if (middleVsTop < 0 || bottomVsMiddle < 0) {
        setIsInvalid(true);
      } else {
        setIsInvalid(false);
      }
    } else {
      setIsInvalid(false);
    }
  }, [topLane, middleLane, bottomLane]);

  const handleCardClick = (card) => {
    setSelectedCards(prevSelected => {
      const isAlreadySelected = prevSelected.some(selectedCard => areCardsEqual(selectedCard, card));
      if (isAlreadySelected) {
        return prevSelected.filter(selectedCard => !areCardsEqual(selectedCard, card));
      } else {
        return [...prevSelected, card];
      }
    });
  };

  const handleLaneClick = (targetLaneName) => {
    if (selectedCards.length === 0) return;

    let newTopLane = [...topLane];
    let newMiddleLane = [...middleLane];
    let newBottomLane = [...bottomLane];

    const lanes = {
      top: newTopLane,
      middle: newMiddleLane,
      bottom: newBottomLane,
    };

    if (lanes[targetLaneName].length + selectedCards.length > LANE_LIMITS[targetLaneName]) {
      alert('空间不足，无法放入所选的牌！');
      return;
    }

    const removeSelected = (lane) => lane.filter(card => !selectedCards.some(selected => areCardsEqual(selected, card)));
    newTopLane = removeSelected(newTopLane);
    newMiddleLane = removeSelected(newMiddleLane);
    newBottomLane = removeSelected(newBottomLane);
    
    // 将选中的牌加入目标牌墩
    const updatedTargetLane = [...lanes[targetLaneName], ...selectedCards]
        .filter(card => !selectedCards.some(selected => areCardsEqual(selected, card)))
        .concat(selectedCards);

    if (targetLaneName === 'top') setTopLane(sortCards(updatedTargetLane));
    if (targetLaneName === 'middle') setMiddleLane(sortCards(updatedTargetLane));
    if (targetLaneName === 'bottom') setBottomLane(sortCards(updatedTargetLane));
    
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    const allCards = sortCards([...topLane, ...middleLane, ...bottomLane]);
    setTopLane(allCards.slice(0, 2));
    setMiddleLane(allCards.slice(2, 5));
    setBottomLane(allCards.slice(5, 8));
    // --- ↓↓↓ 已删除这里的 alert 语句 ↓↓↓ ---
  };

  const handleConfirm = async () => {
    if (topLane.length + middleLane.length + bottomLane.length !== 8) {
        alert('请将所有8张牌都摆放到牌道中！');
        return;
    }
    if (isInvalid) {
        alert('当前牌型不符合规则，无法确认！');
        return;
    }

    setIsLoading(true);
    setTimeout(() => {
        const aiHand = {
            top: otherPlayers['玩家 2']?.slice(0, 2),
            middle: otherPlayers['玩家 2']?.slice(2, 5),
            bottom: otherPlayers['玩家 2']?.slice(5, 8),
        };
        const result = {
            playerHand: { top: topLane, middle: middleLane, bottom: bottomLane },
            aiHand: aiHand,
            score: Math.floor(Math.random() * 11) - 5,
        };
        setGameResult(result);
        setIsLoading(false);
    }, 1500);
  };
  
  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  return (
    <div className="eight-game-container">
      <div className="eight-game-panel">
        <div className="game-header">
          <button onClick={onBackToLobby} className="quit-button">退出游戏</button>
          <h2>急速八张</h2>
        </div>

        <div className="eight-game-players">
          <div className="player-group">
            <div className="player-status-item you"><span className="player-name">你</span><span className="status-text">理牌中...</span></div>
            {Object.keys(otherPlayers).map(name => (
                <div key={name} className="player-status-item ready"><span className="player-name">{name}</span><span className="status-text">已准备</span></div>
            ))}
          </div>
        </div>

        <div className="lanes-area">
          <Lane
            title="头道" cards={topLane}
            onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')}
            selectedCards={selectedCards}
            expectedCount={LANE_LIMITS.top} handType={topLaneHand?.name}
          />
          <Lane
            title="中道" cards={middleLane}
            onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')}
            selectedCards={selectedCards}
            expectedCount={LANE_LIMITS.middle} handType={middleLaneHand?.name}
          />
          <Lane
            title="尾道" cards={bottomLane}
            onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')}
            selectedCards={selectedCards}
            expectedCount={LANE_LIMITS.bottom} handType={bottomLaneHand?.name}
          />
        </div>

        {isInvalid && <p className="error-message">牌型不符合规则！(尾道 ≥ 中道 ≥ 头道)</p>}

        <div className="game-actions-new">
          <button onClick={handleAutoSort} className="action-button-new auto-sort">自动理牌</button>
          <button onClick={handleConfirm} disabled={isInvalid || isLoading} className="action-button-new confirm">确认牌型</button>
        </div>
      </div>
      {isLoading && <div className="loading-overlay">正在比牌...</div>}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default EightCardGame;
