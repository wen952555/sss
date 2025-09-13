import React, { useState, useRef, useEffect } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';
import './LoginPage.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const worker = useRef(null);

    useEffect(() => {
        worker.current = new ApiWorker();
        worker.current.onmessage = (event) => {
            const { success, data, error: workerError } = event.data;
            if (success) {
                setMessage(data.message);
                setError('');
                if (data.user) {
                    // Redirect on successful login
                    window.location.href = '/';
                }
            } else {
                setError(workerError || 'An error occurred.');
                setMessage('');
            }
        };
        return () => worker.current.terminate();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const action = isRegistering ? 'register' : 'login';
        // Note: The worker needs to handle the 'user' resource type
        worker.current.postMessage({
            action,
            payload: { resource: 'user', username, password }
        });
    };

    return (
        <div className="login-page">
            <div className="login-form-container">
                <h2>{isRegistering ? '注册' : '登录'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">用户名</label>
                        <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">密码</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    {message && <div className="success-message">{message}</div>}
                    <button type="submit">{isRegistering ? '注册' : '登录'}</button>
                </form>
                <button onClick={() => setIsRegistering(!isRegistering)} className="toggle-button">
                    {isRegistering ? '已有账户？点击登录' : '没有账户？点击注册'}
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
