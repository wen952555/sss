// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const CARD_BASE_WIDTH = 60; // 卡片的理想基础宽度 (px) - 需要与 CSS 中的一致或作为常量
const CARD_MARGIN = 4;      // 卡片之间的理想间距 (px) - 需要与 CSS 中的一致或作为常量

const HandArea = ({ droppableId, cards, title, type, evaluationText, cardLimit, isBanner = false }) => {
    const droppableRef = useRef(null); // Ref for the droppable area
    const [cardStyles, setCardStyles] = useState([]); // 存储每张卡片的动态样式

    const calculateLayout = useCallback(() => {
        if (!droppableRef.current || !droppableRef.current.offsetWidth) { // 增加对 offsetWidth 的检查
            // 容器尚未渲染或宽度为0，延迟或跳过计算
            if (cards.length > 0) { // 如果有卡片但容器宽度未知，尝试稍后重试
                requestAnimationFrame(calculateLayout);
            } else {
                setCardStyles([]);
            }
            return;
        }
        if (cards.length === 0) {
            setCardStyles([]); 
            return;
        }


        const containerWidth = droppableRef.current.offsetWidth - (2 * clamp(3, 0.5 * parseFloat(getComputedStyle(droppableRef.current).fontSize), 8)); // 减去padding
        const cardOuterWidth = CARD_BASE_WIDTH + (CARD_MARGIN); // 卡片宽度 + 右边距 (或总边距的一半)
        
        let newCardStyles = [];
        // 尝试获取第一张卡片的实际宽度，如果CSS中是动态的 (更健壮的做法)
        // const firstCardElement = droppableRef.current.querySelector('.card');
        // const actualCardWidth = firstCardElement ? firstCardElement.offsetWidth : CARD_BASE_WIDTH;
        // const actualCardOuterWidth = actualCardWidth + CARD_MARGIN;

        const totalCardsWidthIfFlat = cards.length * cardOuterWidth - CARD_MARGIN; // 最后一张牌没有右边距

        if (totalCardsWidthIfFlat <= containerWidth) {
            // 宽度足够，平铺显示 (没有特殊 marginLeft, 依赖 CSS 的 margin-right)
            newCardStyles = cards.map(() => ({ marginLeft: '0px' })); // 明确设置 marginLeft 为0
        } else {
            // 宽度不足，需要堆叠
            let overlapAmount = 0;
            if (cards.length > 1) {
                // (容器宽度 - 第一张卡片的完整宽度) / (剩余卡片数量) = 每张后续卡片露出的宽度
                const availableWidthForOverlap = containerWidth - CARD_BASE_WIDTH; // 除去第一张完整卡片后剩余的宽度
                const numOverlappingCards = cards.length - 1;
                let exposedWidthPerCard = availableWidthForOverlap / numOverlappingCards;

                const minExposedWidth = CARD_BASE_WIDTH * 0.20; // 至少露出20%
                if (exposedWidthPerCard < minExposedWidth && numOverlappingCards > 0) {
                    exposedWidthPerCard = minExposedWidth;
                }
                
                // 如果计算出的露出宽度使得总宽度仍然超出，则进一步压缩（这是更复杂的逻辑，暂时简化）
                // 理想情况下，(numOverlappingCards * exposedWidthPerCard) + CARD_BASE_WIDTH 应该约等于 containerWidth

                overlapAmount = CARD_BASE_WIDTH - exposedWidthPerCard; // 这是指卡片自身被覆盖的量
                                                                 // marginLeft 应该是负的这个值
                if (overlapAmount < 0) overlapAmount = 0; 
            }


            newCardStyles = cards.map((card, index) => {
                if (index === 0) {
                    return { marginLeft: '0px' }; // 第一张牌没有 marginLeft
                } else {
                    // 确保堆叠的 marginLeft 不会使得牌完全消失或过度堆叠
                    const calculatedMarginLeft = -Math.min(overlapAmount, CARD_BASE_WIDTH * 0.85); // 最多覆盖85%
                    return { marginLeft: `${calculatedMarginLeft}px` };
                }
            });
        }
        setCardStyles(newCardStyles);

    }, [cards]); // 移除 droppableId，因为它不影响布局计算逻辑

    // 辅助函数 clamp (如果 CSS clamp 不可用或为了 JS 逻辑)
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    useEffect(() => {
        // 使用 ResizeObserver 监听容器大小变化，比 window.resize 更高效
        let observer;
        if (droppableRef.current) {
            calculateLayout(); // 初始计算
            observer = new ResizeObserver(() => {
                calculateLayout();
            });
            observer.observe(droppableRef.current);
        }
        return () => {
            if (observer && droppableRef.current) {
                observer.unobserve(droppableRef.current);
            }
            // window.removeEventListener('resize', calculateLayout); // 如果之前用了 window.resize
        };
    }, [calculateLayout, cards.length]); // 当卡片数量变化时也重新计算

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
                                dynamicStyle={cardStyles[index] || { marginLeft: '0px' }} // 提供默认值
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
