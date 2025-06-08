// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      console.log('AuthContext: Attempting to fetch profile on load...');
      try {
        const response = await authService.getProfile();
        console.log('AuthContext: getProfile response on load:', response);
        if (response.status === 'success' && response.user) {
          setUser(response.user);
          console.log('AuthContext: User set from profile:', response.user);
        } else {
          // 如果 status 不是 success，或者没有 user 数据
          console.log('AuthContext: getProfile did not return a valid user session.', response);
          setUser(null); // 确保用户状态被清除
        }
      } catch (error) {
        console.error('AuthContext: Error fetching profile on load:', error.message, error);
        setUser(null); // 发生错误时清除用户状态
      } finally {
        setLoading(false);
        console.log('AuthContext: Profile check finished. Loading set to false.');
      }
    };
    checkLoggedIn();
  }, []);

  const login = async (phone, password) => {
    setLoading(true);
    try {
      const response = await authService.login(phone, password);
      console.log('AuthContext: Login service response:', response);
      if (response.status === 'success' && response.user) {
        setUser(response.user);
        console.log('AuthContext: User set after login:', response.user);
        setLoading(false);
        return response;
      } else {
        // 即使API调用本身是200，但如果业务逻辑上登录失败（例如后端返回 status: 'error'）
        console.warn('AuthContext: Login API call succeeded but login was not successful:', response);
        setUser(null); // 确保用户未设置
        setLoading(false);
        throw new Error(response.message || '登录失败，但服务器返回了非预期的成功状态。');
      }
    } catch (error) {
      console.error('AuthContext: Login service error:', error.message, error);
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  const register = async (phone, password) => {
    // Register 逻辑保持不变
    try {
        const response = await authService.register(phone, password);
        return response;
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    console.log('AuthContext: Attempting logout...');
    try {
      await authService.logout();
      setUser(null);
      console.log('AuthContext: Logout successful, user set to null.');
    } catch (error) {
      console.error('AuthContext: Logout failed:', error.message, error);
      setUser(null); // 即使登出API失败，前端也清理用户状态
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
