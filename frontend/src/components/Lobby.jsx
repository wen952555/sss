import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';

const Lobby = ({ onJoinTable }) => {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningTable, setJoiningTable] = useState(null);

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
    if (joiningTable) return; // 防止重复点击
    
    setJoiningTable(tableId);
    
    try {
      // 显示加入中提示
      const table = tables.find(t => t.table_id === tableId);
      const tableInfo = table ? `${table.score_type}分场 ${table.table_number}号桌` : `桌子 ${tableId}`;
      
      // 模拟加入过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 检查桌子状态
      if (table && table.status === 'in_game') {
        alert(`桌子 ${tableInfo} 正在游戏中，无法加入`);
        setJoiningTable(null);
        return;
      }
      
      if (table && table.players_current >= table.players_needed) {
        alert(`桌子 ${tableInfo} 已满员，请选择其他桌子`);
        setJoiningTable(null);
        return;
      }
      
      // 调用加入API（待实现）
      // const response = await apiService.joinTable(tableId);
      // if (response.success) {
      //   onJoinTable(tableId);
      // } else {
      //   alert(response.message || '加入失败');
      // }
      
      // 临时：直接跳转到游戏界面
      console.log(`加入桌子 ${tableId} - 功能开发中，模拟成功`);
      onJoinTable(tableId);
      
    } catch (error) {
      console.error('Join table error:', error);
      alert('加入失败，请重试');
    } finally {
      setJoiningTable(null);
    }
  };

  const getTableStatusText = (table) => {
    if (table.status === 'in_game') {
      return `游戏中 (${table.players_current}/${table.players_needed})`;
    } else if (table.players_current === 0) {
      return `空闲 (${table.players_current}/${table.players_needed})`;
    } else {
      return `等待中 (${table.players_current}/${table.players_needed})`;
    }
  };

  const getButtonText = (table, tableId) => {
    if (joiningTable === tableId) {
      return '加入中...';
    }
    
    if (table.status === 'in_game') {
      return '游戏中';
    }
    
    return '加入游戏';
  };

  const isTableJoinable = (table) => {
    return table.status !== 'in_game' && table.players_current < table.players_needed;
  };

  if (isLoading) {
    return (
      <div className="lobby">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>正在加载游戏大厅...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lobby">
        <h2>游戏大厅</h2>
        <div className="error-message">{error}</div>
        <button onClick={fetchTablesStatus}>重试加载</button>
      </div>
    );
  }

  const renderTablesByScore = (scoreType) => {
    const filteredTables = tables.filter(table => table.score_type === scoreType);
    
    if (filteredTables.length === 0) {
      return (
        <div className="empty-state">
          暂无{scoreType}分场的桌子
        </div>
      );
    }

    return filteredTables.map(table => (
      <div 
        key={table.table_id} 
        className="table-item"
        style={{ 
          marginBottom: '15px', 
          padding: '15px', 
          border: '2px solid #34495e', 
          borderRadius: '10px',
          background: table.status === 'in_game' ? '#2c3e50' : '#34495e',
          opacity: isTableJoinable(table) ? 1 : 0.7
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h4 style={{ margin: 0, color: 'white' }}>
            {table.table_number} 号桌
          </h4>
          <span style={{ 
            fontSize: '0.9rem', 
            color: table.status === 'in_game' ? '#e74c3c' : '#2ecc71'
          }}>
            {getTableStatusText(table)}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#bdc3c7' }}>
            底分: {table.score_type}分
            <br />
            人数: {table.players_current}/{table.players_needed}
          </div>
          
          <button
            className="table-button"
            disabled={!isTableJoinable(table) || joiningTable === table.table_id}
            onClick={() => handleJoinTable(table.table_id)}
            style={{ 
              background: isTableJoinable(table) ? '#27ae60' : '#7f8c8d',
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              color: 'white',
              cursor: isTableJoinable(table) ? 'pointer' : 'not-allowed',
              minWidth: '100px'
            }}
          >
            {getButtonText(table, table.table_id)}
          </button>
        </div>
        
        {/* 加入提示 */}
        {joiningTable === table.table_id && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(52, 152, 219, 0.2)',
            borderRadius: '5px',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#3498db'
          }}>
            🎮 正在加入游戏，请稍候...
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="lobby">
      <h2>游戏大厅</h2>
      <p style={{ color: '#bdc3c7', textAlign: 'center', marginBottom: '20px' }}>
        欢迎来到十三水游戏！选择桌子加入游戏。
        <br />
        <small>当前功能开发中，加入游戏将进入演示模式</small>
      </p>
      
      <div className="lobby-tables">
        <div className="table-group">
          <h3>🎯 2分场</h3>
          <p style={{ fontSize: '0.9rem', color: '#95a5a6', margin: '5px 0 15px 0' }}>
            新手场，适合练习
          </p>
          {renderTablesByScore(2)}
        </div>
        
        <div className="table-group">
          <h3>⚡ 5分场</h3>
          <p style={{ fontSize: '0.9rem', color: '#95a5a6', margin: '5px 0 15px 0' }}>
            进阶场，中等难度
          </p>
          {renderTablesByScore(5)}
        </div>
        
        <div className="table-group">
          <h3>🔥 10分场</h3>
          <p style={{ fontSize: '0.9rem', color: '#95a5a6', margin: '5px 0 15px 0' }}>
            高手场，挑战极限
          </p>
          {renderTablesByScore(10)}
        </div>
      </div>
      
      <div style={{ 
        marginTop: '25px', 
        textAlign: 'center',
        padding: '15px',
        background: '#2c3e50',
        borderRadius: '10px'
      }}>
        <button 
          onClick={fetchTablesStatus}
          style={{
            background: '#3498db',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 刷新大厅
        </button>
        
        <div style={{ 
          marginTop: '15px', 
          fontSize: '0.8rem', 
          color: '#7f8c8d' 
        }}>
          最后更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 功能开发提示 */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
        borderRadius: '10px',
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold'
      }}>
        🚧 游戏功能开发中
        <div style={{ fontSize: '0.9rem', marginTop: '5px', fontWeight: 'normal' }}>
          当前为演示版本，加入游戏将体验基础功能
        </div>
      </div>
    </div>
  );
};

export default Lobby;