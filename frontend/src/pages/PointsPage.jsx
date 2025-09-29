import React, { useState, useEffect, useRef } from 'react';
import ApiWorker from '../workers/api.worker.js?worker';
import './PointsPage.css'; // Linking the new stylesheet

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
                if (action === 'checkAuth' && data.isLoggedIn) {
                    setUsername(data.user.username);
                    setPoints(data.user.points);
                } else if (!data.isLoggedIn) {
                    setError('Please log in to view your points.');
                }
            } else {
                setError(workerError || 'Could not fetch points data.');
            }
        };

        worker.current.postMessage({
            action: 'checkAuth',
            payload: { resource: 'user' }
        });

        return () => worker.current.terminate();
    }, []);

    return (
        <div className="points-page">
            <div className="points-container">
                <h1>Points Management</h1>
                {error && <div className="error-message">{error}</div>}
                {username ? (
                    <div className="points-display">
                        <h2>Welcome, {username}!</h2>
                        {points !== null ? (
                            <p>Your current points balance is:</p>
                            <span className="points-balance">{points}</span>
                        ) : (
                            <p>Loading points...</p>
                        )}
                    </div>
                ) : !error && (
                     <p>Loading user data...</p>
                )}
            </div>
        </div>
    );
};

export default PointsPage;