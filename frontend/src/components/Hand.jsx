// frontend/src/components/Hand.jsx
import React from 'react';
import Card from './Card';
import './Hand.css';

const Hand = ({ name, cards, handInfo, onCardClick, onSlotClick, selectedCard, isCompact = false }) => {
    const isSelected = (card) => {
        if (!selectedCard) return false;
        return selectedCard.card.suit === card.suit && selectedCard.card.rank === card.rank;
    };

    const handClass = `hand-slot ${name ? name.toLowerCase().split(' ')[0] : ''} ${isCompact ? 'compact' : ''}`;

    if (isCompact) {
        return (
            <div className={handClass}>
                <div className="hand-header">
                    {handInfo && <span className="hand-type">{handInfo.type.name}</span>}
                </div>
                <div className="cards-container">
                    {cards.map((card, index) => (
                        card ? <Card key={index} card={card} /> : null
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={handClass} onClick={onSlotClick}>
            <div className="hand-header">
                <span className="hand-name">{name}</span>
                {handInfo && <span className="hand-type">{handInfo.type.name}</span>}
            </div>
            <div className="cards-container">
                {cards.map((card, index) => (
                    card ? (
                        <Card
                            key={index}
                            card={card}
                            onClick={() => onCardClick(card)}
                            isSelected={isSelected(card)}
                        />
                    ) : null
                ))}
            </div>
        </div>
    );
};

export default Hand;