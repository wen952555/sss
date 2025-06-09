// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth(); // 从 AuthContext 获取 login 方法

    const from = location.state?.from?.pathname || "/"; // 登录后跳转的来源页或首页

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await login(phoneNumber, password); // 调用 context 中的 login
            if (response.success && response.user) {
                // 登录成功，AuthContext 会更新 user 状态
                // AuthProvider 的 useEffect 会自动获取用户数据
                navigate(from, { replace: true }); // 跳转到之前的页面或首页
            } else {
                 // 错误已由 authApi 或 AuthContext 抛出并捕获
                // setError(response.message || '登录失败，请重试');
            }
        } catch (err) {
            setError(err.message || '登录时发生未知错误');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h2>用户登录</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="phone">手机号:</label>
                    <input
                        type="tel"
                        id="phone"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password">密码:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                    {isLoading ? '登录中...' : '登录'}
                </button>
            </form>
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
                还没有账户? <Link to="/register">点此注册</Link>
            </p>
        </div>
    );
}

export default LoginPage;
