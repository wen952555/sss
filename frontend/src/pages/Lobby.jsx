import React, { useState, useEffect } from 'react';
// import { getTablesStatus } from '../api'; // 假设API已封装

const Lobby = ({ onEnterGame }) => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // 前端请求的是代理路径，而不是后端真实域名
                const response = await fetch('/api/tables/status');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
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
        // 可以设置一个定时器来轮询桌子状态
        const intervalId = setInterval(fetchStatus, 5000); // 每5秒刷新一次

        return () => clearInterval(intervalId); // 组件卸载时清除定时器
    }, []);

    if (loading) return <div>加载中...</div>;
    if (error) return <div>错误: {error}</div>;

    const renderTable = (table) => {
        const isFull = table.status === 'in_game' || table.players_current >= table.players_needed;
        const text = isFull 
            ? `游戏中 (${table.players_current}/${table.players_needed})` 
            : `加入 (${table.players_current}/${table.players_needed})`;

        return (
            <div key={table.table_id} className="table-card">
                <h3>{table.score_type}分场 - {table.table_number}号桌</h3>
                <button 
                    onClick={() => !isFull && onEnterGame(table.table_id)} 
                    disabled={isFull}
                >
                    {text}
                </button>
            </div>
        );
    }
    
    // 分组渲染桌子
    const scoreGroups = tables.reduce((acc, table) => {
        acc[table.score_type] = acc[table.score_type] || [];
        acc[table.score_type].push(table);
        return acc;
    }, {});


    return (
        <div className="lobby-container">
            <h1>游戏大厅</h1>
            {Object.entries(scoreGroups).map(([score, tables]) => (
                 <div key={score} className="score-group">
                    <h2>{score}分场</h2>
                    <div className="tables-wrapper">
                        {tables.map(renderTable)}
                    </div>
                 </div>
            ))}
        </div>
    );
};

export default Lobby;