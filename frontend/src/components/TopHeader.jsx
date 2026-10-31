import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mic2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

const TopHeader = ({ title = 'Public Speaking & Debate Arena', primaryAction = 'Start Speaking', onPrimaryAction }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-brand-navy-elev/70 border-b border-white/5 px-6 sm:px-10 py-4 flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-display font-extrabold text-white">Dialectica</span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-sm text-slate-300 truncate hidden sm:inline" data-testid="header-title">{title}</span>
            </div>
            <div className="flex items-center gap-3">
                <button
                    className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition"
                    data-testid="header-notifications-btn"
                    aria-label="notifications"
                >
                    <Bell className="w-4 h-4 text-slate-300" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand-lime" />
                </button>
                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    data-testid="header-profile-btn"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                        {user?.picture ? (
                            <img src={user.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                    </div>
                    <span className="text-sm text-white font-medium hidden md:inline">{user?.name?.split(' ')[0]}</span>
                </button>
                <Button
                    onClick={onPrimaryAction || (() => navigate('/debate'))}
                    data-testid="header-primary-action"
                    className="bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold shadow-glow-blue rounded-lg gap-2"
                >
                    <Mic2 className="w-4 h-4" />
                    {primaryAction}
                </Button>
            </div>
        </header>
    );
};

export default TopHeader;
