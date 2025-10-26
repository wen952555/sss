import React from 'react';
import Lane from './Lane';

const CardLanes = ({
  unassignedCards,
  topLane,
  middleLane,
  bottomLane,
  onCardClick,
  onLaneClick,
  selectedCards,
  LANE_LIMITS,
}) => {
  return (
    <>
      {unassignedCards.length > 0 && (
        <Lane title="待选牌" cards={unassignedCards} onCardClick={onCardClick} selectedCards={selectedCards} />
      )}
      <div className="lanes-container">
        <Lane title="头道" cards={topLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('top')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.top} />
        <Lane title="中道" cards={middleLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('middle')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.middle} />
        <Lane title="尾道" cards={bottomLane} onCardClick={onCardClick} onLaneClick={() => onLaneClick('bottom')} selectedCards={selectedCards} expectedCount={LANE_LIMITS.bottom} isDisabled={LANE_LIMITS.bottom === 0} />
      </div>
    </>
  );
};

export default CardLanes;
