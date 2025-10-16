import React from 'react';
import Hand from './Hand';
import './Results.css';

const Results = ({ results }) => {
    if (!results) {
        return <div>正在加载结果...</div>;
    }

    const { scores, hands, evals, playerDetails } = results;
    const playerSocketIds = Object.keys(hands);

    const getPlayerName = (socketId) => {
        if (playerDetails && playerDetails[socketId]) {
            return playerDetails[socketId]?.name;
        }
        const player = results.playerInfo?.find(p => p.id === socketId);
        return player?.name || `玩家 (ID: ${socketId.substring(0, 5)})`;
    };

    const getSegmentName = (segment) => {
        const names = {
            front: '前墩',
            middle: '中墩',
            back: '后墩'
        };
        return names[segment] || segment;
    }

    return (
        <div className="results-container">
            <h2 className="results-title">比牌结果</h2>
            <div className="results-grid">
                {playerSocketIds.map(socketId => {
                    const finalScore = scores[socketId];
                    const playerHands = hands[socketId];
                    const playerEvals = evals[socketId];

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
                                {['front', 'middle', 'back'].map(segment => {
                                    const segmentScore = Object.values(finalScore.segmentScores).reduce((acc, scores) => acc + (scores[segment] || 0), 0);
                                    const isWinner = Object.values(finalScore.segmentScores).every(scores => scores[segment] >= 0);
                                    return (
                                        <div key={segment} className={`segment-container ${isWinner ? 'winner' : ''}`}>
                                            <Hand name={getSegmentName(segment)} cards={playerHands[segment]} handInfo={playerEvals[segment]} isCompact={true} />
                                            <div className="segment-score">
                                                {segmentScore > 0 ? `+${segmentScore}` : segmentScore}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Results;