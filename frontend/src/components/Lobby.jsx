import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';

const Lobby = () => {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTablesStatus = async () => {
    try {
      const response = await apiService.getTablesStatus();
      if (response.success) {
        setTables(response.tables);
        setError('');
      } else {
        setError(response.message || '获取大厅信息失败');
      }
    } catch (err) {
      setError('网络错误，无法连接到服务器。');
      console.error('Fetch tables error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 立即获取一次
    fetchTablesStatus();
    
    // 设置定时器轮询大厅状态，但只在组件挂载后开始
    const intervalId = setInterval(fetchTablesStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleJoinTable = async (tableId) => {
    try {
      // 这里实现加入桌子的API调用
      // const response = await apiService.joinTable(tableId);
      // if(response.success) {
      //   // 跳转到游戏界面
      // } else {
      //   alert(response.message);
      // }
      
      alert(`正在加入桌子 ${tableId} (功能开发中)`);
    } catch (error) {
      alert('加入失败，请重试');
      console.error('Join table error:', error);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '2rem' }}>正在加载大厅...</div>;
  }

  if (error) {
    return (
      <div className="lobby">
        <div className="error-message">{error}</div>
        <button onClick={fetchTablesStatus}>重试</button>
      </div>
    );
  }

  const renderTablesByScore = (scoreType) => {
    const filteredTables = tables.filter(table => table.score_type === scoreType);
    
    if (filteredTables.length === 0) {
      return <div>暂无桌子</div>;
    }

    return filteredTables.map(table => (
      <div key={table.table_id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h4>{table.table_number} 号桌</h4>
        <p>状态: {table.status === 'in_game' ? '游戏中' : '等待中'}</p>
        <p>玩家: {table.players_current}/{table.players_needed}</p>
        <button
          className="table-button"
          disabled={table.status === 'in_game'}
          onClick={() => handleJoinTable(table.table_id)}
        >
          {table.status === 'in_game' ? '游戏中' : '加入游戏'}
        </button>
      </div>
    ));
  };

  return (
    <div className="lobby">
      <h2>游戏大厅</h2>
      <p>欢迎来到十三水游戏！选择桌子加入游戏。</p>
      
      <div className="lobby-tables">
        <div className="table-group">
          <h3>2分场</h3>
          {renderTablesByScore(2)}
        </div>
        <div className="table-group">
          <h3>5分场</h3>
          {renderTablesByScore(5)}
        </div>
        <div className="table-group">
          <h3>10分场</h3>
          {renderTablesByScore(10)}
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={fetchTablesStatus}>刷新大厅</button>
      </div>
    </div>
  );
};

export default Lobby;