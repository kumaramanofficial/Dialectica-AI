import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const hash = window.location.hash;
        const match = hash.match(/session_id=([^&]+)/);
        if (!match) {
            navigate('/login');
            return;
        }
        const sessionId = match[1];

        const exchange = async () => {
            try {
                const res = await api.post('/auth/google/session', { session_id: sessionId });
                if (res.data.token) {
                    localStorage.setItem('dialectica_token', res.data.token);
                }
                setUser(res.data.user);
                window.history.replaceState({}, document.title, '/dashboard');
                navigate('/dashboard', { state: { user: res.data.user } });
            } catch (e) {
                console.error('Session exchange failed', e);
                navigate('/login');
            }
        };
        exchange();
    }, [navigate, setUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-navy text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
                <p className="text-slate-300">Signing you in…</p>
            </div>
        </div>
    );
};

export default AuthCallback;
