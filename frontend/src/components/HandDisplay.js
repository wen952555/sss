// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import Card from './Card'; // Card.js 之前已修复并导入
import './HandDisplay.css';

const HAND_TYPE_NAMES_LOCAL = { /* ... */ };

const HandDisplay = ({ 
    title, 
    droppableId,
    cards,      
    handEvaluation, 
    cardStyle = {},
    isDropDisabled = false,
    type = "CARDS",
    containerClassName = "" // 从 GameBoard.js 传入，例如 "is-hand-pool"
}) => {
    let evaluationText = '';
    if (handEvaluation) { /* ... */ }
    const displayableCards = cards || [];
    const cardCountText = displayableCards.length > 0 
        ? `${displayableCards.length} 张` 
        : (title && title.toLowerCase().includes("墩") ? '空' : '无手牌');

    return (
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')} ${containerClassName}`}>
            <div className="dun-title-background-text">
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
                        ref={provided.innerRef} // ★★★ 必须
                        {...provided.droppableProps} // ★★★ 必须
                        className={`cards-wrapper ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${isDropDisabled ? 'drop-disabled' : ''}`}
                    >
                        {displayableCards.map((card, index) => {
                            if (!card || !card.id) {
                                console.warn("HandDisplay: Invalid card data at index", index, card);
                                return null; 
                            }
                            return (
                                <Draggable 
                                    key={card.id} 
                                    draggableId={card.id} 
                                    index={index}
                                >
                                    {(providedDraggable, snapshotDraggable) => (
                                        // Card 组件内部会使用 providedDraggable 和 snapshotDraggable
                                        <Card
                                            card={card}
                                            style={cardStyle}
                                            provided={providedDraggable} // ★★★ 传递给 Card
                                            innerRef={providedDraggable.innerRef} // ★★★ 传递给 Card
                                            isDragging={snapshotDraggable.isDragging} // ★★★ 传递给 Card
                                        />
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder} {/* ★★★ 必须 */}
                    </div>
                )}
            </Droppable>
        </div>
    );
};
export default HandDisplay;
