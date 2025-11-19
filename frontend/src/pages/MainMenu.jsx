import React from 'react';

const MainMenu = ({ user, onNavigate, onLogout }) => {
    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <h2>主菜单</h2>
            <p>欢迎回来, {user.user_id}!</p>

            <div style={{ margin: '2rem 0' }}>
                <h4>您的余额</h4>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {user.balance} 积分
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <button
                    className="btn btn-primary"
                    onClick={() => onNavigate('game-room')}
                >
                    开始新游戏
                </button>
                <button
                    className="btn btn-secondary"
                    // onClick={() => onNavigate('balance-transfer')} // Future feature
                >
                    积分转账 (开发中)
                </button>
                 <button
                    className="btn btn-secondary"
                    onClick={onLogout}
                 >
                    退出登录
                </button>
            </div>
        </div>
    );
};

export default MainMenu;
