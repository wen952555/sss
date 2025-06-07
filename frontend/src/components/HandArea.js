// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

// 这些常量现在非常关键，需要与 CSS 尽可能匹配
const CARD_BASE_WIDTH = 58; // 尝试减小基础宽度
const CARD_MARGIN_RIGHT = 2; // 尝试减小右边距

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null);
    const [cardStyles, setCardStyles] = useState([]);

    const calculateLayout = useCallback(() => {
        if (!droppableRef.current || !droppableRef.current.offsetWidth || cards.length === 0) {
            setCardStyles(cards.map(() => ({ marginLeft: '0px' }))); // 默认无偏移
            return;
        }

        const containerPadding = clamp(3, 0.5 * parseFloat(getComputedStyle(droppableRef.current).fontSize || '16'), 8) * 2;
        const containerWidth = droppableRef.current.offsetWidth - containerPadding;
        
        // 尝试从DOM获取第一张卡的实际宽度和边距，如果CSS是动态的
        // let actualCardWidth = CARD_BASE_WIDTH;
        // let actualCardMarginRight = CARD_MARGIN_RIGHT;
        // const firstCardEl = droppableRef.current.querySelector('.card');
        // if (firstCardEl) {
        //     const styles = getComputedStyle(firstCardEl);
        //     actualCardWidth = parseFloat(styles.width);
        //     actualCardMarginRight = parseFloat(styles.marginRight);
        // }
        // const cardOuterWidthWithMargin = actualCardWidth + actualCardMarginRight;

        // 使用常量进行计算，简化处理，但需保证CSS一致
        const cardOuterWidthWithMargin = CARD_BASE_WIDTH + CARD_MARGIN_RIGHT;


        let newCardStyles = [];
        const totalCardsWidthIfFlat = (cards.length * CARD_BASE_WIDTH) + ((cards.length > 0 ? cards.length - 1 : 0) * CARD_MARGIN_RIGHT);


        if (totalCardsWidthIfFlat <= containerWidth || cards.length <= 1) {
            // 宽度足够或只有一张牌，平铺显示
            newCardStyles = cards.map(() => ({ marginLeft: '0px' }));
        } else {
            // 宽度不足，需要堆叠
            // 目标：让所有牌都可见，即使是堆叠
            // (容器宽度 - 第一张卡片的完整宽度) / (剩余卡片数量) = 每张后续卡片露出的宽度
            const availableWidthForOverlap = containerWidth - CARD_BASE_WIDTH; // 除去第一张牌后，用于堆叠的宽度
            const numOverlappingCards = cards.length - 1;

            let exposedWidthPerCard = availableWidthForOverlap / numOverlappingCards;
            
            // 设定一个最小露出宽度，保证牌面可识别，例如卡片宽度的1/3或一个固定值
            const minExposedPractical = CARD_BASE_WIDTH * 0.25; // 例如露出25%
            if (exposedWidthPerCard < minExposedPractical) {
                exposedWidthPerCard = minExposedPractical;
            }

            // 根据新的 exposedWidthPerCard，重新计算 overlapAmount
            // overlapAmount 是指卡片被“吃掉”的部分
            let overlapAmount = CARD_BASE_WIDTH - exposedWidthPerCard;
            
            // 安全检查，确保 overlapAmount 不是负数或过大
            if (overlapAmount < 0) {
                overlapAmount = 0;
            }
            // 限制最大覆盖，比如最多覆盖卡片宽度的80%
            const maxOverlap = CARD_BASE_WIDTH * 0.80; 
            if (overlapAmount > maxOverlap) {
                overlapAmount = maxOverlap;
            }
            
            // 再次检查，如果即使按此 overlapAmount 堆叠，总宽度仍然超出容器
            // (第一张牌宽度 + 剩余牌数 * 露出宽度) 是否 > 容器宽度
            // const stackedTotalWidth = CARD_BASE_WIDTH + (numOverlappingCards * exposedWidthPerCard);
            // if (stackedTotalWidth > containerWidth) {
            //   //  这种情况比较复杂，可能需要进一步减小 exposedWidthPerCard 或接受部分截断
            //   //  或者，可以考虑动态调整卡片宽度本身 (更复杂)
            //   //  一个简单的处理是，保证至少第一张和最后一张能看到边缘
            // }


            newCardStyles = cards.map((card, index) => {
                if (index === 0) {
                    return { marginLeft: '0px' };
                } else {
                    return { marginLeft: `-${overlapAmount.toFixed(2)}px` }; // 保留两位小数
                }
            });
        }
        setCardStyles(newCardStyles);

    }, [cards]);

    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    useEffect(() => {
        let observer;
        if (droppableRef.current) {
            // 延迟首次计算，等待DOM完全稳定，特别是CSS clamp() 计算出的实际宽度
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
    }, [calculateLayout, cards.length]); // 确保 cards.length 变化时重新执行 effect 以重新观察

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
