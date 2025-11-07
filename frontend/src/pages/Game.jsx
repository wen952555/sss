
import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import styles from './Game.module.css';

const Game = ({ tableId, onBack }) => {
    const [hand, setHand] = useState([]);
    const [gameState, setGameState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFirstHand = () => {
            setLoading(true);
            const mockHand = Array.from({ length: 13 }, (_, i) => ({ rank: (i + 1).toString(), suit: 'spades' }));
            setHand(mockHand);
            setGameState({
                tableName: `桌号 ${tableId}`,
                round: '1/20'
            });
            setLoading(false);
        };
        fetchFirstHand();
    }, [tableId]);
    
    const handleSubmit = () => {
        alert('提交牌型！（逻辑待实现）');
    };

    if (loading) {
        return <div>正在进入游戏...</div>;
    }

    return (
        <div className={styles.gameContainer}>
            <button onClick={onBack} className={styles.backButton}>返回大厅</button>
            <div className={styles.gameInfo}>
                <h2 className={styles.title}>{gameState.tableName}</h2>
                <p>进度: {gameState.round}</p>
            </div>
            
            <div className={styles.playerHandArea}>
                <h3>我的手牌</h3>
                <div className={styles.cardsDisplay}>
                    {hand.map((card, index) => (
                        <Card key={index} card={card} />
                    ))}
                </div>
            </div>

            <div className={styles.actionArea}>
                <button onClick={handleSubmit}>确定牌型</button>
            </div>
        </div>
    );
};

export default Game;
