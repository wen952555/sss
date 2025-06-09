// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // For checking initial session

    // Check session on mount (e.g., if backend uses HTTP-only session cookies)
    useEffect(() => {
        const checkUserSession = async () => {
            try {
                // This endpoint should return user data if session is valid, or error if not
                const response = await authApi.getUser(); // GET /api/get_user.php
                if (response.success && response.user) {
                    setUser(response.user);
                }
            } catch (error) {
                console.log("No active session or error fetching user:", error.message);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkUserSession();
    }, []);


    const login = async (phoneNumber, password) => {
        try {
            const response = await authApi.login(phoneNumber, password);
            if (response.success && response.user) {
                setUser(response.user);
                return response;
            }
            throw new Error(response.message || "Login failed");
        } catch (error) {
            console.error("Login error in context:", error);
            throw error;
        }
    };

    const register = async (phoneNumber, password) => {
        // Registration might auto-login or require separate login
        return authApi.register(phoneNumber, password);
    };

    const logout = async () => {
        try {
            // Call backend logout if it clears session/token
            await authApi.logout(); // Example: POST /api/logout.php
        } catch (error) {
            console.warn("Logout API call failed (might be ok if session cleared):", error.message);
        } finally {
            setUser(null); // Clear user state locally
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
