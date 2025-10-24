import React from 'react';
import Card from './Card';
import './GameResultModal.css';

const GameResultModal4P = ({ result, onClose, onPlayAgain, gameType, isTrial = false, user }) => {
    if (!result || !result.players || result.players.length === 0) return null;

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
                        const playerScore = player.score;
                        const isMe = player.id === user.id;
                        const playerName = isMe ? '你' : player.name;
                        const hand = player.hand;
                        const lanes = hand ? [hand.top, hand.middle, hand.bottom] : [];

                        return (
                            <div key={player.name} className={`player-result-row ${isMe ? 'is-me' : ''}`}>
                                <div className="result-hand-container">
                                    <div className="player-info">
                                        <span className="player-name">{playerName}</span>
                                        {playerScore !== 'N/A' && (
                                          <span className={`player-score ${playerScore > 0 ? 'score-win' : (playerScore < 0 ? 'score-loss' : '')}`}>
                                              {playerScore > 0 ? `+${playerScore}` : playerScore}
                                          </span>
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
                                    {lanes.map((laneCards, idx) => (
                                        <div key={idx} className="result-cards-row">
                                            {laneCards && laneCards.map((card, cardIdx) => (
                                                <div key={cardIdx} className="result-card-wrapper">
                                                    <Card card={card} />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
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