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

export default Lobby;import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import apiService from './api/apiService';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        apiService.setToken(token);
        try {
          const response = await apiService.getUser();
          if (response.success) {
            setUser(response.user);
          } else {
            console.log('Token verification failed:', response.message);
            handleLogout();
          }
        } catch (error) {
          console.error('Token verification error:', error);
          handleLogout();
        }
      }
      setIsLoading(false);
      setAuthChecked(true);
    };
    
    verifyToken();
  }, [token]);

  const handleLoginSuccess = async (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    apiService.setToken(newToken);
    setToken(newToken);
    
    // 确保 token 设置后再获取用户信息
    if (!userData) {
      try {
        const response = await apiService.getUser();
        if (response.success) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Failed to get user after login:', error);
      }
    } else {
      setUser(userData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    apiService.setToken(null);
  };

  if (isLoading) {
    return (
      <div className="App">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>十三水游戏</h1>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>十三水游戏</h1>
        {user && (
          <div className="user-info">
            <span>ID: {user.user_id_4d} | 积分: {user.points}</span>
            <button onClick={handleLogout}>退出登录</button>
          </div>
        )}
      </header>
      <main>
        {!token || !user ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : (
          <Lobby />
        )}
      </main>
    </div>
  );
}

export default App;