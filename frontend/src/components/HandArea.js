// frontend/src/components/HandArea.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const areaClass = isBanner ? 'hand-banner' : 'hand-column';
    // 调整占位提示，因为现在可以放任意数量的牌 (直到提交)
    const placeholderText = `拖拽牌到${title}`;

    return (
        <div className={`${areaClass} ${type}-hand`}>
            {/* cardLimit 仍然用于显示目标牌数 */}
            <h4>{title} ({cards.length}/{cardLimit}张)</h4> 
            <Droppable droppableId={droppableId} direction="horizontal">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''} ${isBanner ? 'banner-droppable' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Card key={card.id} card={card} index={index} />
                        ))}
                        {provided.placeholder}
                        {/* 只有当墩为空且没有拖拽物经过时，才显示占位符 */}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                            <div className="card-placeholder">{placeholderText}</div>
                        )}
                    </div>
                )}
            </Droppable>
            {evaluationText && <p className="hand-eval-text">{evaluationText}</p>}
        </div>
    );
};

export default HandArea;
