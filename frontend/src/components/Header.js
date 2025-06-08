import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import auth from '../services/auth';

const Header = () => {
  const navigate = useNavigate();
  const isLoggedIn = auth.isAuthenticated();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <nav>
        <Link to="/">大厅</Link>
        {isLoggedIn ? (
          <>
            <Link to="/profile">个人中心</Link>
            <button onClick={handleLogout}>退出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
