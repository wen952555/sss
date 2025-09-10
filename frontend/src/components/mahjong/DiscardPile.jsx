import React from 'react';
import Tile from './Tile';
import './DiscardPile.css';

const DiscardPile = ({ tiles }) => {
  return (
    <div className="discard-pile-container">
      <h3>出牌区</h3>
      <div className="discard-grid">
        {tiles.map(tile => (
          <Tile key={tile.id} tile={tile} />
        ))}
      </div>
    </div>
  );
};

export default DiscardPile;
