// frontend/src/components/Card.js
import React from 'react';
// 移除了未使用的 SUIT_COLORS
import { getCardImageFilename, getCardDisplayName } from '../utils/cardUtils'; 
import './Card.css';

const Card = ({ card, isSelected, onClick, style = {}, provided, innerRef, isDragging }) => {
    if (!card) {
        return <div className="card empty-slot" style={style}></div>;
    }

    const imageName = getCardImageFilename(card);
    const displayName = getCardDisplayName(card); // 用于alt文本或后备显示
    const imageUrl = `${process.env.PUBLIC_URL}/cards/${imageName}`;

    const combinedStyle = {
        ...style,
        opacity: isDragging ? 0.8 : 1,
        boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.3)' : style.boxShadow,
        // 如果需要根据花色设置文字颜色，可以在这里重新添加:
        // color: card && SUIT_COLORS[card.suit] ? SUIT_COLORS[card.suit] : '#000',
    };

    if (provided && innerRef) {
        return (
            <div
                ref={innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`card ${isSelected ? 'selected' : ''} ${card.suit || ''} ${isDragging ? 'dragging' : ''}`} // 添加 card.suit 以便CSS可以针对花色（如果需要）
                style={{ ...combinedStyle, ...provided.draggableProps.style }} // 正确合并 dnd 的 style
                onClick={onClick && !isDragging ? () => onClick(card) : undefined}
                title={displayName}
            >
                <img src={imageUrl} alt={displayName} className="card-image" />
            </div>
        );
    }

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${card.suit || ''}`}
            onClick={onClick ? () => onClick(card) : undefined}
            style={combinedStyle}
            title={displayName}
        >
            <img src={imageUrl} alt={displayName} className="card-image" />
        </div>
    );
};

export default Card;
