import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mic2, MessagesSquare, History, Users, Settings, LogOut, User as UserIcon, Briefcase, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testid: 'nav-dashboard' },
    { to: '/practice', label: 'Practice Arena', icon: Mic2, testid: 'nav-practice' },
    { to: '/debate', label: 'AI Debates', icon: MessagesSquare, testid: 'nav-debate' },
    { to: '/interview', label: 'Interview Prep', icon: Briefcase, testid: 'nav-interview' },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, testid: 'nav-leaderboard' },
    { to: '/history', label: 'Analysis History', icon: History, testid: 'nav-history' },
    { to: '/community', label: 'Community', icon: Users, testid: 'nav-community' },
    { to: '/profile', label: 'Profile', icon: UserIcon, testid: 'nav-profile' },
    { to: '/settings', label: 'Settings', icon: Settings, testid: 'nav-settings' },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <aside
            data-testid="app-sidebar"
            className="w-64 shrink-0 hidden lg:flex flex-col bg-brand-navy-elev border-r border-white/5 px-4 py-6 sticky top-0 h-screen"
        >
            <NavLink to="/dashboard" className="flex items-center gap-2.5 px-2 mb-10" data-testid="sidebar-logo">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center shadow-glow-blue">
                    <Mic2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-display font-extrabold text-xl text-white tracking-tight">
                    Dialectica
                </span>
            </NavLink>

            <nav className="flex flex-col gap-1 flex-1">
                {navItems.map(({ to, label, icon: Icon, testid }) => (
                    <NavLink
                        key={to}
                        to={to}
                        data-testid={testid}
                        className={({ isActive }) =>
                            `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                            ${isActive
                                ? 'bg-brand-blue text-white shadow-glow-blue'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}`
                        }
                    >
                        <Icon className="w-[18px] h-[18px]" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-white/5">
                {user && (
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center text-white font-bold text-sm">
                            {user.picture ? (
                                <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.name?.charAt(0)?.toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate" data-testid="sidebar-user-name">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    data-testid="sidebar-logout-btn"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                    <LogOut className="w-[18px] h-[18px]" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
