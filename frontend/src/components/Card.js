// frontend/src/components/Card.js
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { POKER_IMAGE_PATH } from '../config'; // Use config for path

const CardComponent = ({ cardData, index, draggableId }) => { // Renamed to avoid conflict with Card class
  if (!cardData || !cardData.image) {
      console.warn("CardComponent received invalid cardData:", cardData);
      return <div className="card-placeholder">?</div>; // Placeholder for invalid card
  }

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
          title={cardData.name}
          style={{ backgroundImage: `url(${POKER_IMAGE_PATH}${cardData.image.split('/').pop()})` }} // More robust image path
        >
          {/* Using background image for SVG can be better for scaling & aspect ratio */}
          {/* Or keep img tag if preferred */}
          {/* <img src={`${POKER_IMAGE_PATH}${cardData.image.split('/').pop()}`} alt={cardData.name} /> */}
        </div>
      )}
    </Draggable>
  );
};

export default CardComponent;
