// frontend/src/components/TopBanner.js
import React from 'react';
import AIPlayerDisplay from './AIPlayerDisplay';

const TopBanner = ({ aiPlayers, handEvaluator }) => {
  if (!aiPlayers || aiPlayers.length === 0) {
    return null; // 如果没有AI玩家数据，不渲染
  }

  return (
    <div className="top-banner-container">
      {aiPlayers.map(aiPlayer => (
        <AIPlayerDisplay key={aiPlayer.id} player={aiPlayer} handEvaluator={handEvaluator} />
      ))}
    </div>
  );
};

export default TopBanner;
