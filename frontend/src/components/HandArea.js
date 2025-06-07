// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react'; // useCallback可能不再需要
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

// const CARD_BASE_WIDTH = 58; 
// const CARD_MARGIN_RIGHT = 2; 
// const MIN_EXPOSED_WIDTH_ON_STACK = 15;

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null); 
    // const [cardStyles, setCardStyles] = useState([]); // 暂时禁用

    // --- 修改点：暂时禁用 calculateLayout ---
    /*
    const calculateLayout = useCallback(() => {
        // ... (之前的计算逻辑) ...
    }, [cards]);

    useEffect(() => {
        let observer;
        if (droppableRef.current) {
            const timer = setTimeout(calculateLayout, 50); 
            observer = new ResizeObserver(() => {
                calculateLayout();
            });
            observer.observe(droppableRef.current);
            return () => {
                clearTimeout(timer);
                if (observer && droppableRef.current) {
                    observer.unobserve(droppableRef.current);
                }
            };
        }
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
                            droppableRef.current = el; // ref 仍然保留，以备将来使用
                        }}
                        {...provided.droppableProps}
                        className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''} ${isBanner ? 'banner-droppable' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Card
                                key={card.id}
                                card={card}
                                index={index}
                                // dynamicStyle={cardStyles[index] || { marginLeft: '0px' }} // 暂时不传递动态样式
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
