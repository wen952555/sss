import React, { useRef, useState, useEffect } from 'react';
import Card from './Card';
import './Lane.css';

const areCardsEqual = (card1, card2) =>
  card1 && card2 && card1.rank === card2.rank && card1.suit === card2.suit;

const Lane = ({
  title, cards, onCardClick, onLaneClick,
  expectedCount, selectedCards = [],
}) => {
  const laneRef = useRef(null);
  const [laneWidth, setLaneWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (laneRef.current) {
        setLaneWidth(laneRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleAreaClick = () => {
    if (selectedCards.length > 0 && onLaneClick) {
      onLaneClick();
    }
  };

  const cardWidth = 80;
  const defaultOverlap = cardWidth / 3;
  let marginLeft = -defaultOverlap;

  if (cards.length > 1 && laneWidth > 0) {
    const totalCardWidth = cards.length * cardWidth;
    const totalOverlappedWidth = (cards.length - 1) * defaultOverlap;
    const totalWidth = totalCardWidth - totalOverlappedWidth;

    if (totalWidth > laneWidth) {
      const newOverlap = (totalCardWidth - laneWidth) / (cards.length - 1);
      marginLeft = -newOverlap;
    }
  }


  return (
    <div className="lane-wrapper">
      <div className="lane-header">
        <span className="lane-title">{`${title} (${expectedCount})`}</span>
      </div>
      <div className="card-placement-box" ref={laneRef} onClick={handleAreaClick}>
        {cards.map((card, idx) => {
          const isSelected = selectedCards.some(sel => areCardsEqual(sel, card));
          return (
            <div
              key={`${card.rank}-${card.suit}-${idx}`}
              className={`card-wrapper${isSelected ? ' selected' : ''}`}
              style={{
                zIndex: isSelected ? 100 + idx : idx,
                marginLeft: idx === 0 ? '0px' : `${marginLeft}px`
              }}
            >
              <Card
                card={card}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                isSelected={isSelected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lane;