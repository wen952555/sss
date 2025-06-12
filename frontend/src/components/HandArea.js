// frontend/src/components/HandArea.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card';

// 添加 allowWrap prop
const HandArea = ({ droppableId, title, cards, evaluatedHandType, allowWrap = false }) => {
  return (
    <div className="hand-area-zone">
      <div className="hand-area-header">
        <h3 className="hand-area-title">{title}</h3>
        {evaluatedHandType && ( // 只有当 evaluatedHandType 存在时才显示
          <span className="hand-type-display">{evaluatedHandType.name}</span>
        )}
      </div>
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // 根据 allowWrap 动态添加类名或直接修改样式
            className={`hand-area ${snapshot.isDraggingOver ? 'droppable-active' : ''} ${allowWrap ? 'allow-wrapping' : ''}`}
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
