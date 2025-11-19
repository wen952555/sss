import React from 'react';
import './GameResult.css';

const GameResult = ({ onNavigate }) => {
    // This component will later receive the game result data as props.
    return (
        <div className="container game-result">
            <h2>游戏结束</h2>
            <p>这里将显示详细的比牌结果和得分。</p>
            {/* Placeholder for results display */}

            <button
                className="btn btn-primary"
                style={{ marginTop: '2rem' }}
                onClick={() => onNavigate('main-menu')}
            >
                返回主菜单
            </button>
        </div>
    );
};

export default GameResult;
