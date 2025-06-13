// frontend/src/components/StaticCard.js
import React from 'react';
import { POKER_IMAGE_PATH } from '../config';

const StaticCard = ({ cardData, style }) => { // 添加 style prop 以接收来自 renderExpandedCards 的动态样式
  if (!cardData || typeof cardData.image !== 'string' || cardData.image.trim() === '') {
    return (
      <div 
        className="card static-card card-placeholder static-card-placeholder"
        style={style} // 应用动态样式
      >
        ?
      </div>
    );
  }

  const imageUrl = `${process.env.PUBLIC_URL}${POKER_IMAGE_PATH}${cardData.image}`;

  return (
    <div
      className="card static-card" // 基础类名
      title={cardData.name || cardData.id}
      style={style} // 应用动态样式 (width, height, position 等)
    >
      <img 
        src={imageUrl} 
        alt={cardData.name || cardData.id} 
        loading="lazy"
        onError={(e) => { 
          console.error(`StaticCard failed to load image: ${imageUrl}`, e);
          if (e.target.parentNode && !e.target.parentNode.querySelector('.image-error-text')) {
              e.target none !important; /* 移除所有卡牌外阴影 */`
`border: none !important;     /* 移除所有卡牌边框 */`
并且针对 `img` 标签也做了类似处理。

如果这些样式已经应用，但仍然看到类似边框的效果，可能有以下几种情况：

1.  **SVG图片自身包含了边框或白色背景**:
    *   有些SVG文件在设计时可能就包含了一个外部的矩形边框，或者一个不完全透明的背景色（例如白色）。你需要检查你的SVG源文件。
    *   **解决方案**：如果SVG源文件有问题，需要编辑SVG文件，移除边框或将背景设为透明。

2.  **CSS选择器优先级或特异性问题**:
    *   可能存在其他更高优先级的CSS规则仍在对这些卡牌或其内部的 `img` 标签应用边框或阴影。
    *   **解决方案**: 使用浏览器开发者工具检查一个在比牌界面中显示“边框”的卡牌元素 (`.static-card` 或其内部的 `img`)，查看“Computed”样式面板，找出是哪个CSS规则在设置 `border` 或 `box-shadow`。如果不是您期望的 `none !important`，则需要调整您的CSS选择器使其优先级更高，或者直接修改那个意外应用样式的规则。

3.  **`object-fit: contain;` 导致的视觉效果**:
    *   如果SVG的长宽比与 `.static-card` div的长宽比不完全一致，`object-fit: contain;` 会确保整个SVG都显示在div内，这可能会导致在较短的一边留下空白。如果这个空白恰好是SVG背景色（或默认的白色），看起来就像是边框。
    *   您在CSS中尝试了 `object-fit: fill;`，如果SVG是矢量图并且能良好拉伸，这可能是一个解决方案。但如果SVG包含位图元素或特定比例的矢量设计，`fill` 可能会导致变形。
    *   **解决方案**:
        *   确保SVG图片本身的长宽比与您在CSS中为 `.static-card` 设置的 `width` 和 `height` (或 `aspect-ratio`) 的比例一致。
        *   或者，如果SVG是透明背景，确保 `.static-card` 的 `background-color` 设置为 `transparent` 或与.style.display = 'none'; 
              const errorText = document.createElement('span');
              errorText.className = 'image-error-text';
              errorText.textContent = 'X';
              if (e.target.parentNode) {
                  e.target.parentNode.appendChild(errorText);
              }
          }
        }}
      />
    </div>
  );
};

export default StaticCard;
