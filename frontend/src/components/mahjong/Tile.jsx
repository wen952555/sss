import React from 'react';
import './Tile.css';

const Tile = ({ tile, onClick }) => {
  if (!tile) {
    return <div className="tile-placeholder"></div>;
  }

  const handleClick = () => {
    if (onClick) {
      onClick(tile);
    }
  };

  return (
    <div
      className={`tile ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
    >
      <img src={tile.image} alt={`${tile.suit} ${tile.rank}`} />
    </div>
  );
};

export default Tile;
