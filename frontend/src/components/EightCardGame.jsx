import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import GameResultModal from './GameResultModal';
import { useGameEngine } from '../hooks/useGameEngine';

const areCardsEqual = (card1, card2) => {
    if (!card1 || !card2) return false;
    return card1.rank === card2.rank && card1.suit === card2.suit;
};

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
    const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };
    const { gameStatus, players, hand, gameResult, errorMessage, setGameResult } = useGameEngine(roomId, user.id, onGameEnd);

    const [topLane, setTopLane] = useState([]);
    const [middleLane, setMiddleLane] = useState([]);
    const [bottomLane, setBottomLane] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [handCards, setHandCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (hand) {
            const initialHand = [...hand.top, ...hand.middle, ...hand.bottom];
            setHandCards(initialHand);
        }
    }, [hand]);

    useEffect(() => {
        const me = players.find(p => p.id === user.id);
        if (me) {
            setIsReady(!!me.is_ready);
        }
    }, [players, user.id]);

    const handleCardClick = (card) => {
        setSelectedCards(prev =>
            prev.some(c => areCardsEqual(c, card))
                ? prev.filter(c => !areCardsEqual(c, card))
                : [...prev, card]
        );
    };

    const handleLaneClick = (targetLane) => {
        if (selectedCards.length === 0) return;

        let newLanes = {
            hand: [...handCards],
            top: [...topLane],
            middle: [...middleLane],
            bottom: [...bottomLane],
        };

        const cardsToMove = [...selectedCards];
        setSelectedCards([]);

        for (const card of cardsToMove) {
            newLanes.hand = newLanes.hand.filter(c => !areCardsEqual(c, card));
            newLanes.top = newLanes.top.filter(c => !areCardsEqual(c, card));
            newLanes.middle = newLanes.middle.filter(c => !areCardsEqual(c, card));
            newLanes.bottom = newLanes.bottom.filter(c => !areCardsEqual(c, card));
        }

        if (targetLane === 'hand') {
            newLanes.hand = [...newLanes.hand, ...cardsToMove];
        } else {
            const currentLaneSize = newLanes[targetLane].length;
            const limit = LANE_LIMITS[targetLane];
            if (currentLaneSize + cardsToMove.length > limit) {
                setSelectedCards(cardsToMove);
                return;
            }
            newLanes[targetLane] = [...newLanes[targetLane], ...cardsToMove];
        }

        setHandCards(newLanes.hand);
        setTopLane(newLanes.top);
        setMiddleLane(newLanes.middle);
        setBottomLane(newLanes.bottom);
    };

    const handleConfirm = async () => {
        if (isLoading || isReady) return;
        if (topLane.length !== LANE_LIMITS.top || middleLane.length !== LANE_LIMITS.middle || bottomLane.length !== LANE_LIMITS.bottom) {
            setErrorMessage(`牌道数量错误！`);
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        try {
            const payload = {
                userId: user.id,
                roomId: roomId,
                hand: { top: topLane, middle: middleLane, bottom: bottomLane },
            };
            const response = await fetch('/api/submit_hand.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.success) {
                setIsReady(true);
            } else {
                setErrorMessage(data.message || '提交失败');
            }
        } catch (err) {
            setErrorMessage('与服务器通信失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoSort = () => {
        const allCards = [...handCards, ...topLane, ...middleLane, ...bottomLane];
        const sorted = getSmartSortedHandForEight(allCards);
        if (sorted) {
            setHandCards([]);
            setTopLane(sorted.top);
            setMiddleLane(sorted.middle);
            setBottomLane(sorted.bottom);
        }
    };

    const handleCloseResult = () => {
        setGameResult(null);
        onBackToLobby();
    };

    if (!hand) {
        return <div className="loading-overlay">等待发牌...</div>;
    }

    return (
        <div className="table-root eight-card-game">
            <div className="table-panel">
                <div className="table-top-bar">
                    <button onClick={onBackToLobby} className="table-quit-btn">退出游戏</button>
                    <div className="table-score-box">急速八张</div>
                </div>
                <div className="players-status-bar">
                    {players.map(p => (
                        <div key={p.id} className={`player-status-item ${p.is_ready ? 'ready' : ''} ${p.id === user.id ? 'you' : ''}`}>
                            <span className="player-name">{p.id === user.id ? `你` : `玩家 ${p.phone.slice(-4)}`}</span>
                            <span className="status-text">{p.is_ready ? '已提交' : '理牌中...'}</span>
                        </div>
                    ))}
                </div>
                <div className="table-lanes-area">
                    <Lane title="头道" cards={topLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
                    <Lane title="中道" cards={middleLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
                    <Lane title="尾道" cards={bottomLane} onCardClick={handleCardClick} onLaneClick={() => handleLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} />
                </div>
                <div className="hand-area" onClick={() => handleLaneClick('hand')}>
                    <div className="hand-area-title">我的手牌</div>
                    <div className="card-lane">
                        {handCards.map((card, idx) => {
                            const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
                            return (
                                <div
                                    key={`${card.rank}-${card.suit}-${idx}`}
                                    className={`card-wrapper${isSelected ? ' selected' : ''}`}
                                    style={{ zIndex: isSelected ? 100 + idx : idx }}
                                    onClick={(e) => { e.stopPropagation(); handleCardClick(card); }}
                                >
                                    <Card card={card} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <div className="table-actions-bar">
                    <button onClick={handleAutoSort} className="action-btn orange" disabled={isReady}>自动理牌</button>
                    <button onClick={handleConfirm} disabled={isLoading || isReady} className="action-btn green">
                        {isReady ? '等待其他玩家...' : (isLoading ? '提交中...' : '确认牌型')}
                    </button>
                </div>
            </div>
            {gameResult && <GameResultModal result={gameResult} onClose={handleCloseResult} />}
        </div>
    );
};

export default EightCardGame;