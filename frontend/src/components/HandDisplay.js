// frontend/src/components/HandDisplay.js
import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd'; // 引入 dnd 组件
import Card from './Card';
import './HandDisplay.css';

// 简单的数字到名称的映射 (与 Room.js 中的 localHandTypeNames 一致)
const HAND_TYPE_NAMES_LOCAL = {0: '乌龙', 1: '一对', 2: '两对', 3: '三条', 4: '顺子', 5: '同花', 6: '葫芦', 7: '铁支', 8: '同花顺'};

const HandDisplay = ({ 
    title, 
    droppableId, // ★★★ 新增：Droppable 区域的唯一 ID
    cards,       // 卡牌对象数组 (之前是 cardObjects，统一为 cards)
    handEvaluation, 
    onCardClick, // 这个在拖拽模式下可能用处不大，但可以保留给非拖拽场景或辅助点击
    selectedCards = [], // 仍然可以用于视觉选中效果，但拖拽不依赖它
    cardStyle = {},
    isDropDisabled = false, // ★★★ 新增：是否禁用放置到此区域
    type = "CARDS" // ★★★ 新增：Droppable 的类型，用于区分不同类型的可拖拽物 (如果需要)
}) => {
    
    let evaluationText = '';
    if (handEvaluation) {
        if (handEvaluation.name) {
            evaluationText = handEvaluation.name;
        } else if (handEvaluation.type !== undefined && HAND_TYPE_NAMES_LOCAL[handEvaluation.type]) {
            evaluationText = HAND_TYPE_NAMES_LOCAL[handEvaluation.type];
        }
    }

    // 确定要显示的卡牌，如果 cards 为空，则显示占位符（如果墩有容量）
    const displayableCards = cards || [];
    let emptySlotsCount = 0;
    if (title === "头墩") emptySlotsCount = Math.max(0, 3 - displayableCards.length);
    else if (title === "中墩") emptySlotsCount = Math.max(0, 5 - displayableCards.length);
    else if (title === "尾墩") emptySlotsCount = Math.max(0, 5 - displayableCards.length);
    // 对于手牌区，通常不显示固定空槽

    return (
        <div className={`hand-display-container hand-display-${title?.toLowerCase().replace(' ', '-')}`}>
            <h4>{title} ({displayableCards.length > 0 ? `${displayableCards.length} 张` : (title.includes("墩") ? '空' : '无手牌')})</h4>
            {evaluationText && (
                <p className="hand-evaluation">
                    牌型: {evaluationText}
                </p>
            )}

            <Droppable 
                droppableId={droppableId} 
                direction="horizontal" // 卡牌在墩内通常是横向排列
                isDropDisabled={isDropDisabled} // 控制是否允许放置
                type={type} // Droppable 类型
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`cards-wrapper ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${isDropDisabled ? 'drop-disabled' : ''}`}
                    >
                        {displayableCards.map((card, index) => (
                            <Draggable 
                                key={card.id} // Draggable 的 key 必须是稳定的字符串 ID
                                draggableId={card.id} // Draggable 的唯一 ID
                                index={index} // 卡牌在列表中的索引
                                // isDragDisabled={card.isFixed} // 如果某些牌是固定的，不能拖动
                            >
                                {(providedDraggable, snapshotDraggable) => (
                                    <Card
                                        card={card}
                                        // isSelected 由外部管理，或者拖拽时不需要选中效果
                                        // onClick={onCardClick} // 拖拽时点击行为可能需要调整
                                        style={cardStyle} // 传递外部卡牌样式
                                        // DND props
                                        provided={providedDraggable}
                                        innerRef={providedDraggable.innerRef}
                                        isDragging={snapshotDraggable.isDragging}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder} {/* Draggable 元素拖出后留下的占位符 */}
                        
                        {/* 显示固定数量的空槽 (如果不是手牌区且牌未满) */}
                        {emptySlotsCount > 0 && !title.toLowerCase().includes("手牌") &&
                            Array(emptySlotsCount).fill(null).map((_, i) => (
                                <div key={`empty-${droppableId}-${i}`} className="card empty-slot-placeholder" style={cardStyle}>
                                    {/* 可以放一个视觉占位符，或者让 Card 组件处理 null card */}
                                </div>
                            ))
                        }
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default HandDisplay;
