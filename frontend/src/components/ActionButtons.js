// frontend_react/src/components/ActionButtons.js
import React from 'react';
import './ActionButtons.css';

const ActionButtons = ({ onAIHelper, onSubmit, canSubmit }) => {
  return (
    <div className="action-buttons-container">
      <button onClick={onAIHelper} className="action-button ai-helper-button">
        AI智能分牌
      </button>
      <button onClick={onSubmit} disabled={!canSubmit} className="action-button submit-button">
        提交牌型
      </button>
    </div>
  );
};

export default ActionButtons;
