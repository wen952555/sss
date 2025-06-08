// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // 用户信息对象 {id, phone, points}
  const [loading, setLoading] = useState(true); // 初始加载状态，检查session

  useEffect(() => {
    // 组件挂载时尝试获取当前登录用户信息 (检查session)
    const checkLoggedIn = async () => {
      try {
        const response = await authService.getProfile();
        if (response.status === 'success' && response.user) {
          setUser(response.user);
        }
      } catch (error) {
        // 静默失败，用户未登录
        console.log('No active session or error fetching profile:', error.message);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, []);

  const login = async (phone, password) => {
    try {
      const response = await authService.login(phone, password);
      if (response.status === 'success' && response.user) {
        setUser(response.user);
        return response; // 返回完整响应供页面处理
      }
    } catch (error) {
      throw error; // 将错误抛给调用者处理
    }
  };

  const register = async (phone, password) => {
    try {
        const response = await authService.register(phone, password);
        return response; // 返回完整响应供页面处理 (注册后可能需要自动登录或提示)
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // 即使登出失败，前端也清理用户状态
      setUser(null);
    }
  };

  const updateUserPoints = (newPoints) => {
    if (user) {
        setUser(prevUser => ({...prevUser, points: newPoints}));
    }
  };


  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, updateUserPoints }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
