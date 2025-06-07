// src/components/Card.js
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const CARD_IMAGE_BASE_URL = '/cards/'; // Relative to public folder

const Card = ({ card, index }) => {
    if (!card || !card.id) {
        console.error("Card object is invalid:", card);
        return <div className="card-error">Invalid Card Data</div>;
    }
    return (
        <Draggable draggableId={card.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="card"
                    style={{
                        ...provided.draggableProps.style,
                        // Add any dragging styles if needed
                        // border: snapshot.isDragging ? '2px solid blue' : '1px solid #aaa',
                    }}
                >
                    <img
                        src={`${CARD_IMAGE_BASE_URL}${card.imageName}`}
                        alt={`${card.readableValue} of ${card.readableSuit}`}
                    />
                </div>
            )}
        </Draggable>
    );
};

export default React.memo(Card); // Memoize for performance if cards don't change often internally
