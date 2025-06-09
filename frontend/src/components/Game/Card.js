// frontend/src/components/Game/Card.js
import React from 'react';
import { getCardImageFilename, getCardDetails } from '../../utils/cardUtils'; // 确保路径正确
import './Card.css'; // 导入 Card.css

// cardId 示例: "14s" (黑桃A), "Tc" (梅花10), "2d" (方块2)
// onClick 是一个函数，当卡牌被点击时调用，通常传递 cardId
// isSelected 是一个布尔值，指示卡牌是否被选中，用于应用 .selected 样式
// style 属性用于 react-dnd 等库的拖拽定位
const Card = ({ cardId, onClick, isSelected, style, isDraggable = false, idForDnd }) => {
    if (!cardId) {
        return <div className="card placeholder" style={style}>?</div>;
    }

    const details = getCardDetails(cardId); // 获取卡牌的详细信息

    // 从 details 中获取用于生成图片文件名的标准 value 和 suit
    // 或者直接使用 cardId 如果 getCardImageFilename 能够处理后端格式的 cardId
    const imageName = details ? details.image : getCardImageFilename(cardId); // details.image 应该包含 getCardImageFilename 的结果

    // 假设卡牌 SVG 图片存放在 public/assets/cards/ 目录下
    const imagePath = process.env.PUBLIC_URL + `/assets/cards/${imageName}`;

    const cardClasses = `card ${isSelected ? 'selected' : ''}`;

    const handleClick = () => {
        if (onClick) {
            onClick(cardId);
        }
    };

    const cardContent = (
        <img 
            src={imagePath} 
            alt={details ? `${details.name}${details.suitSymbol}` : cardId} 
            onError={(e) => { 
                e.target.onerror = null; // 防止无限循环
                // 可以设置一个备用图片或文本
                console.warn(`图片加载失败: ${imagePath}`);
                e.target.alt = `图片 ${imageName} 加载失败`; // 或者直接显示牌面文字
                // e.target.parentNode.innerHTML = `<span>${details ? `${details.name}${details.suitSymbol}` : cardId}</span>`;
            }}
        />
    );

    // 如果是可拖拽的，外部组件 (如 DraggableCard in GamePage) 会包裹它
    // 这个基础 Card 组件只负责展示和点击
    return (
        <div
            id={idForDnd} // 用于 react-dnd 的标识符
            className={cardClasses}
            onClick={!isDraggable ? handleClick : undefined} // 如果可拖拽，点击事件可能由拖拽处理
            style={style} // 用于 react-dnd 或其他库的定位
            title={details ? `${details.suitName}${details.name}` : cardId} // 鼠标悬停提示
        >
            {cardContent}
        </div>
    );
};

export default Card;
