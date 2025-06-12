// frontend/src/components/HandArea.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card';
// 移除下面这行导入，因为 HandArea 依赖 evaluateHand 返回的 name 属性
// import { HAND_TYPE_NAMES } from '../logic/handEvaluator'; 

const HandArea = ({ droppableId, title, cards, requiredCount, evaluatedHandType }) => {
  return (
    <div className="hand-area-zone">
      <div className="hand-area-header">
        <h3 className="hand-area-title">{title} ({cards.length}/{requiredCount})</h3>
        {evaluatedHandType && cards.length === requiredCount && (
          <span className="hand-type-display">{evaluatedHandType.name}</span>
        )}
      </div>
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`hand-area ${snapshot.isDraggingOver ? 'droppable-active' : ''}`}
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

export default HandArea;
