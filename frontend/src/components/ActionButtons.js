// frontend_react/src/components/ActionButtons.js
import React from 'react';
import './ActionButtons.css';

const ActionButtons = ({ 
  onAIHelper, 
  onSubmit, 
  canSubmit,
  onManageProfile,
  onToggleAIPlay
}) => {
  return (
    <div className="action-buttons-banner-v2">
      <button onClick={onManageProfile} className="action-button-v2 profile-button-v2">个人管理</button>
      <button onClick={onToggleAIPlay} className="action-button-v2 ai-play-button-v2">AI托管</button>
      <button onClick={onAIHelper} className="action-button-v2 ai-helper-button-v2">AI智能分牌</button>
      <button onClick={onSubmit} disabled={!canSubmit} className="action-button-v2 submit-button-v2">提交牌型</button>
    </div>
  );
};
export default ActionButtons;
