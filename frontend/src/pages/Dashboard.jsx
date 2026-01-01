import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile');
        if (response.data.success) {
          setUser(response.data.user);
          setReservations(response.data.reservations || []);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError('无法加载用户信息，请检查网络连接。');
        console.error('Profile fetch error:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    api.post('/logout').then(() => {
      navigate('/login');
    });
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!user) {
    return <div>正在加载...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>我的控制台</h1>
        <button onClick={handleLogout} className="logout-button">退出登录</button>
      </header>

      <section className="user-info-section">
        <h2>欢迎，{user.username}！</h2>
        <p>您的用户 ID: <strong>{user.short_id}</strong></p>
        <p>您的积分: <strong>{user.points}</strong></p>
      </section>

      <section className="action-section">
        <button onClick={() => navigate('/transfer')} className="action-button">积分转账</button>
        <button onClick={() => navigate('/reservation')} className="action-button">场次预约</button>
      </section>

      <section className="reservations-section">
        <h3>我的预约</h3>
        {reservations.length > 0 ? (
          <ul className="reservations-list">
            {reservations.map(res => (
              <li key={res.id}>
                <span>日期: {res.reservation_date}</span>
                <span>场次: {res.type === 'morning' ? '上午' : '下午'} ({res.start_time} - {res.end_time})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>您当前没有有效的预约。</p>
        )}
      </section>
    </div>
  );
}

export default Dashboard;