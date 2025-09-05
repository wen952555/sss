import React from 'react';
import './AutoPlayModal.css';

const AutoPlayModal = ({ onSelect, onCancel }) => {
  const roundOptions = [3, 5, 10, 20];

  return (
    <div className="modal-backdrop">
      <div className="modal-content auto-play-modal">
        <h3>选择智能托管局数</h3>
        <p>托管期间将自动理牌和比牌</p>
        <div className="auto-play-options">
          {roundOptions.map(rounds => (
            <button
              key={rounds}
              className="auto-play-option-btn"
              onClick={() => onSelect(rounds)}
            >
              {rounds} 局
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoPlayModal;
