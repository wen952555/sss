import React, { useState, useEffect } from 'react';
import './PlayerHand.css';

const PlayerHand = ({ initialHand, onPlay, onPass, isMyTurn }) => {
  const [hand, setHand] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    setHand(initialHand);
  }, [initialHand]);

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCards([]);
    }
  }, [isMyTurn]);

  const handleCardClick = (card) => {
    if (!isMyTurn) return;
    setSelectedCards(currentSelected => {
      const isSelected = currentSelected.some(sc => sc.name === card.name);
      return isSelected
        ? currentSelected.filter(sc => sc.name !== card.name)
        : [...currentSelected, card];
    });
  };

  const isCardSelected = (card) => selectedCards.some(sc => sc.name === card.name);

  const handlePlayClick = () => {
    if (onPlay && isMyTurn) {
      onPlay(selectedCards);
      setSelectedCards([]);
    }
  };

  const handlePassClick = () => {
    if (onPass && isMyTurn) {
      onPass();
    }
  };

  if (!hand) return <div className="player-hand-container"><h3>Loading hand...</h3></div>;
  if (hand.length === 0) return <div className="player-hand-container"><h3>Congratulations, you won!</h3></div>;

  // --- Card positioning logic ---
  const cardWidth = 80;
  const overlap = 50; // How many pixels of the card to hide
  const totalHandWidth = (hand.length - 1) * (cardWidth - overlap) + cardWidth;

  return (
    <div className={`player-hand-container ${isMyTurn ? 'my-turn' : ''}`}>
      <h3>Your Hand</h3>
      <div className="cards-display" style={{ width: `${totalHandWidth}px` }}>
        {hand.map((card, index) => (
          <img
            key={card.name}
            src={`/ppp/${card.name}.svg`}
            alt={`${card.rank} of ${card.suit}`}
            className={`card ${isCardSelected(card) ? 'selected' : ''} ${!isMyTurn ? 'disabled' : ''}`}
            onClick={() => handleCardClick(card)}
            style={{ left: `${index * (cardWidth - overlap)}px` }}
          />
        ))}
      </div>
      <div className="play-actions">
        <button
          onClick={handlePlayClick}
          disabled={!isMyTurn || selectedCards.length === 0}
          className="action-button play-button"
        >
          Play
        </button>
        <button
          onClick={handlePassClick}
          disabled={!isMyTurn}
          className="action-button pass-button"
        >
          Pass
        </button>
      </div>
    </div>
  );
};

export default PlayerHand;
