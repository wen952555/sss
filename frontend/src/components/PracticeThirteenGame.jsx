// --- PracticeThirteenGame.jsx ---

import React, { useState } from 'react';
import Lane from './Lane';
import GameResultModal from './GameResultModal';
import { getSmartSortedHand } from '../utils/autoSorter';
import { calcSSSAllScores, isFoul } from '../utils/sssScorer';

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

const PracticeThirteenGame = ({ aiCount, user, onBackToLobby }) => {
  // 发牌
  const [allHands] = useState(() => {
    const deck = shuffle(generateDeck());
    const hands = [];
    for (let i = 0; i < aiCount + 1; i++) {
      hands.push(deck.slice(i * 13, (i + 1) * 13));
    }
    return hands;
  });

  // 玩家理牌
  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [gameResult, setGameResult] = useState(null);

  // 自动理牌
  const handleAutoSort = () => {
    const sorted = getSmartSortedHand(allHands[0]);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
    }
  };

  // 拖拽理牌（略，复用 Lane/卡牌逻辑）

  // 提交
  const handleConfirm = () => {
    if (
      topLane.length !== LANE_LIMITS.top ||
      middleLane.length !== LANE_LIMITS.middle ||
      bottomLane.length !== LANE_LIMITS.bottom
    ) return alert('牌道数量错误！');

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
    // 计分
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

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  // 发牌初始填充
  React.useEffect(() => {
    handleAutoSort();
  }, []);

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
            <span className="status-text">理牌中...</span>
          </div>
          {Array.from({ length: aiCount }).map((_, i) => (
            <div key={i} className="player-status-item">
              <span className="player-name">{`AI${i + 1}`}</span>
              <span className="status-text">自动理牌</span>
            </div>
          ))}
        </div>
        <div className="table-lanes-area">
          <Lane title="头道" cards={topLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={null} onLaneClick={null} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        <div className="table-actions-bar">
          <button onClick={handleAutoSort} className="action-btn orange">自动理牌</button>
          <button onClick={handleConfirm} className="action-btn green">确认牌型</button>
        </div>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default PracticeThirteenGame;