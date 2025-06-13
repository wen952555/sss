// frontend/src/components/TopBanner.js
import React from 'react';
import AIPlayerDisplay from './AIPlayerDisplay';

const TopBanner = ({ aiPlayers, handEvaluator }) => {
  // handEvaluator 期望是一个包含 HAND_TYPE_NAMES 的对象
  // 例如: handEvaluator={{ HAND_TYPE_NAMES: HAND_TYPE_NAMES_FROM_LOGIC }}

  // 如果没有AI玩家数据，或者数组为空，可以选择不渲染或渲染占位符
  if (!aiPlayers || !Array.isArray(aiPlayers) || aiPlayers.length === 0) {
    // 可以渲染一个空的横幅或提示，或者直接返回 null
    return (
        <div className="top-banner-container empty">
            {/* <p>等待AI玩家加入...</p> */}
        </div>
    );
  }

  return (
    <div className="top-banner-container">
      {aiPlayers.map(aiPlayer => (
        <AIPlayerDisplay 
          key={aiPlayer.id} 
          player={aiPlayer} 
          handEvaluator={handEvaluator} 
        />
      ))}
    </div>
  );
};

export default TopBanner;
