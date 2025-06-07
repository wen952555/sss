// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const CARD_BASE_WIDTH = 58; 
const CARD_MARGIN_RIGHT = 2; 
const MIN_EXPOSED_WIDTH_ON_STACK = 15; 

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null); 
    const [cardStyles, setCardStyles] = useState([]); 

    const calculateLayout = useCallback(() => {
        if (!droppableRef.current || !droppableRef.current.offsetWidth || cards.length === 0) {
            setCardStyles(cards.map(() => ({ marginLeft: '0px' }))); 
            return;
        }

        const computedStyle = getComputedStyle(droppableRef.current);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const containerWidth = droppableRef.current.offsetWidth - paddingLeft - paddingRight;
        
        const cardOuterWidthWithMargin = CARD_BASE_WIDTH + CARD_MARGIN_RIGHT;
        const totalCardsWidthIfFlat = (cards.length * cardOuterWidthWithMargin) - (cards.length > 0 ? CARD_MARGIN_RIGHT : 0);

        let newCardStyles = [];

        if (totalCardsWidthIfFlat <= containerWidth || cards.length <= 1) {
            newCardStyles = cards.map(() => ({ marginLeft: '0px' }));
        } else {
            if (cards.length > 1) {
                let offsetX = (containerWidth - CARD_BASE_WIDTH) / (cards.length - 1);
                if (offsetX < MIN_EXPOSED_WIDTH_ON_STACK) {
                    offsetX = MIN_EXPOSED_WIDTH_ON_STACK;
                }
                if (offsetX > CARD_BASE_WIDTH) {
                    offsetX = CARD_BASE_WIDTH; 
                }
                const marginLeftValue = -(CARD_BASE_WIDTH - offsetX);
                newCardStyles = cards.map((card, index) => {
                    if (index === 0) {
                        return { marginLeft: '0px' };
                    } else {
                        return { marginLeft: `${Math.min(0, marginLeftValue.toFixed(2))}px` };
                    }
                });
            } else { 
                newCardStyles = [{ marginLeft: '0px' }];
            }
        }
        setCardStyles(newCardStyles);
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
                                dynamicStyle={cardStyles[index] || { marginLeft: '0px' }} 
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
