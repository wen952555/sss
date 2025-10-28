import React from 'react';
import PlayerHandPyramid from './PlayerHandPyramid'; // Import the new component
import './GameResultModal.css';

const GameResultModal4P = ({ result, onClose, onPlayAgain, isTrial = false, user }) => {
    if (!result || !result.players || result.players.length === 0) {
        return null;
    }

    const me = result.players.find(p => p.id === user.id) || result.players[0];
    const myTotalScore = me.score || 0;

    const getTitle = () => {
        if (myTotalScore > 0) return '恭喜胜利';
        if (myTotalScore < 0) return '惜败';
        return '平局';
    };

    return (
        <div className="result-modal-backdrop">
            <div className="result-modal-container">
                <div className="result-modal-header">
                    <h2>{getTitle()}</h2>
                    <p>总分: <span className={myTotalScore > 0 ? 'score-win' : (myTotalScore < 0 ? 'score-loss' : '')}>{myTotalScore > 0 ? `+${myTotalScore}` : myTotalScore}</span></p>
                    {isTrial && <p className="trial-mode-notice">本局为试玩，积分不计入总分</p>}
                </div>

                <div className="result-players-container">
                    {result.players.map((player) => {
                        const isMe = player.id === user.id;
                        const playerName = isMe ? '你' : (player.name || player.phone);
                        const playerScore = isMe ? player.score : player.pairwiseScore;

                        return (
                            <div key={player.id} className={`player-result-row ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info-section">
                                    <div className="player-info">
                                        <span className="player-name">{playerName}</span>
                                        {playerScore !== undefined && (
                                            <span className={`player-score ${playerScore > 0 ? 'score-win' : (playerScore < 0 ? 'score-loss' : '')}`}>
                                                {playerScore > 0 ? `+${playerScore}` : playerScore}
                                            </span>
                                        )}
                                        {isMe && player.pairwiseScores && (
                                            <div className="pairwise-scores">
                                                {player.pairwiseScores.map(ps => (
                                                    <div key={ps.opponentName}>
                                                        vs {ps.opponentName}: <span className={ps.score > 0 ? 'score-win' : (ps.score < 0 ? 'score-loss' : '')}>
                                                            {ps.score > 0 ? `+${ps.score}` : ps.score}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!isMe && player.laneResults && (
                                            <div className="lane-results">
                                                {player.laneResults.map((res, i) => (
                                                    <span key={i} className={`lane-result-badge lane-${res}`}>
                                                        {res === 'win' ? '胜' : res === 'loss' ? '负' : '平'}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Replace the old rendering logic with the new component */}
                                    <PlayerHandPyramid hand={player.hand} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="result-modal-footer">
                    <button onClick={onClose} className="result-btn exit-btn">退出游戏</button>
                    <button
                        onClick={() => {
                            onClose();
                            if (onPlayAgain) onPlayAgain();
                        }}
                        className="result-btn continue-btn"
                    >
                        继续游戏
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameResultModal4P;
