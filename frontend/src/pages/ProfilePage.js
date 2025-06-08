import React, { useState, useEffect } from 'react';
import api from '../services/api';
import PointsTransfer from '../components/PointsTransfer';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await api.get('/user/profile');
        setUser(userResponse);
        
        const transactionsResponse = await api.get('/user/transactions');
        setTransactions(transactionsResponse);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
    fetchData();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h2>个人中心</h2>
      <div className="user-info">
        <p>手机号: {user.phone}</p>
        <p>积分: {user.points}</p>
      </div>
      
      <PointsTransfer currentPoints={user.points} />
      
      <div className="transaction-history">
        <h3>积分记录</h3>
        <ul>
          {transactions.map((tx) => (
            <li key={tx.id}>
              {new Date(tx.created_at).toLocaleString()} - 
              {tx.sender_id === user.id ? '转出' : '转入'} {tx.amount} 积分
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProfilePage;
