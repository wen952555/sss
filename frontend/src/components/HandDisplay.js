// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import Card from './Card';
import './HandDisplay.css';

// ★★★ 移除了 HAND_TYPE_NAMES_LOCAL 的定义 ★★★
// const HAND_TYPE_NAMES_LOCAL = { /* ... */ };

const HandDisplay = ({ 
    title, 
    droppableId,
    cards,      
    handEvaluation, 
    cardStyle = {},
    isDropDisabled = false,
    type = "CARDS",
    containerClassName = ""
}) => {
    
    let evaluationText = '';
    if (handEvaluation && handEvaluation.name) { // ★★★ 只依赖后端提供的 handEvaluation.name ★★★
        evaluationText = handEvaluation.name;
    }
    // ★★★ 移除了使用 HAND_TYPE_NAMES_LOCAL 的 else if 分支 ★★★
    // else if (handEvaluation && handEvaluation.type !== undefined && HAND_TYPE_NAMES_LOCAL[handEvaluation.type]) {
    //     evaluationText = HAND_TYPE_NAMES_LOCAL[handEvaluation.type];
    // }


    const displayableCards = cards || [];
    const cardCountText = displayableCards.length > 0 
        ? `${displayableCards.length} 张` 
        : (title && title.toLowerCase().includes("墩") ? '空' : '无手牌');

    return (
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')} ${containerClassName}`}>
            <div className="dun-title-background-text">
                {title ? `${title} (${cardCountText})` : cardCountText} 
                {/* 如果 evaluationText 为空字符串，则不显示 " - 牌型: " */}
                {evaluationText && ` - 牌型: ${evaluationText}`}
            </div>

            <Droppable 
                droppableId={droppableId} 
                direction="horizontal"
                isDropDisabled={isDropDisabled}
                type={type}
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`cards-wrapper ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${isDropDisabled ? 'drop-disabled' : ''}`}
                    >
                        {displayableCards.map((card, index) => {
                            if (!card || !card.id) {
                                console.warn("HandDisplay: Attempting to render Draggable for invalid card data at index", index, card);
                                return null; 
                            }
                            return (
                                <Draggable 
                                    key={card.id} 
                                    draggableId={card.id} 
                                    index={index}
                                >
                                    {(providedDraggable, snapshotDraggable) => (
                                        <Card
                                            card={card}
                                            style={cardStyle}
                                            provided={providedDraggable}
                                            innerRef={providedDraggable.innerRef}
                                            isDragging={snapshotDraggable.isDragging}
                                        />
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default HandDisplay;
