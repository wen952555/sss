// frontend/src/components/Hand.jsx
import React from 'react';
import Card from './Card';
import './Hand.css';

const Hand = ({ name, cards, onCardClick, onSlotClick, selectedCard }) => {
    return (
        <div className="hand-container" onClick={onSlotClick}>
            <h3>{name}</h3>
            <div className="hand-slot">
                {cards.map(card => (
                    <Card
                        key={`${card.suit}-${card.rank}`}
                        card={card}
                        onClick={() => onCardClick(card)}
                        isSelected={selectedCard && selectedCard.card.suit === card.suit && selectedCard.card.rank === card.rank}
                    />
                ))}
            </div>
        </div>
    );
};

export default Hand;