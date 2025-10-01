// frontend/src/components/Results.jsx
import React from 'react';
import Hand from './Hand';
import './Results.css';

const Results = ({ results, playerInfo }) => {
    if (!results) {
        return <div>Loading results...</div>;
    }

    const { scores, hands, evals } = results;
    const playerIds = Object.keys(hands);

    const getPlayerName = (id) => playerInfo.find(p => p.id === id)?.name || 'Player';

    return (
        <div className="results-container">
            <h2 className="results-title">游戏结果</h2>
            <div className="results-grid">
                {playerIds.map(id => {
                    const finalScore = scores[id];
                    const playerHands = hands[id];
                    const playerEvals = evals[id];

                    return (
                        <div key={id} className="player-result-card">
                            <div className="player-header">
                                <h3 className="player-name">{getPlayerName(id)}</h3>
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
                                <Hand name="前墩" cards={playerHands.front} handInfo={playerEvals.front} />
                                <Hand name="中墩" cards={playerHands.middle} handInfo={playerEvals.middle} />
                                <Hand name="后墩" cards={playerHands.back} handInfo={playerEvals.back} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Results;
