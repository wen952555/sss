// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const CARD_BASE_WIDTH = 58; 
const CARD_MARGIN_RIGHT = 2; 

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null);
    const [cardStyles, setCardStyles] = useState([]);

    const calculateLayout = useCallback(() => {
        if (!droppableRef.current || !droppableRef.current.offsetWidth || cards.length === 0) {
            setCardStyles(cards.map(() => ({ marginLeft: '0px' }))); 
            return;
        }

        // 获取容器的实际计算样式以得到 padding
        const computedStyle = getComputedStyle(droppableRef.current);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const containerWidth = droppableRef.current.offsetWidth - paddingLeft - paddingRight;
        
        // cardOuterWidthWithMargin 代表一张卡片加上它的右边距所需的总宽度
        // 这个变量现在会被下面的 totalCardsWidthIfFlat 使用
        const cardOuterWidthWithMargin = CARD_BASE_WIDTH + CARD_MARGIN_RIGHT;

        let newCardStyles = [];
        // 计算所有卡片平铺时占用的总宽度
        // 使用 cardOuterWidthWithMargin 来计算：(卡片数量 * cardOuterWidthWithMargin) - 最后一个卡片的右边距
        const totalCardsWidthIfFlat = (cards.length * cardOuterWidthWithMargin) - (cards.length > 0 ? CARD_MARGIN_RIGHT : 0);


        if (totalCardsWidthIfFlat <= containerWidth || cards.length <= 1) {
            // 宽度足够或只有一张牌，平铺显示
            newCardStyles = cards.map(() => ({ marginLeft: '0px' }));
        } else {
            // 宽度不足，需要堆叠
            let overlapAmount = 0;
            if (cards.length > 1) {
                const availableWidthForOverlap = containerWidth - CARD_BASE_WIDTH; 
                const numOverlappingCards = cards.length - 1;
                let exposedWidthPerCard = availableWidthForOverlap / numOverlappingCards;
                
                const minExposedPractical = CARD_BASE_WIDTH * 0.25; 
                if (exposedWidthPerCard < minExposedPractical && numOverlappingCards > 0) {
                    exposedWidthPerCard = minExposedPractical;
                }
                
                overlapAmount = CARD_BASE_WIDTH - exposedWidthPerCard;
                
                if (overlapAmount < 0) {
                    overlapAmount = 0;
                }
                const maxOverlap = CARD_BASE_WIDTH * 0.80; 
                if (overlapAmount > maxOverlap) {
                    overlapAmount = maxOverlap;
                }
            }

            newCardStyles = cards.map((card, index) => {
                if (index === 0) {
                    return { marginLeft: '0px' };
                } else {
                    const calculatedMarginLeft = -Math.min(overlapAmount, CARD_BASE_WIDTH * 0.85); 
                    return { marginLeft: `${calculatedMarginLeft.toFixed(2)}px` };
                }
            });
        }
        setCardStyles(newCardStyles);

    }, [cards]); // 保持 cards 作为主要依赖

    useEffect(() => {
        let observer;
        if (droppableRef.current) {
            // 延迟首次计算，等待DOM完全稳定
            const timer = setTimeout(calculateLayout, 50); 
            observer = new ResizeObserver(() => {
                calculateLayout();
            });
            observer.observe(droppableRef.current);

            return () => {
                clearTimeout(timer);
                if (observer && droppableRef.current) { // 确保 unobserve 前 droppableRef.current 仍然存在
                    observer.unobserve(droppableRef.current);
                }
            };
        }
    }, [calculateLayout, cards.length]); // calculateLayout 和 cards.length 作为依赖

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
