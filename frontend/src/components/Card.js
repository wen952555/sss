// frontend/src/components/Card.js
import React from 'react';
import { getCardImageFilename, getCardDisplayName, SUIT_COLORS } from '../utils/cardUtils';
import './Card.css';

const Card = ({ card, isSelected, onClick, style = {}, provided, innerRef, isDragging }) => {
    // provided 和 innerRef 来自 react-beautiful-dnd Draggable
    // isDragging 也是 Draggable 提供的，可以用来添加拖拽时的特殊样式

    if (!card) {
        // 对于拖拽占位符或者空槽，我们可能需要不同的渲染方式，但HandDisplay会处理空槽
        // 这里假设非拖拽场景下的空卡槽渲染
        return <div className="card empty-slot" style={style}></div>;
    }

    const imageName = getCardImageFilename(card);
    const displayName = getCardDisplayName(card);
    const imageUrl = `${process.env.PUBLIC_URL}/cards/${imageName}`;

    const combinedStyle = {
        ...style,
        // react-beautiful-dnd 会通过 provided.draggableProps.style 来控制拖拽时的transform等
        // 所以我们不需要在这里直接应用太多与位置相关的样式，除非是特定于卡牌本身的
        opacity: isDragging ? 0.8 : 1, // 拖拽时稍微透明
        boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.3)' : style.boxShadow,
    };

    // 如果 provided 存在，则是作为 Draggable 项渲染
    if (provided && innerRef) {
        return (
            <div
                ref={innerRef} // Draggable 需要的 ref
                {...provided.draggableProps} // Draggable 需要的 props
                {...provided.dragHandleProps} // 使整个卡片可拖拽的 props
                className={`card ${isSelected ? 'selected' : ''} ${card.suit} ${isDragging ? 'dragging' : ''}`}
                style={combinedStyle} // 合并自定义style和dnd的style (dnd的style在draggableProps里)
                onClick={onClick && !isDragging ? () => onClick(card) : undefined} // 拖拽时不触发点击
                title={displayName}
            >
                <img src={imageUrl} alt={displayName} className="card-image" />
            </div>
        );
    }

    // 非拖拽场景下的渲染 (例如在已摆好的墩中，如果只显示不操作)
    // 但为了统一，最好所有卡牌都通过 Draggable/Droppable 管理，即使某些是不可拖拽源
    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${card.suit}`}
            onClick={onClick ? () => onClick(card) : undefined}
            style={combinedStyle}
            title={displayName}
        >
            <img src={imageUrl} alt={displayName} className="card-image" />
        </div>
    );
};

export default Card;
