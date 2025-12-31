import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, userAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await userAPI.getProfile();
          if (response.success) {
            setUser(response.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
            setIsAuthenticated(false);
          }
        } catch (error) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (phone, password) => {
    try {
      const response = await authAPI.login(phone, password);
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        const profileResponse = await userAPI.getProfile();
        if (profileResponse.success) {
          setUser(profileResponse.user);
          setIsAuthenticated(true);
          toast.success('登录成功');
        } else {
          toast.error('获取用户信息失败');
        }
        return { success: true };
      } else {
        toast.error(response.error || '登录失败');
        return { success: false };
      }
    } catch (error) {
      toast.error('登录失败');
      return { success: false };
    }
  };

  const register = async (phone, password) => {
    try {
      const response = await authAPI.register(phone, password);
      if (response.success) {
        toast.success('注册成功！');
        return { success: true, user_id: response.user_id };
      } else {
        toast.error(response.error || '注册失败');
        return { success: false };
      }
    } catch (error) {
      toast.error('注册失败');
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('已退出登录');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
