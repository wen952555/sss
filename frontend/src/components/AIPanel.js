// frontend_react/src/components/AIPanel.js
import React from 'react';

const AIPanel = ({ onAiArrangeRequest, disabled }) => {
  return (
    <div className="ai-panel" style={{ marginTop: '20px', padding: '10px', border: '1px solid #007bff', borderRadius: '5px' }}>
      <h4>AI 辅助</h4>
      <button onClick={onAiArrangeRequest} disabled={disabled}>
        AI 帮我分牌
      </button>
      <p style={{fontSize: '0.8em', color: '#666'}}>AI会尝试给出一种合法的分牌建议。</p>
    </div>
  );
};

export default AIPanel;
