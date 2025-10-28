import React from 'react';
import Card from './Card';
// We can keep the GameResultModal.css import here if it contains the pyramid styles,
// or link to a separate CSS file if you created one.
import './GameResultModal.css';

const PlayerHandPyramid = ({ hand }) => {
    if (!hand || !hand.top || !hand.middle || !hand.bottom) {
        // Render nothing or a placeholder if the hand data is incomplete
        return <div>No hand data</div>;
    }

    const lanes = [
        { name: 'top-row', cards: hand.top },
        { name: 'middle-row', cards: hand.middle },
        { name: 'bottom-row', cards: hand.bottom },
    ];

    return (
        <div className="pyramid-hand-display">
            {lanes.map((lane, laneIndex) => (
                <div key={laneIndex} className={`pyramid-row ${lane.name}`}>
                    {lane.cards && lane.cards.map((card, cardIndex) => (
                        <div key={cardIndex} className="pyramid-card-wrapper">
                            <Card card={card} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default PlayerHandPyramid;
