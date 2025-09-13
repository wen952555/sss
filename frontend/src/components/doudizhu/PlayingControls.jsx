import React from 'react';

const PlayingControls = ({ isMyTurn, onPlay, onPass }) => {
    if (!isMyTurn) {
        return <div className="controls-placeholder"></div>;
    }

    return (
        <div className="playing-controls">
            <button onClick={onPlay}>出牌</button>
            <button onClick={onPass}>不要</button>
        </div>
    );
};

export default PlayingControls;
