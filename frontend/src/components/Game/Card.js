// frontend/src/components/Game/Card.js
import React from 'react';
import { getCardImageFilename, getCardDetails } from '../../utils/cardUtils'; // 路径确保正确
import './Card.css'; // 导入 Card.css

const Card = ({ cardId, onClick, isSelected, style, isDraggable = false, idForDnd }) => {
    if (!cardId) {
        return <div className="card placeholder" style={style}>?</div>;
    }

    const details = getCardDetails(cardId); // 获取卡牌的详细信息

    let imageName = 'placeholder.svg'; // 默认占位符
    let altText = cardId;
    let displayTitle = cardId;

    if (details) {
        // **修改：将 details 对象中需要的字段传递给 getCardImageFilename**
        imageName = getCardImageFilename({ 
            valueName: details.valueName, // 'A', 'K', 'T', '8', etc.
            suitId: details.suitId      // 's', 'h', 'd', 'c'
        });
        altText = `${details.displayName}${details.suitSymbol}`;
        displayTitle = `${details.suitName}${details.displayName}`;
    } else {
        console.warn(`Card.js: Could not get details for cardId '${cardId}', using placeholder.`);
    }

    const imagePath = process.env.PUBLIC_URL + `/assets/cards/${imageName}`;
    const cardClasses = `card ${isSelected ? 'selected' : ''} ${isDraggable ? 'draggable' : ''}`;

    const handleClick = () => {
        if (onClick && !isDraggable) { // 如果可拖拽，通常点击由拖拽处理或禁用
            onClick(cardId);
        }
    };

    return (
        <div
            id={idForDnd} 
            className={cardClasses}
            onClick={handleClick} 
            style={style} 
            title={displayTitle}
        >
            <img 
                src={imagePath} 
                alt={altText} 
                onError={(e) => { 
                    e.target.onerror = null; 
                    console.warn(`Card.js: Image load failed for ${imageName} (path: ${imagePath}). CardId: ${cardId}`);
                    // 如果图片加载失败，可以尝试显示文字，或者确保 placeholder.svg 存在
                    e.target.style.display = 'none'; // 隐藏损坏的图片
                    const parent = e.target.parentNode;
                    if (parent && !parent.querySelector('.card-text-fallback')) {
                        const fallbackText = document.createElement('span');
                        fallbackText.className = 'card-text-fallback';
                        fallbackText.textContent = details ? `${details.displayName}${details.suitSymbol}` : cardId;
                        parent.appendChild(fallbackText);
                    }
                }}
            />
        </div>
    );
};

export default Card;
