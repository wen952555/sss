import React, { useState, useEffect } from 'react';
import './ResultsPage.css';

const ResultsPage = () => {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch('/api/game.php?action=get_results');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                if (data.success) {
                    setResults(data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch results');
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, []);

    if (isLoading) {
        return <div className="results-container">Loading...</div>;
    }

    if (error) {
        return <div className="results-container">Error: {error}</div>;
    }

    return (
        <div className="results-container">
            <h1>开奖结果</h1>
            {results.length > 0 ? (
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>期数</th>
                            <th>开奖号码</th>
                            <th>时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result) => (
                            <tr key={result.id}>
                                <td>{result.id}</td>
                                <td>{result.winning_numbers}</td>
                                <td>{new Date(result.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>暂无开奖记录。</p>
            )}
        </div>
    );
};

export default ResultsPage;
