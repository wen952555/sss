import React, { useState, useEffect } from 'react';
import { getResults } from '../utils/api';
import CardArea from '../components/CardArea';
import './GameResult.css';

const GameResult = ({ gameId, onNavigate }) => {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!gameId) {
            setError('No game ID provided.');
            setIsLoading(false);
            return;
        }

        const fetchResults = async () => {
            try {
                const data = await getResults(gameId);
                setResults(data);
            } catch (err) {
                setError(err.message || 'Failed to load game results.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [gameId]);

    if (isLoading) return <div className="loading-container">Loading results...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="container game-result">
            <h2>游戏结果</h2>
            <div className="results-grid">
                {results && results.map((player, index) => (
                    <div key={index} className="player-result-area">
                        <h4>{player.username} (Score: {player.total_score || 0})</h4>
                        <CardArea title="头道" cards={player.arranged_cards.head} cardCount={3} />
                        <CardArea title="中道" cards={player.arranged_cards.middle} cardCount={5} />
                        <CardArea title="尾道" cards={player.arranged_cards.tail} cardCount={5} />
                    </div>
                ))}
            </div>
            <button
                className="btn btn-primary"
                style={{ marginTop: '2rem' }}
                onClick={() => onNavigate('main-menu')}
            >
                返回主菜单
            </button>
        </div>
    );
};

export default GameResult;
