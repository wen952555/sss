// frontend/src/components/Card.js
import React from 'react';
import { getCardImageFilename, getCardDisplayName, SUIT_COLORS } from '../utils/cardUtils';
import './Card.css'; // 创建这个CSS文件

const Card = ({ card, isSelected, onClick, style = {} }) => {
    if (!card) {
        return <div className="card empty-slot" style={style}></div>;
    }

    const imageName = getCardImageFilename(card);
    const displayName = getCardDisplayName(card); // 用于alt文本或后备显示

    // 构建 public 文件夹中图片的路径
    const imageUrl = `${process.env.PUBLIC_URL}/cards/${imageName}`;

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${card.suit}`}
            onClick={onClick ? () => onClick(card) : undefined}
            style={{ ...style, color: SUIT_COLORS[card.suit] }}
            title={displayName}
        >
            <img src={imageUrl} alt={displayName} className="card-image" />
            {/* 你也可以在这里直接显示文字，如果图片加载失败 */}
            {/* <span className="card-rank">{card.rank.charAt(0).toUpperCase()}</span>
            <span className="card-suit">{SUITS_UNICODE[card.suit]}</span> */}
        </div>
    );
};

export default Card;
