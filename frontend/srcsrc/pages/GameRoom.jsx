import React, { useState, useEffect } from 'react';
import GameTable from '../components/GameTable';
import { getGame, submitArrangement, getArrangement } from '../utils/api';
import './GameRoom.css';

const GameRoom = ({ user, onNavigate }) => {
    const [gameData, setGameData] = useState(null);
    const [playerArrangement, setPlayerArrangement] = useState({
        head: [],
        middle: [],
        tail: [],
        unassigned: [],
    });
    const [selectedCards, setSelectedCards] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const data = await getGame();
                setGameData(data);
                setPlayerArrangement(prev => ({ ...prev, unassigned: data.player_hand }));
            } catch (err) {
                setError(err.message || '无法加载游戏数据');
            } finally {
                setIsLoading(false);
            }
        };
        fetchGame();
    }, []);

    const handleCardClick = (card) => {
        setSelectedCards(prev =>
            prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]
        );
    };

    const handleMoveCards = (targetArea) => {
        if (selectedCards.length === 0) return;

        setPlayerArrangement(prev => {
            const newArrangement = { ...prev };
            const sourceAreas = ['unassigned', 'head', 'middle', 'tail'];

            sourceAreas.forEach(area => {
                newArrangement[area] = newArrangement[area].filter(c => !selectedCards.includes(c));
            });

            newArrangement[targetArea] = [...newArrangement[targetArea], ...selectedCards];
            return newArrangement;
        });

        setSelectedCards([]);
    };

    const handleAutoArrange = async () => {
        try {
            const arrangement = await getArrangement(gameData.game_id);
            setPlayerArrangement({
                head: arrangement.head,
                middle: arrangement.middle,
                tail: arrangement.tail,
                unassigned: [],
            });
        } catch (err) {
            setError('无法获取智能理牌结果');
        }
    };

    const handleConfirm = async () => {
        setError('');
        const { head, middle, tail } = playerArrangement;

        if (head.length !== 3 || middle.length !== 5 || tail.length !== 5) {
            setError('牌墩数量不正确，请检查您的牌型');
            return;
        }

        try {
            await submitArrangement({
                game_id: gameData.game_id,
                arrangement: { head, middle, tail }
            });
            onNavigate('game-result');
        } catch (err) {
            setError('提交失败，服务器错误');
        }
    };

    if (isLoading) return <div className="loading-container">正在加载游戏...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="game-room">
            <GameTable
                playerArrangement={playerArrangement}
                opponentHands={gameData?.opponents || []}
                selectedCards={selectedCards}
                onCardClick={handleCardClick}
            />
             {error && <p className="error-message" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
            <div className="game-controls">
                <div className="arrangement-buttons">
                    <button onClick={() => handleMoveCards('head')} className="btn btn-secondary">移至头道</button>
                    <button onClick={() => handleMoveCards('middle')} className="btn btn-secondary">移至中道</button>
                    <button onClick={() => handleMoveCards('tail')} className="btn btn-secondary">移至尾道</button>
                    <button onClick={() => handleMoveCards('unassigned')} className="btn btn-secondary">移回手牌</button>
                </div>
                <div className="action-buttons">
                    <button onClick={handleAutoArrange} className="btn btn-secondary">智能理牌</button>
                    <button onClick={handleConfirm} className="btn btn-primary">确认提交</button>
                </div>
            </div>
        </div>
    );
};

export default GameRoom;
