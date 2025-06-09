// frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 假设你使用 react-router-dom
import { useAuth } from '../contexts/AuthContext'; // 用于调用注册函数

function RegisterPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { register } = useAuth(); // 从 AuthContext 获取 register 方法

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }
        if (password.length < 6) {
            setError('密码至少需要6位');
            return;
        }
        if (!/^[0-9]{5,15}$/.test(phoneNumber)) {
            setError('无效的手机号格式');
            return;
        }

        setIsLoading(true);
        try {
            const response = await register(phoneNumber, password); // 调用 context 中的 register
            if (response.success) {
                setSuccessMessage(response.message + ' 请前往登录。');
                // 可选：几秒后自动跳转到登录页
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                // 错误已由 authApi 或 AuthContext 抛出并捕获
                // setError(response.message || '注册失败，请重试');
            }
        } catch (err) {
            setError(err.message || '注册时发生未知错误');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h2>用户注册</h2>
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
                        minLength="6"
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="confirmPassword">确认密码:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                    {isLoading ? '注册中...' : '注册'}
                </button>
            </form>
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
                已有账户? <Link to="/login">点此登录</Link>
            </p>
        </div>
    );
}

export default RegisterPage;
