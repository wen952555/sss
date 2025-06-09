// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // 用于检查初始会话

    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authApi.getUser(); // GET /api/get_user.php
            if (response.success && response.user) {
                setUser(response.user);
            } else {
                setUser(null); // 如果API调用不成功或没有用户数据，则清空用户
            }
        } catch (error) {
            console.warn("No active session or error fetching user:", error.message);
            setUser(null); // 发生错误时也清空用户
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser(); // 组件挂载时检查会话
    }, [fetchUser]);


    const login = async (phoneNumber, password) => {
        try {
            const response = await authApi.login(phoneNumber, password);
            if (response.success && response.user) {
                setUser(response.user); // 更新用户状态
                return response; // 返回整个响应，方便组件处理其他信息
            }
            // 如果登录不成功，authApi.login会抛出错误，这里不用额外处理
        } catch (error) {
            console.error("Login error in context:", error.message);
            setUser(null); // 确保登录失败时用户状态为空
            throw error; // 重新抛出，让组件处理UI提示
        }
    };

    const register = async (phoneNumber, password) => {
        try {
            const response = await authApi.register(phoneNumber, password);
            // 注册成功后，可以选择自动登录 (调用 fetchUser 或 login)
            // 或者提示用户去登录页面
            // 这里我们假设注册后需要用户手动登录，所以不直接设置 user
            if (response.success) {
                 // 可以选择在这里调用 fetchUser() 来尝试获取用户信息，如果后端注册后自动登录的话
                 // await fetchUser();
            }
            return response;
        } catch (error) {
            console.error("Register error in context:", error.message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            console.warn("Logout API call failed:", error.message);
            // 即使API调用失败，前端也应该清除用户状态
        } finally {
            setUser(null); // 清除用户状态
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
