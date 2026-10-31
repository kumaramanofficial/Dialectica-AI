import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // CRITICAL: skip /me if returning from OAuth callback (AuthCallback handles it)
        if (window.location.hash?.includes('session_id=')) {
            setLoading(false);
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const loginEmail = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('dialectica_token', res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const signupEmail = async (email, password, name) => {
        const res = await api.post('/auth/signup', { email, password, name });
        localStorage.setItem('dialectica_token', res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('dialectica_token');
        setUser(null);
    };

    const updateProfile = async (data) => {
        const res = await api.put('/auth/profile', data);
        setUser(res.data);
        return res.data;
    };

    const deleteProfile = async () => {
        await api.delete('/auth/profile');
        localStorage.removeItem('dialectica_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user, setUser, loading, loginEmail, signupEmail, logout,
            updateProfile, deleteProfile, checkAuth,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
