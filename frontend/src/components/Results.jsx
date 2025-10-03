// frontend/src/components/Results.jsx
import React from 'react';
import Hand from './Hand';
import './Results.css';

const Results = ({ results }) => {
    if (!results) {
        return <div>正在加载结果...</div>;
    }

    const { scores, hands, evals, playerDetails } = results;
    const playerSocketIds = Object.keys(hands);

    // Helper to get player name from their socket ID
    const getPlayerName = (socketId) => {
        // playerDetails might not be available in offline mode, so we have a fallback.
        if (playerDetails && playerDetails[socketId]) {
            return playerDetails[socketId]?.name;
        }
        // Fallback for offline mode or if details are missing
        const player = results.playerInfo?.find(p => p.id === socketId);
        return player?.name || `玩家 (ID: ${socketId.substring(0, 5)})`;
    };

    return (
        <div className="results-container">
            <h2 className="results-title">比牌结果</h2>
            <div className="results-grid">
                {playerSocketIds.map(socketId => {
                    const finalScore = scores[socketId];
                    const playerHands = hands[socketId];
                    const playerEvals = evals[socketId];
                    const comparisons = finalScore.comparisons || {};

                    return (
                        <div key={socketId} className="player-result-card">
                            <div className="player-header">
                                <h3 className="player-name">{getPlayerName(socketId)}</h3>
                                <div className={`player-total-score ${finalScore.total > 0 ? 'positive' : finalScore.total < 0 ? 'negative' : ''}`}>
                                    总分: {finalScore.total > 0 ? `+${finalScore.total}` : finalScore.total}
                                </div>
                            </div>

                            {finalScore.special && (
                                <div className="special-hand-announcement">
                                    🎉 特殊牌型: {finalScore.special} 🎉
                                </div>
                            )}

                            <div className="player-hands-display">
                                <Hand name="前墩" cards={playerHands.front} handInfo={playerEvals.front} isCompact={true} />
                                <Hand name="中墩" cards={playerHands.middle} handInfo={playerEvals.middle} isCompact={true} />
                                <Hand name="后墩" cards={playerHands.back} handInfo={playerEvals.back} isCompact={true} />
                            </div>

                            <div className="comparison-details">
                                <h4>比牌详情:</h4>
                                <ul>
                                    {Object.entries(comparisons).map(([opponentSocketId, score]) => (
                                        <li key={opponentSocketId} className={score > 0 ? 'positive' : score < 0 ? 'negative' : ''}>
                                            vs {getPlayerName(opponentSocketId)}: {score > 0 ? `+${score}` : score}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Results;