import React, { useState, useEffect } from 'react';
import apiService from '../api/apiService';

const Lobby = ({ onJoinTable }) => {
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
    fetchTablesStatus();
    const intervalId = setInterval(fetchTablesStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleJoinTable = async (tableId) => {
    // 直接进入游戏，不显示任何提示
    onJoinTable(tableId);
  };

  // 按分数类型分组桌子
  const getTablesByScore = (scoreType) => {
    return tables.filter(table => table.score_type === scoreType);
  };

  const getTableStatus = (table) => {
    if (table.status === 'in_game') {
      return { text: '游戏中', color: '#e74c3c', joinable: false };
    } else if (table.players_current >= table.players_needed) {
      return { text: '已满员', color: '#95a5a6', joinable: false };
    } else {
      return { text: '可加入', color: '#27ae60', joinable: true };
    }
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

  return (
    <div className="lobby" style={{ padding: '10px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#2c3e50' }}>
        十三水游戏大厅
      </h2>

      {/* 2分场 - 顶部横幅 */}
      <div 
        className="score-section top-section"
        style={{
          background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '15px',
          color: 'white',
          boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>🎯 2分场</h3>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>新手场，轻松上手</p>
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '8px 15px', 
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            {getTablesByScore(2).length} 个桌子
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {getTablesByScore(2).map(table => {
            const status = getTableStatus(table);
            return (
              <div
                key={table.table_id}
                style={{
                  flex: '1',
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {table.table_number}号桌
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: status.color,
                  marginBottom: '10px'
                }}>
                  {status.text}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px' }}>
                  {table.players_current}/{table.players_needed}人
                </div>
                <button
                  onClick={() => handleJoinTable(table.table_id)}
                  disabled={!status.joinable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: status.joinable ? 'white' : 'rgba(255,255,255,0.3)',
                    color: status.joinable ? '#27ae60' : 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: status.joinable ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold'
                  }}
                >
                  {status.joinable ? '加入游戏' : status.text}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5分场 - 中部横幅 */}
      <div 
        className="score-section middle-section"
        style={{
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '15px',
          color: 'white',
          boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>⚡ 5分场</h3>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>进阶场，策略对决</p>
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '8px 15px', 
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            {getTablesByScore(5).length} 个桌子
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {getTablesByScore(5).map(table => {
            const status = getTableStatus(table);
            return (
              <div
                key={table.table_id}
                style={{
                  flex: '1',
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {table.table_number}号桌
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: status.color,
                  marginBottom: '10px'
                }}>
                  {status.text}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px' }}>
                  {table.players_current}/{table.players_needed}人
                </div>
                <button
                  onClick={() => handleJoinTable(table.table_id)}
                  disabled={!status.joinable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: status.joinable ? 'white' : 'rgba(255,255,255,0.3)',
                    color: status.joinable ? '#3498db' : 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: status.joinable ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold'
                  }}
                >
                  {status.joinable ? '加入游戏' : status.text}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10分场 - 底部横幅 */}
      <div 
        className="score-section bottom-section"
        style={{
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '15px',
          color: 'white',
          boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>🔥 10分场</h3>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>高手场，巅峰对决</p>
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '8px 15px', 
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            {getTablesByScore(10).length} 个桌子
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {getTablesByScore(10).map(table => {
            const status = getTableStatus(table);
            return (
              <div
                key={table.table_id}
                style={{
                  flex: '1',
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {table.table_number}号桌
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: status.color,
                  marginBottom: '10px'
                }}>
                  {status.text}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px' }}>
                  {table.players_current}/{table.players_needed}人
                </div>
                <button
                  onClick={() => handleJoinTable(table.table_id)}
                  disabled={!status.joinable}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: status.joinable ? 'white' : 'rgba(255,255,255,0.3)',
                    color: status.joinable ? '#e74c3c' : 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: status.joinable ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold'
                  }}
                >
                  {status.joinable ? '加入游戏' : status.text}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 刷新按钮 */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={fetchTablesStatus}
          style={{
            background: '#9b59b6',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          🔄 刷新大厅
        </button>
      </div>
    </div>
  );
};

export default Lobby;
