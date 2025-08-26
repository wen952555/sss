import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './ThirteenGame.css';
import { getSmartSortedHand } from '../utils/autoSorter';
import { areCardsEqual, sortCards } from '../utils';
import { dealOfflineThirteenGame, getAiThirteenHand, calculateThirteenTrialResult } from '../utils/offlineGameLogic';
import GameResultModal from './GameResultModal';

const ThirteenGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd, isTrialMode = false }) => {
  const LANE_LIMITS = { top: 3, middle: 5, bottom: 5 };

  const [topLane, setTopLane] = useState([]);
  const [middleLane, setMiddleLane] = useState([]);
  const [bottomLane, setBottomLane] = useState([]);
  const [unassignedCards, setUnassignedCards] = useState([]);
  const [aiHand, setAiHand] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [hasDealt, setHasDealt] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('matching');
  const [gameResult, setGameResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Effect for online mode
  useEffect(() => {
    if (isTrialMode || gameStatus === 'finished') return;
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/index.php?action=game_status&roomId=${roomId}&userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setGameStatus(data.gameStatus);
          setPlayers(data.players);
          const me = data.players.find(p => p.id === user.id);
          if (data.hand && !hasDealt) {
            // In online mode, hand comes pre-set or player arranges
            setTopLane(data.hand.top || []);
            setMiddleLane(data.hand.middle || []);
            setBottomLane(data.hand.bottom || []);
            setHasDealt(true);
            setIsReady(me ? !!me.is_ready : false);
          }
          if (data.gameStatus === 'finished' && data.result) {
            setGameResult(data.result);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        setErrorMessage("与服务器断开连接");
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [roomId, user.id, gameStatus, hasDealt, isTrialMode]);

  // Effect for trial mode setup
  useEffect(() => {
    if (!isTrialMode) return;
    const { playerHand, aiHand: initialAiHand } = dealOfflineThirteenGame();
    setUnassignedCards(playerHand);
    setAiHand(getAiThirteenHand(initialAiHand));
    setHasDealt(true);
    setPlayers([
      { id: user.id, phone: user.phone, is_ready: true },
      { id: 'ai', phone: 'AI Player', is_ready: true }
    ]);
    setGameStatus('playing');
  }, [isTrialMode, user]);


  const handleReadyToggle = async () => {
    // This button is not shown in trial mode
    setIsLoading(true);
    setErrorMessage('');
    const action = isReady ? 'unready' : 'ready';
    try {
      await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, roomId, action })
      });
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (isLoading || isReady) return;
    if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
      setErrorMessage(`牌道数量错误！`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    if (isTrialMode) {
      const playerHand = { top: topLane, middle: middleLane, bottom: bottomLane };
      const result = calculateThirteenTrialResult(playerHand, aiHand);
      const modalResult = {
        players: [
          { name: user.phone, hand: playerHand, score: result.playerScore },
          { name: 'AI', hand: aiHand, score: -result.playerScore }
        ],
        winner: result.winner
      };
      setGameResult(modalResult);
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        userId: user.id,
        roomId: roomId,
        action: 'submit_hand',
        hand: { top: topLane, middle: middleLane, bottom: bottomLane },
      };
      await fetch('/api/index.php?action=player_action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setIsReady(true);
    } catch (err) {
      setErrorMessage('与服务器通信失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (card, source, sourceLaneName = null) => {
    const cardIsSelected = selectedCards.some(c => areCardsEqual(c, card));

    // Create copies of state arrays
    let newSelectedCards = [...selectedCards];
    let newUnassigned = [...unassignedCards];
    let newTop = [...topLane];
    let newMiddle = [...middleLane];
    let newBottom = [...bottomLane];

    const laneMap = { top: newTop, middle: newMiddle, bottom: newBottom };

    if (cardIsSelected) {
      // -- DESELECTING a card --
      // Remove from selected
      newSelectedCards = newSelectedCards.filter(c => !areCardsEqual(c, card));
      // Add back to its original source
      if (source === 'unassigned') newUnassigned.push(card);
      else if (sourceLaneName) laneMap[sourceLaneName].push(card);
    } else {
      // -- SELECTING a card --
      // Add to selected
      newSelectedCards.push(card);
      // Remove from its source
      if (source === 'unassigned') newUnassigned = newUnassigned.filter(c => !areCardsEqual(c, card));
      else if (sourceLaneName) laneMap[sourceLaneName] = laneMap[sourceLaneName].filter(c => !areCardsEqual(c, card));
    }

    // Update all states
    setSelectedCards(newSelectedCards);
    setUnassignedCards(sortCards(newUnassigned));
    setTopLane(sortCards(newTop));
    setMiddleLane(sortCards(newMiddle));
    setBottomLane(sortCards(newBottom));
  };

  const handleLaneClick = (laneName) => {
    if (selectedCards.length === 0) return;

    const laneSetters = {
      top: setTopLane,
      middle: setMiddleLane,
      bottom: setBottomLane,
    };
    const lanes = {
      top: topLane,
      middle: middleLane,
      bottom: bottomLane,
    };

    const targetLane = lanes[laneName];
    const setter = laneSetters[laneName];
    const limit = LANE_LIMITS[laneName.replace('Lane', '')];

    if (targetLane.length + selectedCards.length > limit) {
      setErrorMessage(`此道最多只能放 ${limit} 张牌!`);
      return;
    }

    setter([...targetLane, ...selectedCards]);
    setSelectedCards([]);
  };

  const handleAutoSort = () => {
    if (!hasDealt) return;
    const allCards = isTrialMode ? unassignedCards : [...topLane, ...middleLane, ...bottomLane];
    const sorted = getSmartSortedHand(allCards.map(c => typeof c === 'string' ? parseCard(c) : c));
    if (sorted) {
      setTopLane(sorted.top);
      setMiddleLane(sorted.middle);
      setBottomLane(sorted.bottom);
      setUnassignedCards([]);
    }
  };

  const handleCloseResult = () => {
    setGameResult(null);
    onBackToLobby();
  };

  const renderPlayerName = (p) => {
    if (p.id === 'ai') return '电脑AI';
    if (!p.id || !user || p.id === user.id) return '你';
    return `玩家${p.phone.slice(-4)}`;
  };

  return (
    <div className="game-table-container sss-game-container">
      <div className="game-table-header">
        <button onClick={onBackToLobby} className="table-action-btn back-btn">&larr; 退出</button>
        <div className="game-table-title">{isTrialMode ? '十三张 - 试玩模式' : `十三张 ${gameMode === 'double' ? '翻倍场' : '普通场'}`}</div>
      </div>
      <div className="players-status-container">
        {players.map(p => (
          <div key={p.id} className={`player-status ${p.id === user.id ? 'is-me' : ''} ${p.is_ready ? 'is-ready' : ''}`}>
            <div className="player-avatar">{p.id === 'ai' ? 'AI' : p.phone.slice(-2)}</div>
            <div className="player-info">
              <div className="player-name">{renderPlayerName(p)}</div>
              <div className="player-ready-text">{hasDealt ? (isReady ? '已提交' : '理牌中...') : (p.is_ready ? '已准备' : '未准备')}</div>
            </div>
          </div>
        ))}
      </div>

      {isTrialMode && unassignedCards.length > 0 && (
          <Lane title="待选牌" cards={unassignedCards} onCardClick={(card) => handleCardClick(card, 'unassigned')} selectedCards={selectedCards} />
      )}

      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={(card) => handleCardClick(card, 'lane', 'top')} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={(card) => handleCardClick(card, 'lane', 'middle')} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={(card) => handleCardClick(card, 'lane', 'bottom')} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
      </div>
      {errorMessage && <p className="error-text">{errorMessage}</p>}
      <div className="game-table-footer">
        {isTrialMode || hasDealt ? (
          <>
            <button onClick={handleAutoSort} className="table-action-btn sort-btn" disabled={isReady}>自动理牌</button>
            <button onClick={handleConfirm} disabled={isLoading || isReady} className="table-action-btn confirm-btn">
              {isReady ? '等待开牌' : (isLoading ? '提交中...' : '确认')}
            </button>
          </>
        ) : (
          <button className="table-action-btn confirm-btn" onClick={handleReadyToggle} disabled={isLoading}>
            {isLoading ? '请稍候...' : '点击准备'}
          </button>
        )}
      </div>
      {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} gameType="thirteen" isTrial={isTrialMode} />}
    </div>
  );
};

export default ThirteenGame;