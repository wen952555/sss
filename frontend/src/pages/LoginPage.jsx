import React, { useState, useRef, useEffect } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [oddsMultiplier, setOddsMultiplier] = useState('45.00');
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

        const payload = { resource: 'user', email, password };
        if (isRegistering) {
            payload.odds_multiplier = oddsMultiplier;
        }

        worker.current.postMessage({ action, payload });
    };

    return (
        <div className="login-page">
            <div className="login-form-container">
                <h2>{isRegistering ? '注册' : '登录'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">邮箱</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">密码</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {isRegistering && (
                        <div className="form-group">
                            <label htmlFor="odds">赔率选择</label>
                            <select id="odds" value={oddsMultiplier} onChange={(e) => setOddsMultiplier(e.target.value)}>
                                <option value="45.00">45倍</option>
                                <option value="45">45倍 (无小数点)</option>
                            </select>
                        </div>
                    )}
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
