// frontend/src/components/PlayerHandDisplay.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card';

const PlayerHandDisplay = ({ cards, droppableId = "playerInitialHand" }) => {
  return (
    <div className="player-initial-hand-container">
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`player-hand-droppable ${snapshot.isDraggingOver ? 'droppable-active' : ''}`}
          >
            {cards.map((card, index) => (
              <CardComponent key={card.id} cardData={card} index={index} draggableId={card.id} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default PlayerHandDisplay;
