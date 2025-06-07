// frontend/src/components/HandArea.js
// --- 修改点：从 React 导入中移除 useState, useEffect, useCallback ---
import React, { useRef } from 'react'; // 只保留 useRef，因为它仍被 droppableRef 使用
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

// const CARD_BASE_WIDTH = 58; 
// const CARD_MARGIN_RIGHT = 2; 
// const MIN_EXPOSED_WIDTH_ON_STACK = 15;

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null); 
    // const [cardStyles, setCardStyles] = useState([]); // 已被注释

    /* // calculateLayout 及其 useEffect 已被注释
    const calculateLayout = useCallback(() => {
        // ... 
    }, [cards]);

    useEffect(() => {
        // ...
    }, [calculateLayout, cards.length]); 
    */

    const areaClass = isBanner ? 'hand-banner' : 'hand-column';
    const placeholderText = `拖拽牌到${title}`;

    return (
        <div className={`${areaClass} ${type}-hand`}>
            <h4>{title} ({cards.length}/{cardLimit}张)</h4>
            <Droppable droppableId={droppableId} direction="horizontal">
                {(provided, snapshot) => (
                    <div
                        ref={(el) => {
                            provided.innerRef(el); 
                            droppableRef.current = el; 
                        }}
                        {...provided.droppableProps}
                        className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''} ${isBanner ? 'banner-droppable' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Card
                                key={card.id}
                                card={card}
                                index={index}
                                // dynamicStyle={cardStyles[index] || { marginLeft: '0px' }} // 已被注释
                            />
                        ))}
                        {provided.placeholder}
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
