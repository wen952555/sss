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

const GameResultModal = ({ result, onClose, gameType, isTrial = false }) => {
    if (!result || !result.players || result.players.length === 0) return null;

    // In trial mode, the winner is passed directly. In online mode, we check score.
    const winner = isTrial ? result.winner : (result.players[0].score > 0 ? 'player' : (result.players[0].score < 0 ? 'opponent' : 'tie'));

    const getTitle = () => {
        if (isTrial) {
            if (winner === 'player') return '恭喜胜利';
            if (winner === 'ai') return '惜败';
            return '平局';
        }
        // Assuming the first player is "me" in online results for title purposes
        return result.players[0].score > 0 ? '恭喜胜利' : (result.players[0].score < 0 ? '惜败' : '平局');
    };

    return (
        <div className="result-modal-backdrop">
            <div className="result-modal-container">
                <div className="result-modal-header">
                    <h2>{getTitle()}</h2>
                    {!isTrial && <p>总分: <span className={result.players[0].score > 0 ? 'score-win' : (result.players[0].score < 0 ? 'score-loss' : '')}>{result.players[0].score > 0 ? `+${result.players[0].score}` : result.players[0].score}</span></p>}
                </div>

                <div className="result-players-container">
                    {result.players.map((player, index) => {
                        const playerScore = player.score || 0;
                        // In trial mode, we don't have a reliable 'me'. The first player is the user.
                        const isMe = isTrial ? index === 0 : (player.id === result.myId);
                        const playerName = isTrial ? (index === 0 ? '你' : '电脑AI') : (isMe ? '你' : `玩家 ${player.name.slice(-4)}`);

                        return (
                            <div key={index} className={`player-result-row ${isMe ? 'is-me' : ''}`}>
                                <div className="player-info">
                                    <span className="player-name">{playerName}</span>
                                    {!isTrial && (
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
                    <button onClick={onClose} className="result-btn continue-btn">继续游戏</button>
                </div>
            </div>
        </div>
    );
};

export default GameResultModal;