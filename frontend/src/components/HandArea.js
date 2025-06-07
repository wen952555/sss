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
        if (!droppableRef.current || cards.length === 0) {
            setCardStyles([]); // 如果没有容器或没有卡片，则清空样式
            return;
        }

        const containerWidth = droppableRef.current.offsetWidth;
        const cardOuterWidth = CARD_BASE_WIDTH + (CARD_MARGIN * 2); // 卡片占据的总宽度（包括两侧边距）
        
        let newCardStyles = [];
        const totalCardsWidthIfFlat = cards.length * cardOuterWidth;

        if (totalCardsWidthIfFlat <= containerWidth) {
            // 宽度足够，平铺显示 (没有特殊 style, 依赖 CSS 的 flex-wrap 和 margin)
            newCardStyles = cards.map(() => ({})); // 空样式对象
        } else {
            // 宽度不足，需要堆叠
            // 计算每张卡片应该露出的宽度，使得所有卡片能挤进容器
            // (容器宽度 - 第一张卡片的完整宽度) / (剩余卡片数量) = 每张后续卡片露出的宽度
            // 如果露出宽度小于某个阈值（比如卡片宽度的20%），则使用该阈值
            let overlapAmount = 0;
            if (cards.length > 1) {
                const availableWidthForOverlap = containerWidth - cardOuterWidth; // 除去第一张完整卡片后剩余的宽度
                const numOverlappingCards = cards.length - 1;
                let exposedWidthPerCard = availableWidthForOverlap / numOverlappingCards;

                // 确保露出的部分至少有一点，例如卡片宽度的20%，或者一个固定值
                const minExposedWidth = CARD_BASE_WIDTH * 0.2; 
                if (exposedWidthPerCard < minExposedWidth && numOverlappingCards > 0) {
                    exposedWidthPerCard = minExposedWidth;
                }
                
                // overlapAmount 是指卡片被覆盖的量，所以是 cardOuterWidth - exposedWidthPerCard
                // marginLeft 应该是负的这个值
                overlapAmount = cardOuterWidth - exposedWidthPerCard;
                if (overlapAmount < 0) overlapAmount = 0; // 防止正的 margin-left
            }


            newCardStyles = cards.map((card, index) => {
                if (index === 0) {
                    return {}; // 第一张牌没有 marginLeft
                } else {
                    return { marginLeft: `-${overlapAmount}px` };
                }
            });
        }
        setCardStyles(newCardStyles);

    }, [cards, droppableId]); // droppableId 也加入依赖，以防万一它会变（虽然在此应用中不太可能）

    useEffect(() => {
        calculateLayout(); // 初始计算一次
        
        // 监听窗口大小变化，重新计算布局
        // 使用 ResizeObserver 会更精确，但 window resize 是一个简单方案
        window.addEventListener('resize', calculateLayout);
        return () => {
            window.removeEventListener('resize', calculateLayout);
        };
    }, [calculateLayout, cards.length]); // 当卡片数量变化时也重新计算

    const areaClass = isBanner ? 'hand-banner' : 'hand-column';
    const placeholderText = `拖拽牌到${title}`;

    return (
        <div className={`${areaClass} ${type}-hand`}>
            <h4>{title} ({cards.length}/{cardLimit}张)</h4>
            <Droppable droppableId={droppableId} direction="horizontal">
                {(provided, snapshot) => (
                    // 将 ref 附加到实际的 div 上
                    <div
                        ref={(el) => {
                            provided.innerRef(el); // react-beautiful-dnd 需要的 ref
                            droppableRef.current = el; // 我们自己用于计算宽度的 ref
                        }}
                        {...provided.droppableProps}
                        className={`droppable-area ${snapshot.isDraggingOver ? 'is-dragging-over' : ''} ${isBanner ? 'banner-droppable' : ''}`}
                    >
                        {cards.map((card, index) => (
                            <Card
                                key={card.id}
                                card={card}
                                index={index}
                                dynamicStyle={cardStyles[index] || {}} // 应用计算出的样式
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
