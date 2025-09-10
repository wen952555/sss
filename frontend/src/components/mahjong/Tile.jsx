import React from 'react';
import './Tile.css';

const Tile = ({ tile }) => {
  if (!tile) {
    return <div className="tile-placeholder"></div>;
  }

  return (
    <div className="tile">
      <img src={tile.image} alt={`${tile.suit} ${tile.rank}`} />
    </div>
  );
};

export default Tile;
