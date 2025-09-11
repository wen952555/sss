import React from 'react';
import './GameResultModal.css';

const GameResultModal8P = ({ result, onClose, onPlayAgain, gameType, isTrial = false }) => {
    return (
        <div className="result-modal-backdrop">
            <div className="result-modal-container">
                <div className="result-modal-header">
                    <h2>8人场结果</h2>
                    <p>此功能正在开发中...</p>
                </div>
                <div className="result-modal-footer">
                    <button onClick={onClose} className="result-btn exit-btn">退出游戏</button>
                    <button
                        onClick={() => {
                            onClose();
                            if (onPlayAgain) onPlayAgain();
                        }}
                        className="result-btn continue-btn"
                    >
                        继续游戏
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameResultModal8P;
