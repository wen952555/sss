// frontend_react/src/components/ActionButtons.js
import React from 'react';
import './ActionButtons.css'; // Ensure this CSS is updated

const ActionButtons = ({ 
  onAIHelper, 
  onSubmit, 
  canSubmit,
  onManageProfile, // New: Placeholder for personal management
  onToggleAIPlay,  // New: Placeholder for AI托管
  onAutoMatch      // New: Placeholder for自动匹配
}) => {
  // For buttons whose functionality is not yet implemented,
  // we can still render them and perhaps disable them or show a "coming soon" tooltip on hover.
  // For now, they will just call an empty function or log to console.

  return (
    <div className="action-buttons-banner-v2"> {/* Versioned class */}
      <button 
        onClick={onManageProfile || (() => console.log("个人管理 clicked"))} 
        className="action-button-v2 profile-button-v2" // Specific class for styling if needed
      >
        个人管理
      </button>
      <button 
        onClick={onToggleAIPlay || (() => console.log("AI托管 clicked"))} 
        className="action-button-v2 ai-play-button-v2"
      >
        AI托管
      </button>
      
      <button 
        onClick={onAIHelper} 
        className="action-button-v2 ai-helper-button-v2"
      >
        AI智能分牌
      </button>
      <button 
        onClick={onSubmit} 
        disabled={!canSubmit} 
        className="action-button-v2 submit-button-v2"
      >
        提交牌型
      </button>

      <button 
        onClick={onAutoMatch || (() => console.log("自动匹配 clicked"))} 
        className="action-button-v2 auto-match-button-v2"
      >
        自动匹配
      </button>
    </div>
  );
};

export default ActionButtons;
