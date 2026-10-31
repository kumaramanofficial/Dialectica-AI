import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Flame, Crown, Medal } from 'lucide-react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';

const rankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-orange-400" />;
    return <span className="text-slate-500 font-mono text-sm">#{rank}</span>;
};

const Leaderboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/leaderboard').then(r => setData(r.data)).catch(() => setData({ top: [], me_rank: null, me: null }));
    }, []);

    return (
        <AppShell headerSlot={<TopHeader title="Leaderboard" primaryAction="New Session" onPrimaryAction={() => navigate('/debate')} />}>
            <div className="max-w-4xl space-y-8" data-testid="leaderboard-page">
                <div>
                    <h1 className="font-display font-black text-4xl tracking-tight">Leaderboard</h1>
                    <p className="text-slate-400 mt-2">Top speakers ranked by their best session score.</p>
                </div>

                {/* Your rank */}
                {data?.me_rank && data?.me && (
                    <div className="rounded-2xl p-6 border border-brand-blue/40 bg-gradient-to-br from-brand-blue/15 to-brand-lime/5 relative overflow-hidden" data-testid="my-rank-card">
                        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-brand-blue/20 blur-3xl pointer-events-none" />
                        <div className="relative flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Your rank</p>
                                <p className="font-display font-black text-3xl text-white">#{data.me_rank}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Best Score</p>
                                <p className="font-display font-black text-2xl text-brand-gradient">{data.me.best_score ?? '—'}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-slate-400">Sessions</p>
                                <p className="font-display font-black text-2xl text-white">{data.me.sessions_completed ?? 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top list */}
                <div className="rounded-2xl bg-brand-navy-elev border border-white/10 overflow-hidden" data-testid="leaderboard-list">
                    <div className="hidden sm:grid grid-cols-[60px_1fr_100px_100px_80px] gap-4 px-5 py-3 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span>Rank</span>
                        <span>Speaker</span>
                        <span className="text-right">Best</span>
                        <span className="text-right">Sessions</span>
                        <span className="text-right">Streak</span>
                    </div>
                    {data === null ? (
                        <div className="px-5 py-10 text-center text-slate-400">Loading…</div>
                    ) : data.top.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-white font-semibold mb-1">No rankings yet</p>
                            <p className="text-sm text-slate-400 mb-5">Be the first to post a score.</p>
                            <Button onClick={() => navigate('/debate')} className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold" data-testid="leaderboard-empty-cta">
                                Start a Session
                            </Button>
                        </div>
                    ) : (
                        data.top.map((u, i) => {
                            const isMe = u.user_id === user?.user_id;
                            const rank = i + 1;
                            return (
                                <div
                                    key={u.user_id}
                                    data-testid={`leaderboard-row-${rank}`}
                                    className={`grid grid-cols-[60px_1fr_100px_100px_80px] gap-4 px-5 py-4 items-center border-b border-white/5 last:border-b-0 ${
                                        isMe ? 'bg-brand-blue/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-start w-8">{rankIcon(rank)}</div>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                            {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-semibold truncate">{u.name}{isMe && <span className="ml-2 text-xs text-brand-blue">(you)</span>}</p>
                                        </div>
                                    </div>
                                    <p className="text-right font-display font-bold text-brand-lime">{u.best_score ?? '—'}</p>
                                    <p className="text-right text-sm text-slate-300">{u.sessions_completed ?? 0}</p>
                                    <p className="text-right text-sm text-slate-300 inline-flex items-center justify-end gap-1">
                                        <Flame className={`w-3.5 h-3.5 ${u.streak ? 'text-orange-400' : 'text-slate-600'}`} /> {u.streak ?? 0}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </AppShell>
    );
};

export default Leaderboard;
