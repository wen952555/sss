// frontend/src/components/Results.jsx
import React from 'react';
import Hand from './Hand';
import './Results.css';

const Results = ({ results }) => {
    const { hands, results: playerScores } = results;
    const playerIds = Object.keys(hands);

    return (
        <div className="results-container">
            <h2>Game Over - Results</h2>
            <div className="results-grid">
                {playerIds.map(id => (
                    <div key={id} className="player-result">
                        <h4>Player: {id.substring(0, 6)}</h4>
                        <div className="player-hands-display">
                            <Hand name={`Front (+${playerScores[id]?.front || 0})`} cards={hands[id].front} />
                            <Hand name={`Middle (+${playerScores[id]?.middle || 0})`} cards={hands[id].middle} />
                            <Hand name={`Back (+${playerScores[id]?.back || 0})`} cards={hands[id].back} />
                        </div>
                        <p className="total-score">
                           Total Score: {playerScores[id]?.total || 0}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Results;