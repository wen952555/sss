// frontend/src/components/Card.js
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const CARD_IMAGE_BASE_URL = '/cards/';

// 修改 Card 组件以接受外部传入的 style
const Card = ({ card, index, dynamicStyle = {} }) => { // 添加 dynamicStyle prop
    if (!card || !card.id) {
        console.error("Card object is invalid:", card);
        return <div className="card-error">无效卡牌数据</div>;
    }
    return (
        <Draggable draggableId={card.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`card ${snapshot.isDragging ? 'is-dragging' : ''}`} // 添加 is-dragging 类方便样式
                    style={{
                        ...provided.draggableProps.style, // react-beautiful-dnd 提供的样式
                        ...dynamicStyle, // 我们动态计算的样式
                    }}
                >
                    <img
                        src={`${CARD_IMAGE_BASE_URL}${card.imageName}`}
                        alt={`${card.readableValue} of ${card.readableSuit}`}
                    />
                </div>
            )}
        </Draggable>
    );
};

export default React.memo(Card);
