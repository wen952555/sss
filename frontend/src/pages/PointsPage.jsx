import React, { useState, useEffect, useRef } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';

const PointsPage = () => {
    const [points, setPoints] = useState(null);
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const worker = useRef(null);

    useEffect(() => {
        worker.current = new ApiWorker();

        worker.current.onmessage = (event) => {
            const { success, action, data, error: workerError } = event.data;
            if (success) {
                if (action === 'getPoints') {
                    setPoints(data.points);
                } else if (action === 'checkAuth') {
                    if (data.isLoggedIn) {
                        setUsername(data.user.username);
                        setPoints(data.user.points);
                    } else {
                        setError('请先登录。');
                    }
                }
            } else {
                setError(workerError || '无法获取积分。');
            }
        };

        // Check auth status first to get username and points
        worker.current.postMessage({
            action: 'checkAuth',
            payload: { resource: 'user' }
        });

        return () => worker.current.terminate();
    }, []);

    return (
        <div className="points-page" style={{ padding: '20px' }}>
            <h1>积分管理</h1>
            {error && <div className="error-message">{error}</div>}
            {username ? (
                <h2>欢迎, {username}!</h2>
            ) : null}
            {points !== null ? (
                <p>你当前的积分为: {points}</p>
            ) : (
                <p>正在加载积分...</p>
            )}
        </div>
    );
};

export default PointsPage;
