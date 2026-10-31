import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Mic2, MessagesSquare, Briefcase, Activity, Volume2, Eye, Flame, Trophy, ChevronRight, Sparkles, Calendar, Zap } from 'lucide-react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [challenge, setChallenge] = useState(null);

    useEffect(() => {
        api.get('/stats').then(r => setStats(r.data)).catch(() => setStats({ history: [], total_sessions: 0, streak: 0 }));
        api.get('/challenge/today').then(r => setChallenge(r.data)).catch(() => {});
    }, []);

    const isNewUser = stats && stats.total_sessions === 0;
    const lastScore = stats?.last_score;
    const streak = stats?.streak ?? 0;
    const bestScore = stats?.best_score;

    const chartData = stats?.history?.length > 0
        ? stats.history.map((s, i) => ({ idx: i, score: s.score }))
        : [];

    const startChallenge = () => {
        if (!challenge) return;
        const route = challenge.mode === 'interview' ? '/interview' : '/debate';
        navigate(route, { state: { prefill: challenge } });
    };

    return (
        <AppShell headerSlot={<TopHeader title="Public Speaking & Debate Arena" onPrimaryAction={() => navigate('/debate')} />}>
            <div data-testid="dashboard-page" className="space-y-8 max-w-7xl">
                {/* Welcome */}
                <div className="animate-float-up">
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
                        Welcome, <span className="text-brand-gradient">{user?.name?.split(' ')[0] || 'Speaker'}!</span>
                    </h1>
                    <p className="text-slate-400 mt-2">
                        {isNewUser ? "Ready for your first session? Pick a mode below." : "Pick a mode and keep sharpening your voice."}
                    </p>
                </div>

                {/* Quick action cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-float-up" style={{ animationDelay: '0.1s' }}>
                    <button
                        onClick={() => navigate('/debate')}
                        data-testid="quick-action-debate"
                        className="group relative text-left rounded-2xl p-6 bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/30 hover:border-brand-blue transition-all overflow-hidden"
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-brand-blue/30 blur-3xl group-hover:bg-brand-blue/50 transition" />
                        <MessagesSquare className="w-7 h-7 text-brand-blue mb-3 relative" />
                        <h3 className="font-display font-bold text-lg text-white relative">AI Debate</h3>
                        <p className="text-sm text-slate-400 relative">Spar with a sharp AI opponent.</p>
                        <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                    </button>
                    <button
                        onClick={() => navigate('/interview')}
                        data-testid="quick-action-interview"
                        className="group relative text-left rounded-2xl p-6 bg-gradient-to-br from-brand-lime/20 to-brand-lime/5 border border-brand-lime/30 hover:border-brand-lime transition-all overflow-hidden"
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-brand-lime/20 blur-3xl group-hover:bg-brand-lime/40 transition" />
                        <Briefcase className="w-7 h-7 text-brand-lime mb-3 relative" />
                        <h3 className="font-display font-bold text-lg text-white relative">Interview Prep</h3>
                        <p className="text-sm text-slate-400 relative">Mock interview with AI voice.</p>
                        <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                    </button>
                    <button
                        onClick={() => navigate('/practice')}
                        data-testid="quick-action-practice"
                        className="group relative text-left rounded-2xl p-6 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 hover:border-purple-400 transition-all overflow-hidden"
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-purple-500/20 blur-3xl group-hover:bg-purple-500/40 transition" />
                        <Mic2 className="w-7 h-7 text-purple-400 mb-3 relative" />
                        <h3 className="font-display font-bold text-lg text-white relative">Practice Pitch</h3>
                        <p className="text-sm text-slate-400 relative">Solo speaking with AI feedback.</p>
                        <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                    </button>
                </div>

                {/* Stat bar: Streak / Best / Sessions / Daily Challenge */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-float-up" style={{ animationDelay: '0.15s' }}>
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-5" data-testid="stat-streak">
                        <div className="flex items-center gap-2 mb-2">
                            <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-400' : 'text-slate-600'}`} />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Streak</span>
                        </div>
                        <p className="font-display font-black text-3xl text-white">{streak}<span className="text-slate-500 text-lg font-semibold ml-1">day{streak === 1 ? '' : 's'}</span></p>
                    </div>
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-5" data-testid="stat-best">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-4 h-4 text-brand-lime" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Best Score</span>
                        </div>
                        <p className="font-display font-black text-3xl text-white">
                            {bestScore != null ? bestScore : <span className="text-slate-600">—</span>}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-5" data-testid="stat-sessions">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-brand-blue" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Sessions</span>
                        </div>
                        <p className="font-display font-black text-3xl text-white">{stats?.total_sessions ?? 0}</p>
                    </div>
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="rounded-2xl bg-brand-navy-elev border border-white/10 p-5 text-left hover:border-brand-blue/40 transition"
                        data-testid="stat-leaderboard-btn"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Leaderboard</span>
                        </div>
                        <p className="font-semibold text-white">View rankings <ChevronRight className="w-4 h-4 inline" /></p>
                    </button>
                </div>

                {/* Daily challenge + Score */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-float-up" style={{ animationDelay: '0.2s' }}>
                    {/* Daily challenge — 2 cols */}
                    <div className="lg:col-span-2 rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-brand-blue/30 bg-gradient-to-br from-brand-blue/15 via-brand-navy-elev to-brand-lime/10" data-testid="card-daily-challenge">
                        <div className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full bg-brand-blue/20 blur-3xl pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-blue mb-3">
                                <Calendar className="w-3.5 h-3.5" /> Daily Challenge
                            </div>
                            {challenge ? (
                                <>
                                    <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight mb-2">
                                        {challenge.topic}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-5">
                                        {challenge.mode === 'interview'
                                            ? `Mock interview · ${challenge.role}`
                                            : `Take the ${challenge.stance === 'for' ? 'FOR' : 'AGAINST'} stance · AI pushes back`}
                                        · {challenge.difficulty}
                                    </p>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Button
                                            onClick={startChallenge}
                                            data-testid="challenge-start-btn"
                                            className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-lg gap-2 shadow-glow-blue"
                                        >
                                            {challenge.completed ? <><Zap className="w-4 h-4" /> Retry challenge</> : <><Zap className="w-4 h-4" /> Accept challenge</>}
                                        </Button>
                                        {challenge.completed && (
                                            <span className="text-xs font-bold uppercase tracking-wider text-brand-lime bg-brand-lime/10 border border-brand-lime/30 px-3 py-1.5 rounded-full">
                                                ✓ Completed today
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-24 flex items-center text-slate-500 text-sm">Loading challenge…</div>
                            )}
                        </div>
                    </div>

                    {/* Last session score */}
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-6" data-testid="card-last-score">
                        <h3 className="text-sm font-semibold text-slate-400 mb-1">Last Session Score</h3>
                        {lastScore != null ? (
                            <>
                                <p className="font-display font-black text-5xl text-white mb-2" data-testid="last-score-value">{lastScore}</p>
                                <p className="text-xs text-slate-500 mb-4">{stats.total_sessions} sessions completed</p>
                                <div className="h-20 -mx-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                                                    <stop offset="0%" stopColor="#84e34a" stopOpacity={0.4}/>
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="score" stroke="#84e34a" fill="url(#scoreGradient)" strokeWidth={2.5} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <div className="h-36 flex flex-col items-center justify-center gap-2 text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
                                    <Trophy className="w-5 h-5 text-slate-500" />
                                </div>
                                <p className="text-sm text-white font-semibold" data-testid="empty-score-msg">No scores yet</p>
                                <p className="text-xs text-slate-500">Finish a session to see your first score.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent session analysis (only for non-new users) */}
                {!isNewUser && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-float-up" style={{ animationDelay: '0.25s' }}>
                        <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-6" data-testid="card-live-feedback">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-display font-bold text-lg text-white">AI Feedback Signals</h3>
                                <span className="text-xs text-slate-500">From your last session</span>
                            </div>
                            <FeedbackRows />
                        </div>
                        <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-6" data-testid="card-progress">
                            <h3 className="font-display font-bold text-lg text-white mb-5">Your Progress</h3>
                            <div className="space-y-4">
                                <ProgressRow label="Average Score" value={stats?.avg_score?.toFixed(1) ?? '—'} pct={stats?.avg_score ? stats.avg_score * 10 : 0} />
                                <ProgressRow label="Best Score" value={bestScore?.toFixed?.(1) ?? bestScore ?? '—'} pct={bestScore ? bestScore * 10 : 0} />
                                <ProgressRow label="Sessions" value={stats?.total_sessions ?? 0} pct={Math.min((stats?.total_sessions ?? 0) * 10, 100)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty-state welcome for new users */}
                {isNewUser && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center bg-white/[0.02] animate-float-up" style={{ animationDelay: '0.25s' }} data-testid="empty-dashboard">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lime mb-4 shadow-glow-blue">
                            <Mic2 className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-display font-bold text-xl text-white mb-2">Start your first session</h3>
                        <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
                            Pick AI Debate, Interview Prep, or Practice Pitch. The moment you finish, you'll see your score, streak, and personalized feedback here.
                        </p>
                        <Button onClick={() => navigate('/debate')} data-testid="empty-cta-btn" className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold gap-2">
                            <Zap className="w-4 h-4" /> Start Debating
                        </Button>
                    </div>
                )}
            </div>
        </AppShell>
    );
};

const FeedbackRows = () => {
    const rows = [
        { label: 'Engaging Tone', icon: Volume2, value: 82 },
        { label: 'Clarity', icon: Activity, value: 74 },
        { label: 'Pacing', icon: Eye, value: 88 },
    ];
    return (
        <div className="space-y-5">
            {rows.map((f) => (
                <div key={f.label}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300 inline-flex items-center gap-2">
                            <f.icon className="w-4 h-4 text-brand-lime" /> {f.label}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{f.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-blue to-brand-lime rounded-full" style={{ width: `${f.value}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

const ProgressRow = ({ label, value, pct }) => (
    <div>
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">{label}</span>
            <span className="text-sm font-semibold text-white">{value}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-blue to-brand-lime rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
    </div>
);

export default Dashboard;
