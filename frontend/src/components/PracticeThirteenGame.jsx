// --- PracticeThirteenGame.jsx (按3-5-5分配+多选高亮+弹起不覆盖+弹起不切割 完美修正版) ---

import React, { useState } from 'react';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import { getSmartSortedHand } from '../utils/autoSorter';
import { calcSSSAllScores } from '../utils/sssScorer';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateDeck() {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
  const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
  const deck = [];
  for (const suit of suits) for (const rank of ranks) deck.push({ rank, suit });
  return deck;
}

const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

const areCardsEqual = (card1, card2) => card1.rank === card2.rank && card1.suit === card2.suit;

const PracticeThirteenGame = ({ aiCount, user, onBackToLobby }) => {
  // 发牌
  const [allHands, setAllHands] = useState(() => {
    const deck = shuffle(generateDeck());
    const hands = [];
    for (let i = 0; i < aiCount + 1; i++) {
      hands.push(deck.slice(i * 13, (i + 1) * 13));
    }
    return hands;
  });

  // 理牌区
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [gameResult, setGameResult] = useState(null);

  const [isReady, setIsReady] = useState(false);
  const [showTrusteeModal, setShowTrusteeModal] = useState(false);

  // --- 选牌逻辑 ---
  const allCards = [...topLane, ...middleLane, ...bottomLane];
  const handCards = allHands[0];

  // 卡牌点击：选中/取消选中
  const handleCardClick = (card) => {
    const selected = selectedCards.some(c => areCardsEqual(c, card));
    if (selected) {
      setSelectedCards(selectedCards.filter(c => !areCardsEqual(c, card)));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // 牌墩点击：批量移动选中的牌到目标牌墩
  const handleLaneClick = (lane) => {
    if (!selectedCards.length) return;
    let newTop = topLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newMiddle = middleLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newBottom = bottomLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    if (lane === 'top') newTop = [...newTop, ...selectedCards];
    if (lane === 'middle') newMiddle = [...newMiddle, ...selectedCards];
    if (lane === 'bottom') newBottom = [...newBottom, ...selectedCards];
    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setSelectedCards([]);
  };

  // 准备按钮
  const handleReady = () => {
    // 按智能理牌分配3-5-5
    const sorted = getSmartSortedHand(handCards);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
    } else {
      // 没有智能理牌可用时，先按顺序分配
      setTopLane(handCards.slice(0, 3));
      setMiddleLane(handCards.slice(3, 8));
      setBottomLane(handCards.slice(8, 13));
    }
    setSelectedCards([]);
    setIsReady(true);
  };

  // 确认牌型
  const handleConfirm = () => {
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      alert('牌道数量错误！头道3，中道5，尾道5');
      return;
    }
    // 玩家和AI组装
    const players = [
      {
        head: topLane.map(card => `${card.rank}_of_${card.suit}`),
        middle: middleLane.map(card => `${card.rank}_of_${card.suit}`),
        tail: bottomLane.map(card => `${card.rank}_of_${card.suit}`),
        name: user.phone,
      },
      ...allHands.slice(1).map((hand, i) => {
        const sorted = getSmartSortedHand(hand) || { top: hand.slice(0,3), middle: hand.slice(3,8), bottom: hand.slice(8,13) };
        return {
          head: sorted.top.map(card => `${card.rank}_of_${card.suit}`),
          middle: sorted.middle.map(card => `${card.rank}_of_${card.suit}`),
          tail: sorted.bottom.map(card => `${card.rank}_of_${card.suit}`),
          name: `AI${i + 1}`,
        };
      }),
    ];
    const scores = calcSSSAllScores(players);
    setGameResult({
      players: players.map((p, i) => ({
        name: p.name,
        hand: {
          top: p.head.map(c => {
            const [rank, , suit] = c.split('_');
            return { rank, suit };
          }),
          middle: p.middle.map(c => {
            const [rank, , suit] = c.split('_');
            return { rank, suit };
          }),
          bottom: p.tail.map(c => {
            const [rank, , suit] = c.split('_');
            return { rank, suit };
          }),
        },
        score: scores[i],
      })),
    });
  };

  // 智能理牌
  const handleAutoSort = () => {
    const sorted = getSmartSortedHand([...topLane, ...middleLane, ...bottomLane]);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
      setSelectedCards([]);
    }
  };

  // 智能托管按钮
  const handleTrusteeClick = () => setShowTrusteeModal(true);

  // 智能托管选择
  const handleTrusteeSelect = (cnt) => {
    setShowTrusteeModal(false);
    runTrustee(cnt);
  };

  // 智能托管逻辑
  const runTrustee = (cnt) => {
    let rounds = cnt;
    const autoRun = () => {
      // 发牌
      const deck = shuffle(generateDeck());
      const hands = [];
      for (let i = 0; i < aiCount + 1; i++) {
        hands.push(deck.slice(i * 13, (i + 1) * 13));
      }
      setAllHands(hands);
      // 智能理牌
      const sorted = getSmartSortedHand(hands[0]);
      if (sorted) {
        setTopLane(sorted.top);
        setMiddleLane(sorted.middle);
        setBottomLane(sorted.bottom);
      }
      setSelectedCards([]);
      // 自动确认
      setTimeout(() => {
        handleConfirm();
        // 下轮继续
        setTimeout(() => {
          rounds--;
          if (rounds > 0) autoRun();
        }, 1200);
      }, 400);
    };
    autoRun();
  };

  // 结果关闭
  const handleCloseResult = () => {
    setGameResult(null);
    setIsReady(false);
    setTopLane([]);
    setMiddleLane([]);
    setBottomLane([]);
    setSelectedCards([]);
    // 发新牌
    const deck = shuffle(generateDeck());
    const hands = [];
    for (let i = 0; i < aiCount + 1; i++) {
      hands.push(deck.slice(i * 13, (i + 1) * 13));
    }
    setAllHands(hands);
  };

  // --- 修复弹起/高亮覆盖问题，Lane 组件内只需调整样式 ---
  // 选牌区和牌区
  return (
    <div className="table-root">
      <div className="table-panel">
        <div className="table-top-bar">
          <button onClick={onBackToLobby} className="table-quit-btn">返回大厅</button>
          <div className="table-score-box">十三张试玩（你 vs {aiCount} 个AI）</div>
        </div>
        <div className="players-status-bar">
          <div className="player-status-item you">
            <span className="player-name">你</span>
            <span className="status-text">{isReady ? '理牌中...' : '请点击准备'}</span>
          </div>
          {Array.from({ length: aiCount }).map((_, i) => (
            <div key={i} className="player-status-item">
              <span className="player-name">{`AI${i + 1}`}</span>
              <span className="status-text">自动理牌</span>
            </div>
          ))}
        </div>
        {isReady && (
          <div className="table-lanes-area">
            <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
            <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
            <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
          </div>
        )}
        <div className="table-actions-bar">
          {!isReady && (
            <button className="action-btn green" onClick={handleReady}>准备</button>
          )}
          {isReady && (
            <>
              <button className="action-btn orange" onClick={handleAutoSort}>自动理牌</button>
              <button className="action-btn orange" onClick={handleTrusteeClick}>智能托管</button>
              <button className="action-btn green" onClick={handleConfirm}>确认牌型</button>
            </>
          )}
        </div>
      </div>
      {showTrusteeModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3>选择托管局数</h3>
            {[3, 5, 10, 20].map(cnt => (
              <button style={{ margin: '8px', padding: '12px', fontSize: '1.1rem' }} key={cnt} className="action-btn" onClick={() => handleTrusteeSelect(cnt)}>{cnt} 局</button>
            ))}
            <button style={{ marginTop: '12px' }} className="action-btn orange" onClick={() => setShowTrusteeModal(false)}>取消</button>
          </div>
        </div>
      )}
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default PracticeThirteenGame;
// --- END OF FILE ---