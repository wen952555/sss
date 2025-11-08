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
      } else {
        setError(response.message || '获取大厅信息失败');
      }
    } catch (err) {
      setError('网络错误，无法连接到服务器。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesStatus();
    // 设置定时器轮询大厅状态
    const intervalId = setInterval(fetchTablesStatus, 5000); // 每5秒刷新一次
    return () => clearInterval(intervalId); // 组件卸载时清除定时器
  }, []);
  
  const handleJoinTable = async (tableId) => {
    alert(`正在加入桌子 ${tableId} (功能开发中)`);
    // 在这里实现加入桌子的API调用
    // try {
    //   const response = await apiService.joinTable(tableId);
    //   if(response.success) {
    //     // 跳转到游戏界面
    //   } else {
    //     alert(response.message);
    //   }
    // } catch(error) {
    //   alert('加入失败，请重试');
    // }
  };

  if (isLoading) {
    return <div>正在加载大厅...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  const renderTablesByScore = (scoreType) => {
    return tables
      .filter(table => table.score_type === scoreType)
      .map(table => (
        <div key={table.table_id}>
          <h4>{table.table_number} 号桌</h4>
          <button 
            className="table-button"
            disabled={table.status === 'in_game'}
            onClick={() => handleJoinTable(table.table_id)}
          >
            {table.status === 'in_game' 
             ? `游戏中 (${table.players_current}/${table.players_needed})`
             : `加入 (${table.players_current}/${table.players_needed})`
            }
          </button>
        </div>
      ));
  };

  return (
    <div className="lobby">
      <h2>游戏大厅</h2>
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
       <button onClick={fetchTablesStatus}>手动刷新</button>
    </div>
  );
};

export default Lobby;