import React, { useState } from 'react';
import './Gifting.css';

const Gifting = ({ token }) => {
    const [searchPhone, setSearchPhone] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        setFoundUser(null);

        try {
            const response = await fetch('/api/user/find', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ phone: searchPhone }),
            });

            const data = await response.json();
            if (response.ok) {
                setFoundUser(data.user);
            } else {
                setError(data.message || '搜索失败');
            }
        } catch (err) {
            setError('网络错误，请稍后再试。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/points/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ recipientId: foundUser.id, amount }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(data.message);
                setFoundUser(null); // Reset form after successful send
                setSearchPhone('');
                setAmount('');
            } else {
                setError(data.message || '赠送失败');
            }
        } catch (err) {
            setError('网络错误，请稍后再试。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="gifting-container">
            <h3>赠送积分</h3>
            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="tel"
                    placeholder="输入手机号查找用户"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    required
                />
                <button type="submit" disabled={isLoading}>{isLoading ? '...' : '查找'}</button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            {foundUser && (
                <form onSubmit={handleSend} className="send-form">
                    <p>找到用户，ID: <strong>{foundUser.display_id}</strong></p>
                    <input
                        type="number"
                        placeholder="输入赠送积分数量"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                    />
                    <button type="submit" disabled={isLoading}>{isLoading ? '...' : '确认赠送'}</button>
                </form>
            )}
        </div>
    );
};

export default Gifting;