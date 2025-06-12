// frontend/src/components/Card.js (或 CardComponent.js)
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { POKER_IMAGE_PATH } from '../config'; // 从 config.js 导入

const CardComponent = ({ cardData, index, draggableId }) => {
  // 进行更严格的检查，确保 cardData 和 cardData.image 存在且是字符串
  if (!cardData || typeof cardData.image !== 'string' || cardData.image.trim() === '') {
      console.warn("CardComponent received invalid or missing cardData.image:", cardData);
      // 返回一个占位符，而不是 null，这样更容易调试布局
      return (
        <div 
          className="card card-placeholder" 
          style={{ 
            width: '70px', height: '100px', border: '1px dashed grey', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#eee', color: '#666'
          }}
        >
          ?
        </div>
      );
  }

  // process.env.PUBLIC_URL 在生产构建中通常是 '' (空字符串) 或指向部署的根路径
  // POKER_IMAGE_PATH 是 '/poker_images/'
  // cardData.image 是 'ace_of_spades.svg'
  // 最终 src 应该是 '/poker_images/ace_of_spades.svg' (相对于网站根目录)
  const imageUrl = `${process.env.PUBLIC_URL}${POKER_IMAGE_PATH}${cardData.image}`;

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
          title={cardData.name || draggableId} // 如果 name 不存在，使用 draggableId
        >
          <img 
            src={imageUrl} 
            alt={cardData.name || draggableId} 
            onError={(e) => { 
              // 图片加载失败时的处理
              console.error("Failed to load image:", imageUrl);
              e.target.style.display = 'none'; // 隐藏损坏的图片图标
              // 你可以在这里显示一个替代文本或占位符
              const parent = e.target.parentNode;
              if (parent && !parent.querySelector('.image-error-text')) {
                  const errorText = document.createElement('span');
                  errorText.className = 'image-error-text';
                  errorText.textContent = '无法加载';
                  errorText.style.color = 'red';
                  errorText.style.fontSize = '12px';
                  parent.appendChild(errorText);
              }
            }}
          />
        </div>
      )}
    </Draggable>
  );
};

export default CardComponent;
