// frontend/src/components/HandArea.js - 简化版，文字和卡牌在同一层级
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card';

const HandArea = ({ droppableId, title, cards, evaluatedHandType, allowWrap = false }) => {
  return (
    <div className="hand-area-zone">
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`hand-area ${snapshot.isDraggingOver ? 'droppable-active' : ''} ${allowWrap ? 'allow-wrapping' : ''}`}
          >
            {/* 标题和牌型显示在内部 */}
            <div className="hand-info-internal">
              <h3 className="hand-area-title-internal">{title}</h3>
              {evaluatedHandType && (
                <span className="hand-type-display-internal">{evaluatedHandType.name}</span>
              )}
            </div>
            
            {/* 卡牌 */}
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
