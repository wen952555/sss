import React from 'react';
import Card from './Card';
import './CardArea.css';

const CardArea = ({ title, cards, selectedCards, onCardClick, cardCount, className }) => {

    // Create an array of cards to render, including placeholders
    const renderCards = [];
    for (let i = 0; i < cardCount; i++) {
        renderCards.push(cards[i] || null);
    }

    return (
        <div className={`card-area ${className || ''}`}>
            {title && <h4 className="card-area-title">{title}</h4>}
            <div className="card-area-slot">
                {renderCards.map((card, index) => (
                    <Card
                        key={card || `placeholder-${index}`}
                        card={card}
                        isSelected={card && selectedCards?.includes(card)}
                        onClick={onCardClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default CardArea;
