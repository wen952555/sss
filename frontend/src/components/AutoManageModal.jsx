import React from 'react';
import './AutoManageModal.css';

const AutoManageModal = ({ onSelect, onCancel }) => {
  const roundOptions = [5, 10, 20, 30];

  return (
    <div className="auto-manage-modal-backdrop">
      <div className="auto-manage-modal-content">
        <h3 className="auto-manage-modal-title">选择智能托管局数</h3>
        <div className="auto-manage-options">
          {roundOptions.map(rounds => (
            <button
              key={rounds}
              className="auto-manage-option-btn"
              onClick={() => onSelect(rounds)}
            >
              {rounds} 局
            </button>
          ))}
        </div>
        <div className="auto-manage-modal-footer">
          <button
            className="auto-manage-cancel-btn"
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoManageModal;
