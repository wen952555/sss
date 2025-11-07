
import React, { useState, useEffect } from 'react';
import styles from './Lobby.module.css';

const Lobby = ({ onEnterGame }) => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/tables/status');
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const data = await response.json();
                setTables(data.tables);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, 5000);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) return <div className={styles.loading}>加载中...</div>;
    if (error) return <div className={styles.error}>错误: {error}</div>;

    const renderTable = (table) => {
        const isFull = table.status === 'in_game' || table.players_current >= table.players_needed;
        const buttonText = isFull
            ? `游戏中 (${table.players_current}/${table.players_needed})` 
            : `加入 (${table.players_current}/${table.players_needed})`;

        return (
            <div
                key={table.table_id}
                className={styles.tableCard}
                onClick={() => !isFull && onEnterGame(table.table_id)}
            >
                <h3 className={styles.tableName}>{`${table.score_type}分场 - ${table.table_number}号桌`}</h3>
                <button 
                    disabled={isFull}
                >
                    {buttonText}
                </button>
            </div>
        );
    }
    
    const scoreGroups = tables.reduce((acc, table) => {
        const { score_type } = table;
        if (!acc[score_type]) {
            acc[score_type] = [];
        }
        acc[score_type].push(table);
        return acc;
    }, {});

    return (
        <div className={styles.lobbyContainer}>
            <h1 className={styles.title}>游戏大厅</h1>
            {Object.entries(scoreGroups).map(([score, tables]) => (
                 <div key={score} className={styles.scoreGroup}>
                    <h2 className={styles.scoreTitle}>{`${score}分场`}</h2>
                    <div className={styles.tablesWrapper}>
                        {tables.map(renderTable)}
                    </div>
                 </div>
            ))}
        </div>
    );
};

export default Lobby;
