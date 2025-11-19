import React from 'react';
import './Card.css';

const Card = ({ card, isSelected, onClick }) => {
    if (!card) {
        return <div className="card-placeholder"></div>;
    }
    
    const cardName = card.replace('_of_', '-'); // e.g., 'ace-spades'
    const imageUrl = `/cards/${card}.svg`;

    const handleClick = () => {
        if (onClick) {
            onClick(card);
        }
    };

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''}`}
            onClick={handleClick}
        >
            <img
                src={imageUrl}
                alt={cardName}
                className="card-image"
                // Prevent drag ghost image
                onDragStart={(e) => e.preventDefault()}
            />
        </div>
    );
};

export default Card;
