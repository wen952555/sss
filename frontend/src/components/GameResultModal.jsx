import React from 'react';
import Card from './Card';
import './GameResultModal.css';
const PlayerHandDisplay = ({ hand, gameType }) => {
    if (!hand) return null;
    // Both games now use the same 3-lane structure for display
    const lanes = [hand.top, hand.middle, hand.bottom];

    return (
        <div className="result-hand-container">
            {lanes.map((laneCards, idx) => (
                <div key={idx} className="result-cards-row">
                    {laneCards && laneCards.map((card, cardIdx) => (
                        // Add a wrapper div to constrain the card size
                        <div key={cardIdx} style={{ width: '50px', height: '70px', margin: '0 2px' }}>
                            <Card card={card} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const GameResultModal = ({ result, onClose, onPlayAgain, gameType, isTrial = false }) => {
    if (!result || !result.players || result.players.length === 0) return null;

    const me = result.players.find(p => p.is_me) || result.players.find(p => p.id === result.myId) || result.players[0];
    const myTotalScore = me.score || 0;

    const getTitle = () => {
        if (myTotalScore > 0) return '恭喜胜利';
        if (myTotalScore < 0) return '惜败';
        return '平局';
    };

    const handlePlayAgain = () => {
        onClose(); // Close the modal first
        if (onPlayAgain) {
            onPlayAgain(); // Then trigger the next round
        }
    };

    return (
        <div className="result-modal-backdrop">
            <div className="result-modal-container">
                <div className="result-modal-header">
                    <h2>{getTitle()}</h2>
                    <p>总分: <span className={myTotalScore > 0 ? 'score-win' : (myTotalScore < 0 ? 'score-loss' : '')}>{myTotalScore > 0 ? `+${myTotalScore}` : myTotalScore}</span></p>
                </div>

                <div className="result-players-container">
                    {result.players.map((player, index) => {
                        const playerScore = player.score;
                        const isMe = player.is_me || (result.myId && player.id === result.myId) || (isTrial && index === 0);
                        const playerName = isMe ? '你' : player.name;

                        return (
                            <div key={player.name || index} className={`player-result-row ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <span className="player-name">{playerName}</span>
                                    {playerScore !== 'N/A' && (
                                      <span className={`player-score ${playerScore > 0 ? 'score-win' : (playerScore < 0 ? 'score-loss' : '')}`}>
                                          {playerScore > 0 ? `+${playerScore}` : playerScore}
                                      </span>
                                    )}
                                </div>
                                <PlayerHandDisplay hand={player.hand} gameType={gameType} />
                            </div>
                        );
                    })}
                </div>

                <div className="result-modal-footer">
                    <button onClick={onClose} className="result-btn exit-btn">退出游戏</button>
                    <button onClick={handlePlayAgain} className="result-btn continue-btn">继续游戏</button>
                </div>
            </div>
        </div>
    );
};

export default GameResultModal;