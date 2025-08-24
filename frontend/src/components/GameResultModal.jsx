import React from 'react';
import Card from './Card';
import './GameResultModal.css';
const PlayerHandDisplay = ({ hand, gameType }) => {
    if (!hand) return null;
    // SSS has 3 lanes, Eight-card has only one
    const lanes = gameType === 'eight'
        ? [hand.middle]
        : [hand.top, hand.middle, hand.bottom];

    return (
        <div className="result-hand-container">
            {lanes.map((laneCards, idx) => (
                <div key={idx} className="result-cards-row">
                    {laneCards && laneCards.map((card, cardIdx) => (
                        <Card key={`${card.rank}-${card.suit}-${cardIdx}`} card={card} />
                    ))}
                </div>
            ))}
        </div>
    );
};

const GameResultModal = ({ result, onClose, gameType }) => {
    if (!result || !result.players || result.players.length === 0) return null;

    // Find the main player ("me")
    const me = result.players.find(p => p.id === result.myId) || result.players[0];
    const myTotalScore = me.score || 0;

    return (
        <div className="result-modal-backdrop">
            <div className="result-modal-container">
                <div className="result-modal-header">
                    <h2>{myTotalScore > 0 ? '恭喜胜利' : (myTotalScore < 0 ? '惜败' : '平局')}</h2>
                    <p>总分: <span className={myTotalScore > 0 ? 'score-win' : (myTotalScore < 0 ? 'score-loss' : '')}>{myTotalScore > 0 ? `+${myTotalScore}` : myTotalScore}</span></p>
                </div>

                <div className="result-players-container">
                    {result.players.map((player) => {
                        const playerScore = player.score || 0;
                        const isMe = player.id === me.id;
                        return (
                            <div key={player.id} className={`player-result-row ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <span className="player-name">{isMe ? '你' : `玩家 ${player.name.slice(-4)}`}</span>
                                    <span className={`player-score ${playerScore > 0 ? 'score-win' : (playerScore < 0 ? 'score-loss' : '')}`}>
                                        {playerScore > 0 ? `+${playerScore}` : playerScore}
                                    </span>
                                </div>
                                <PlayerHandDisplay hand={player.hand} gameType={gameType} />
                            </div>
                        );
                    })}
                </div>

                <div className="result-modal-footer">
                    <button onClick={onClose} className="result-btn exit-btn">退出游戏</button>
                    <button onClick={onClose} className="result-btn continue-btn">继续游戏</button>
                </div>
            </div>
        </div>
    );
};

export default GameResultModal;