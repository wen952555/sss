// src/components/Game/Card.js
import React from 'react';
import { getCardImageFilename, getCardDetails } from '../../utils/cardUtils';
import './Card.css'; // For styling

// cardId is like "14s" (Ace of Spades) or "tc" (10 of Clubs)
const Card = ({ cardId, onClick, isSelected, style }) => {
    if (!cardId) return <div className="card placeholder"></div>;

    const details = getCardDetails(cardId); // Get 'A', '♠' etc.
    const imageName = getCardImageFilename(details ? { value: details.value.toLowerCase(), suit: details.suit.toLowerCase().replace('黑桃','spades').replace('红桃','hearts').replace('方块','diamonds').replace('梅花','clubs') } : cardId); // Crude mapping for example

    // Construct path assuming cards are in public/assets/cards/
    const imagePath = `/assets/cards/${imageName}`;

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''}`}
            onClick={onClick ? () => onClick(cardId) : undefined}
            style={style} // For drag-and-drop positioning
        >
            <img src={imagePath} alt={`${details ? details.value + ' of ' + details.suit : cardId}`} />
            {/* Or display text if images fail: <span>{details ? `${details.value}${details.suitSymbol}` : cardId}</span> */}
        </div>
    );
};
export default Card;
