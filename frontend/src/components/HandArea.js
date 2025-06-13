// frontend/src/components/HandArea.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card';

const HandArea = ({ droppableId, title, cards, evaluatedHandType, allowWrap = false }) => {
  return (
    // .hand-area-zone 这个外层包裹可能不再那么重要，主要样式集中在 .hand-area
    <div className="hand-area-zone">
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // hand-area 现在需要处理内部文字和卡牌的布局
            className={`hand-area ${snapshot.isDraggingOver ? 'droppable-active' : ''} ${allowWrap ? 'allow-wrapping' : ''}`}
          >
            {/* 方案一：将文字放在卡牌上方或角落 (使用绝对定位或flex order) */}
            <div className="hand-area-overlay-info">
              <h3 className="hand-area-title-internal">{title}</h3>
              {evaluatedHandType && (
                <span className="hand-type-display-internal">{evaluatedHandType.name}</span>
              )}
            </div>

            {/* 卡牌渲染区域 */}
            <div className="cards-container-internal">
              {cards.map((card, index) => (
                <CardComponent key={card.id} cardData={card} index={index} draggableId={card.id} />
              ))}
            </div>
            {provided.placeholder} {/* placeholder 应该在卡牌之后 */}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default HandArea;
