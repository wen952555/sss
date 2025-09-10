import React, { useState } from 'react';
import './PlayerHand.css';

const PlayerHand = ({ initialHand }) => {
  const [unassignedCards, setUnassignedCards] = useState(initialHand);
  const [front, setFront] = useState([]);
  const [middle, setMiddle] = useState([]);
  const [back, setBack] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = (card, source) => {
    if (selectedCard) {
      // A card is already selected, do nothing.
      // In a real implementation, we might want to swap cards.
      return;
    }
    setSelectedCard({ card, source });
  };

  const handleSegmentClick = (segmentName) => {
    if (!selectedCard) {
      return; // No card selected to place.
    }

    let segment, setSegment, maxSize;
    if (segmentName === 'front') {
      [segment, setSegment, maxSize] = [front, setFront, 3];
    } else if (segmentName === 'middle') {
      [segment, setSegment, maxSize] = [middle, setMiddle, 5];
    } else { // back
      [segment, setSegment, maxSize] = [back, setBack, 5];
    }

    if (segment.length >= maxSize) {
      alert(`The ${segmentName} hand is full.`);
      return;
    }

    // Move card from source to destination
    setSegment([...segment, selectedCard.card]);
    if (selectedCard.source === 'unassigned') {
      setUnassignedCards(unassignedCards.filter(c => c !== selectedCard.card));
    } // TODO: Handle moving cards between segments

    setSelectedCard(null);
  };

  return (
    <div className="player-hand-container">
      <h3>Your Hand</h3>
      <div className="unassigned-cards">
        {unassignedCards.map(card => (
          <div key={card} className={`card ${selectedCard?.card === card ? 'selected' : ''}`} onClick={() => handleCardClick(card, 'unassigned')}>
            {card}
          </div>
        ))}
      </div>

      <div className="segments">
        <div className="segment" onClick={() => handleSegmentClick('front')}>
          <h4>Front (3)</h4>
          <div className="cards">{front.map(c => <div key={c} className="card">{c}</div>)}</div>
        </div>
        <div className="segment" onClick={() => handleSegmentClick('middle')}>
          <h4>Middle (5)</h4>
          <div className="cards">{middle.map(c => <div key={c} className="card">{c}</div>)}</div>
        </div>
        <div className="segment" onClick={() => handleSegmentClick('back')}>
          <h4>Back (5)</h4>
          <div className="cards">{back.map(c => <div key={c} className="card">{c}</div>)}</div>
        </div>
      </div>

      <button className="confirm-button">Confirm Hand</button>
    </div>
  );
};

export default PlayerHand;
