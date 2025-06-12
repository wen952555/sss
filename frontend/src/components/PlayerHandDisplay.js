// frontend/src/components/PlayerHandDisplay.js
import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import CardComponent from './Card'; // 确保 CardComponent 的导入路径正确

/**
 * PlayerHandDisplay 组件
 * 用于展示玩家的初始手牌区域，这些卡牌可以被拖拽到各个牌道。
 *
 * @param {object} props - 组件属性
 * @param {Array<object>} props.cards - 要展示的卡牌对象数组
 * @param {string} [props.droppableId="playerInitialHand"] - react-beautiful-dnd 的 Droppable ID
 */
const PlayerHandDisplay = ({ cards, droppableId = "playerInitialHand" }) => {
  if (!cards) {
    // 如果 cards 未定义或为 null，可以返回 null 或一个提示信息
    console.warn("PlayerHandDisplay received undefined or null cards prop.");
    return null; 
  }

  return (
    // 这个外层 div className="player-initial-hand-container" 主要用于包裹和语义化，
    // 其样式由 App.css 中的 .player-initial-hand-section (如果 App.js 中有这个包裹层) 或其自身控制。
    // 对于卡牌的横向布局，关键在于下面的 .player-hand-droppable。
    <div className="player-initial-hand-container"> 
      <Droppable droppableId={droppableId} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // 关键：确保这个 className 包含了 "player-hand-droppable"
            // snapshot.isDraggingOver 用于在有卡牌拖拽到此区域上方时，应用 "droppable-active" 类以实现视觉反馈（例如背景高亮）。
            className={`player-hand-droppable ${snapshot.isDraggingOver ? 'droppable-active' : ''}`}
          >
            {/* 遍历卡牌数组，为每张卡牌渲染一个 CardComponent */}
            {cards.map((card, index) => (
              <CardComponent 
                key={card.id}         // 使用卡牌的唯一 ID 作为 key
                cardData={card}       // 传递卡牌数据给子组件
                index={index}         // 卡牌在列表中的索引，react-beautiful-dnd 需要
                draggableId={card.id} // Draggable ID，通常也使用卡牌的唯一 ID
              />
            ))}
            {/* react-beautiful-dnd 需要的占位符，用于在拖拽时保持空间 */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default PlayerHandDisplay;
