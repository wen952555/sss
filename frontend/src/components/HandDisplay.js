// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import Card from './Card'; // Card.js 之前已修复并导入
import './HandDisplay.css';

const HAND_TYPE_NAMES_LOCAL = {
    0: '乌龙', 
    1: '一对', 
    2: '两对', 
    3: '三条', 
    4: '顺子', 
    5: '同花', 
    6: '葫芦', 
    7: '铁支', 
    8: '同花顺'
}; // 确保这里格式正确

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
    if (handEvaluation) {
        if (handEvaluation.name) {
            evaluationText = handEvaluation.name;
        } else if (handEvaluation.type !== undefined && HAND_TYPE_NAMES_LOCAL[handEvaluation.type]) {
            evaluationText = HAND_TYPE_NAMES_LOCAL[handEvaluation.type];
        }
    }

    const displayableCards = cards || [];
    // ★★★ 仔细检查这一行，确保所有字符都是英文半角 ★★★
    const cardCountText = displayableCards.length > 0 
        ? `${displayableCards.length} 张` 
        : (title && title.toLowerCase().includes("墩") ? '空' : '无手牌');

    return (
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')} ${containerClassName}`}>
            <div className="dun-title-background-text">
                {/* 使用三元运算符确保 title 存在 */}
                {title ? `${title} (${cardCountText})` : cardCountText} 
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
                            // ★★★ 确保 card 和 card.id 存在才渲染 Draggable ★★★
                            if (!card || !card.id) {
                                console.warn("HandDisplay: Attempting to render Draggable for invalid card data at index", index, card);
                                return null; // 或者渲染一个占位符，但不应该是Draggable
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
