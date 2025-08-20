// --- PracticeThirteenGame.jsx (托管/多选/准备/牌墩不限制) ---

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
  const [trusteeCount, setTrusteeCount] = useState(0);

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
    // 先移除所有选中的牌
    const remain = allCards.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newTop = topLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newMiddle = middleLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    let newBottom = bottomLane.filter(c => !selectedCards.some(sel => areCardsEqual(sel, c)));
    if (lane === 'top') newTop = [...newTop, ...selectedCards];
    if (lane === 'middle') newMiddle = [...newMiddle, ...selectedCards];
    if (lane === 'bottom') newBottom = [...newBottom, ...selectedCards];
    setTopLane(newTop);
    setMiddleLane(newMiddle);
    setBottomLane(newBottom);
    setSelectedCards([]); // 清空选中
  };

  // 准备按钮
  const handleReady = () => {
    // 自动填充 13 张牌到中道（初始理牌）
    setTopLane([]);
    setMiddleLane([...handCards]);
    setBottomLane([]);
    setSelectedCards([]);
    setIsReady(true);
  };

  // 确认牌型
  const handleConfirm = () => {
    // 检查数量
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
        const sorted = getSmartSortedHand(hand) || { top: hand.slice(10), middle: hand.slice(5, 10), bottom: hand.slice(0, 5) };
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
    const sorted = getSmartSortedHand(handCards);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
      setSelectedCards([]);
    }
  };

  // 智能托管按钮
  const handleTrusteeClick = () => {
    setShowTrusteeModal(true);
  };

  // 智能托管选择
  const handleTrusteeSelect = (cnt) => {
    setShowTrusteeModal(false);
    setTrusteeCount(cnt);
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
    // 新一局需要玩家再点准备
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

  // 首次进入后不自动准备，等玩家点“准备”
  // 牌区
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