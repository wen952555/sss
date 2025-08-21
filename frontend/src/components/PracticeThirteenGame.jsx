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
  const [allHands, setAllHands] = useState(() => {
    const deck = shuffle(generateDeck());
    const hands = [];
    for (let i = 0; i < aiCount + 1; i++) {
      hands.push(deck.slice(i * 13, (i + 1) * 13));
    }
    return hands;
  });

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [gameResult, setGameResult] = useState(null);

  const [isReady, setIsReady] = useState(false);

  // 卡牌点击
  const handleCardClick = (card) => {
    const selected = selectedCards.some(c => areCardsEqual(c, card));
    if (selected) {
      setSelectedCards(selectedCards.filter(c => !areCardsEqual(c, card)));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  // 牌墩点击
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

  // 准备
  const handleReady = () => {
    const handCards = allHands[0];
    const sorted = getSmartSortedHand(handCards);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
    } else {
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
          name: `电脑 ${i + 2}`,
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

  // 自动理牌
  const handleAutoSort = () => {
    const sorted = getSmartSortedHand([...topLane, ...middleLane, ...bottomLane]);
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
      setSelectedCards([]);
    }
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

  // 玩家横幅平铺（如图4）
  const renderPlayerBar = () => (
    <div className="player-bar-horizontal-v2">
      <div className="player-bar-item-v2 me">
        <div className="player-bar-name-v2">你</div>
        <div className="player-bar-status-v2">理牌中...</div>
      </div>
      {Array.from({ length: aiCount }).map((_, i) => (
        <div key={i} className="player-bar-item-v2 ready">
          <div className="player-bar-name-v2">{`电脑 ${i + 2}`}</div>
          <div className="player-bar-status-v2">已准备</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="table-root pastel-bg">
      <div className="table-panel">
        <div className="table-top-bar-v2">
          <button onClick={onBackToLobby} className="table-quit-btn-v2">退出游戏</button>
          <div className="table-title-v2">十三张试玩（你 vs {aiCount} 个AI）</div>
        </div>
        {renderPlayerBar()}
        <div className="lane-list-area-v2">
          <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
          <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
          <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
        </div>
        <div className="footer-action-bar-v2">
          <button className="footer-btn-v2 orange" onClick={handleAutoSort}>自动理牌</button>
          <button className="footer-btn-v2 blue" onClick={handleConfirm}>确认牌型</button>
        </div>
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
    </div>
  );
};

export default PracticeThirteenGame;