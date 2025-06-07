// frontend/src/components/HandArea.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit }) => {
    return (
        <div className={`hand-column ${type}-hand`}>
            <h4>{title} {cardLimit ? `(${cards.length}/${cardLimit}张)` : `(${cards.length}张)`}</h4>
            <Droppable droppableId={droppableId} direction="horizontal">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Card key={card.id} card={card} index={index} />
                        ))}
                        {provided.placeholder}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                            <div className="card-placeholder">放在这里</div>
                        )}
                    </div>
                )}
            </Droppable>
            {evaluationText && <p className="hand-eval-text">{evaluationText}</p>}
        </div>
    );
};

export default HandArea;
