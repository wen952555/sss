// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import Card from './Card';
import './HandDisplay.css';

const HAND_TYPE_NAMES_LOCAL = {0: '乌龙', /* ... */ 8: '同花顺'};

const HandDisplay = ({ 
    title, 
    droppableId,
    cards,      
    handEvaluation, 
    cardStyle = {},
    isDropDisabled = false,
    type = "CARDS",
    containerClassName = "" // ★★★ 新增：接收外部传入的className ★★★
}) => {
    // ... (evaluationText, cardCountText逻辑不变) ...
    let evaluationText = ''; /* ... */
    const displayableCards = cards || [];
    const cardCountText = /* ... */ ;


    return (
        // ★★★ 应用外部传入的 className ★★★
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')} ${containerClassName}`}>
            <div className="dun-title-background-text">
                {title} ({cardCountText})
                {evaluationText && ` - 牌型: ${evaluationText}`}
            </div>
            <Droppable /* ... (Droppable props 不变) ... */ >
                {/* ... (Droppable children 不变) ... */}
            </Droppable>
        </div>
    );
};
export default HandDisplay;
