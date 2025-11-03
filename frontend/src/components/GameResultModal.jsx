import React from 'react';
import GameResultModal4P from './GameResultModal4P';
import GameResultModal8P from './GameResultModal8P';

const GameResultModal = (props) => {
    const { result, user } = props;
    if (!result || !result.players) return null;

    const playerCount = result.players.length;

    if (playerCount <= 4) {
        return <GameResultModal4P {...props} user={user} />;
    } else {
        return <GameResultModal8P {...props} user={user} />;
    }
};

export default GameResultModal;
