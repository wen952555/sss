import React, { useState } from 'react';
import { findUserByPhone, sendPoints } from '../utils/api'; // Assuming api.js is in a utils folder
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
            const data = await findUserByPhone(searchPhone, token);
            setFoundUser(data.user);
        } catch (err) {
            setError(err.message || '搜索失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!foundUser) return;
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const data = await sendPoints(foundUser.id, amount, token);
            setMessage(data.message);
            setFoundUser(null); // Reset form after successful send
            setSearchPhone('');
            setAmount('');
        } catch (err) {
            setError(err.message || '赠送失败');
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
                    <p>找到用户: <strong>{foundUser.display_id}</strong></p>
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
