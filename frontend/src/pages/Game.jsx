import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
// import { getNextCard, submitHand } from '../api';

const Game = ({ tableId }) => {
    const [hand, setHand] = useState([]); // 玩家手牌
    const [gameState, setGameState] = useState(null); // 游戏状态
    const [loading, setLoading] = useState(true);

    // 模拟获取手牌
    useEffect(() => {
        const fetchFirstHand = () => {
            setLoading(true);
            // 模拟API返回的手牌数据，例如 ['s1', 's2', 's3', ..., 's13']
            const mockHand = Array.from({ length: 13 }, (_, i) => `s${i + 1}`);
            setHand(mockHand);
            setGameState({
                tableName: '2分场 - 1号桌',
                round: '1/20'
            });
            setLoading(false);
        };
        fetchFirstHand();
    }, [tableId]);
    
    // TODO: 实现理牌逻辑 (拖拽排序等)

    const handleSubmit = () => {
        alert('提交牌型！（逻辑待实现）');
        // const sortedHand = { front: [...], middle: [...], back: [...] };
        // submitHand({ tableId, hand: sortedHand });
    };

    if (loading) {
        return <div>正在进入游戏...</div>;
    }

    return (
        <div className="game-container">
            <div className="game-info">
                <h2>{gameState.tableName}</h2>
                <p>进度: {gameState.round}</p>
            </div>
            
            <div className="player-hand-area">
                <h3>我的手牌</h3>
                <div className="cards-display">
                    {hand.map(cardCode => (
                        <Card key={cardCode} cardCode={cardCode} />
                    ))}
                </div>
            </div>

            <div className="action-area">
                {/* 未来这里是三墩牌的放置区域 */}
                <button onClick={handleSubmit}>确定牌型</button>
            </div>
        </div>
    );
};

export default Game;