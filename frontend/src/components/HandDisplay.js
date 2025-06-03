// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import Card from './Card';
import './HandDisplay.css';

const HAND_TYPE_NAMES_LOCAL = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};

const HandDisplay = ({ 
    title, 
    droppableId,
    cards,      
    handEvaluation, 
    // onCardClick, // 在纯拖拽模式下，这个可能不再需要
    // selectedCards = [], // 拖拽模式下，视觉选中效果可能意义不大
    cardStyle = {},
    isDropDisabled = false,
    type = "CARDS"
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
    const cardCountText = displayableCards.length > 0 ? `${displayableCards.length} 张` : (title && title.toLowerCase().includes("墩") ? '空' : '无手牌');

    return (
        // 添加一个特定的类名，例如基于title，方便CSS定位
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}`}>
            {/* 文字说明现在将通过CSS绝对定位于背景 */}
            <div className="dun-title-background-text">
                {title} ({cardCountText})
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
                        {displayableCards.map((card, index) => (
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
                        ))}
                        {provided.placeholder}
                        
                        {/* ★★★ 移除了固定的 .empty-slot-placeholder 渲染逻辑 ★★★ */}
                        {/* 现在只渲染实际的卡牌 */}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default HandDisplay;
