// frontend/src/components/HandArea.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import Card from './Card';

const CARD_BASE_WIDTH = 58; 
const CARD_MARGIN_RIGHT = 2; 
// 新增：堆叠时，每张牌最少露出的宽度 (px)
const MIN_EXPOSED_WIDTH_ON_STACK = 15; // 例如至少露出15px，您可以调整这个值

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
            // 宽度足够或只有一张牌，平铺显示
            newCardStyles = cards.map(() => ({ marginLeft: '0px' }));
        } else {
            // 宽度不足，需要堆叠，目标是均匀堆叠
            if (cards.length > 1) {
                // 计算在给定容器宽度下，为了让所有牌都尽量可见，每张后续牌应该相对前一张牌的偏移量 (即露出多少)
                // (容器宽度 - 第一张牌的完整宽度) / (N-1 张牌的堆叠段数) = 平均每段露出的宽度
                // offsetX 是指下一张牌相对于上一张牌的起始位置的偏移（即上一张牌露出的部分）
                let offsetX = (containerWidth - CARD_BASE_WIDTH) / (cards.length - 1);

                // 确保 offsetX 不小于我们设定的最小露出宽度
                if (offsetX < MIN_EXPOSED_WIDTH_ON_STACK) {
                    offsetX = MIN_EXPOSED_WIDTH_ON_STACK;
                }
                
                // 同时，offsetX 不应该大于卡片自身的宽度（那样就不是堆叠了）
                if (offsetX > CARD_BASE_WIDTH) {
                    offsetX = CARD_BASE_WIDTH; // 退化为不堆叠（但仍然受容器宽度限制）
                                            // 实际上，如果到这一步，上面的 totalCardsWidthIfFlat 判断应该已经处理了平铺情况
                                            // 这里主要是防止计算出异常值
                }

                // marginLeft 的值应该是 -(CARD_BASE_WIDTH - offsetX)
                // 即，向左移动“卡片宽度 - 露出的部分”
                const marginLeftValue = -(CARD_BASE_WIDTH - offsetX);

                newCardStyles = cards.map((card, index) => {
                    if (index === 0) {
                        return { marginLeft: '0px' };
                    } else {
                        // 安全检查，确保 marginLeftValue 是负数或0
                        return { marginLeft: `${Math.min(0, marginLeftValue.toFixed(2))}px` };
                    }
                });

                // 一个可选的最终检查：如果按照此 marginLeftValue，最后一张牌的右边缘仍然超出了容器，
                // 可能需要进一步调整（例如，稍微增加一点 marginLeftValue 的负值，但这会使每张牌露出的更少）
                // 或者接受最后一张牌可能被稍微截断一点，以保证前面的牌有最小露出。
                // 当前算法优先保证每张牌至少露出 MIN_EXPOSED_WIDTH_ON_STACK。
                // 如果 (CARD_BASE_WIDTH + (cards.length - 1) * offsetX) > containerWidth，说明即使按最小露出堆叠也超了
                // 这种极端情况，可能就需要所有牌挤得更紧，或者接受一些截断。
                // 为了简单，我们暂时不处理这种极端情况下的进一步压缩，而是依赖 overflow:hidden。
            } else { // 只有一张牌的情况，在上面的 if 分支已处理
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
