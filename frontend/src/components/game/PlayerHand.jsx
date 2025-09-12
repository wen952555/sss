import React, { useState, useEffect } from 'react';
import './PlayerHand.css';

const PlayerHand = ({ initialHand, onPlay, onPass, isMyTurn }) => {
  const [hand, setHand] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);

  // Effect to update the hand when the prop changes from the server
  useEffect(() => {
    setHand(initialHand);
  }, [initialHand]);

  // Effect to clear selected cards if it's no longer our turn
  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCards([]);
    }
  }, [isMyTurn]);

  const handleCardClick = (card) => {
    // Players should only be able to select cards on their turn
    if (!isMyTurn) return;

    setSelectedCards(currentSelected => {
      const isSelected = currentSelected.some(selectedCard => selectedCard.name === card.name);
      if (isSelected) {
        return currentSelected.filter(selectedCard => selectedCard.name !== card.name);
      } else {
        return [...currentSelected, card];
      }
    });
  };

  const isCardSelected = (card) => {
    return selectedCards.some(selectedCard => selectedCard.name === card.name);
  };

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

  if (!hand) {
    return <div className="player-hand-container"><h3>Loading hand...</h3></div>;
  }

  if (hand.length === 0) {
    return <div className="player-hand-container"><h3>Congratulations, you won!</h3></div>;
  }

  return (
    <div className={`player-hand-container ${isMyTurn ? 'my-turn' : ''}`}>
      <h3>Your Hand {isMyTurn && "(Your Turn)"}</h3>
      <div className="cards-display">
        {hand.map((card, index) => (
          <img
            key={card.name}
            src={`/ppp/${card.name}.svg`}
            alt={`${card.rank} of ${card.suit}`}
            className={`card ${isCardSelected(card) ? 'selected' : ''} ${!isMyTurn ? 'disabled' : ''}`}
            onClick={() => handleCardClick(card)}
            style={{ left: `${index * 30}px` }} // Basic overlap styling
          />
        ))}
      </div>
      <div className="play-actions">
        <button
          onClick={handlePlayClick}
          disabled={!isMyTurn || selectedCards.length === 0}
          className="action-button play-button"
        >
          Play Selected
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
