import React from 'react';
import Card from './Card';

const Hand = ({ title, cards, group, onMoveCard }) => {
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', `${group},${index}`);
  };
  
  const handleDrop = (e, targetGroup, targetIndex) => {
    e.preventDefault();
    const [sourceGroup, sourceIndex] = e.dataTransfer.getData('text').split(',');
    onMoveCard(sourceGroup, parseInt(sourceIndex), targetGroup, targetIndex);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  return (
    <div className="hand">
      <h3>{title}</h3>
      <div 
        className="card-slot"
        onDrop={(e) => handleDrop(e, group, cards.length)}
        onDragOver={handleDragOver}
      >
        {cards.map((card, index) => (
          <div 
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, group, index)}
            onDragOver={handleDragOver}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hand;
