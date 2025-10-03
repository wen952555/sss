// frontend/src/components/Results.jsx
import React from 'react';
import Hand from './Hand';
import './Results.css';

const Results = ({ results, playerInfo }) => {
    if (!results) {
        return <div>正在加载结果...</div>;
    }

    const { scores, hands, evals } = results;
    const playerIds = Object.keys(hands);

    // This function seems to have an issue because playerInfo might not be updated correctly
    // with user IDs. We should get the name from the player object in the room state if possible.
    // For now, we'll rely on the data we have.
    const getPlayerName = (id) => {
        const player = playerInfo.find(p => p.socketId === id || p.id === id);
        return player?.name || `玩家 (ID: ${id.substring(0, 5)})`;
    };

    return (
        <div className="results-container">
            <h2 className="results-title">游戏结果</h2>
            <table className="results-table">
                <thead>
                    <tr>
                        <th>玩家</th>
                        <th>前墩</th>
                        <th>中墩</th>
                        <th>后墩</th>
                        <th>特殊牌型</th>
                        <th>总分</th>
                    </tr>
                </thead>
                <tbody>
                    {playerIds.map(id => {
                        const finalScore = scores[id];
                        const playerHands = hands[id];
                        const playerEvals = evals[id];

                        return (
                            <tr key={id}>
                                <td>{getPlayerName(id)}</td>
                                <td><Hand cards={playerHands.front} handInfo={playerEvals.front} isCompact={true} /></td>
                                <td><Hand cards={playerHands.middle} handInfo={playerEvals.middle} isCompact={true} /></td>
                                <td><Hand cards={playerHands.back} handInfo={playerEvals.back} isCompact={true} /></td>
                                <td>{finalScore.special || '--'}</td>
                                <td className={`player-total-score ${finalScore.total > 0 ? 'positive' : finalScore.total < 0 ? 'negative' : ''}`}>
                                    {finalScore.total > 0 ? `+${finalScore.total}` : finalScore.total}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default Results;