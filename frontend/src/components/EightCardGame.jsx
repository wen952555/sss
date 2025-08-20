import React, { useState, useEffect } from 'react';
import Card from './Card';
import Lane from './Lane';
import './EightCardGame.css';
import { getSmartSortedHandForEight } from '../utils/eightCardAutoSorter';
import GameResultModal from './GameResultModal';

const EightCardGame = ({ roomId, gameMode, onBackToLobby, user, onGameEnd }) => {
    const LANE_LIMITS = { top: 2, middle: 3, bottom: 3 };
    const [topLane, setTopLane] = useState([]);
    const [middleLane, setMiddleLane] = useState([]);
    const [bottomLane, setBottomLane] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [hasDealt, setHasDealt] = useState(false);
    const [players, setPlayers] = useState([]);
    const [gameStatus, setGameStatus] = useState('matching');
    const [gameResult, setGameResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (gameStatus === 'finished') return;

        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/game_status.php?roomId=${roomId}&userId=${user.id}`);
                const data = await response.json();
                if (data.success) {
                    setGameStatus(data.gameStatus);
                    setPlayers(data.players);

                    const me = data.players.find(p => p.id === user.id);
                    if (me) setIsReady(!!me.is_ready);

                    if (data.hand && !hasDealt) {
                        setMiddleLane(data.hand.middle);
                        setHasDealt(true);
                    }
                    if (data.gameStatus === 'finished' && data.result) {
                        setGameResult(data.result);
                        if (onGameEnd) {
                            const updatedUser = data.result.players.find(p => p.id === user.id);
                            if (updatedUser) onGameEnd(updatedUser);
                        }
                        clearInterval(intervalId);
                    }
                }
            } catch (error) {
                setErrorMessage("与服务器断开连接");
                clearInterval(intervalId);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [roomId, user.id, gameStatus, hasDealt, onGameEnd]);

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
        const allCards = [...topLane, ...middleLane, ...bottomLane];
        const sorted = getSmartSortedHandForEight(allCards);
        if (sorted) {
            setTopLane(sorted.top);
            setMiddleLane(sorted.middle);
            setBottomLane(sorted.bottom);
        }
    };

    const handleCloseResult = () => {
        setGameResult(null);
        onBackToLobby();
    };

    if (!hasDealt) {
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
                    <Lane title="头道" cards={topLane} expectedCount={LANE_LIMITS.top} />
                    <Lane title="中道" cards={middleLane} expectedCount={LANE_LIMITS.middle} />
                    <Lane title="尾道" cards={bottomLane} expectedCount={LANE_LIMITS.bottom} />
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