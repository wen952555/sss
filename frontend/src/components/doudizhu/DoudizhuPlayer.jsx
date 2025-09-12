import React from 'react';
import './DoudizhuPlayer.css';

const DoudizhuPlayer = ({ name, hand, isLandlord, isMyTurn }) => {
  return (
    <div className={`doudizhu-player ${isMyTurn ? 'active' : ''}`}>
      <h3 className="player-name">
        {name} {isLandlord && ' (地主)'}
      </h3>
      <div className="player-hand">
        {hand.map((card, index) => (
          <img
            key={card.name}
            src={`/ppp/${card.name}.svg`}
            alt={card.name}
            className="card-small"
            style={{ left: `${index * 18}px` }}
          />
        ))}
      </div>
    </div>
  );
};

export default DoudizhuPlayer;
