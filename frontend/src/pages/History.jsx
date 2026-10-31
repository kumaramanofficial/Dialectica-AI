import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Briefcase, MessagesSquare, Calendar, TrendingUp } from 'lucide-react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const History = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = async () => {
        try {
            const res = await api.get('/conversations');
            setItems(res.data);
        } catch (e) {
            toast.error('Could not load history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this session?')) return;
        try {
            await api.delete(`/conversation/${id}`);
            setItems((arr) => arr.filter(i => i.conversation_id !== id));
            toast.success('Session deleted.');
        } catch {
            toast.error('Could not delete.');
        }
    };

    return (
        <AppShell headerSlot={<TopHeader title="Analysis History" primaryAction="New Session" onPrimaryAction={() => navigate('/debate')} />}>
            <div className="max-w-5xl space-y-8" data-testid="history-page">
                <div>
                    <h1 className="font-display font-black text-4xl tracking-tight">Analysis History</h1>
                    <p className="text-slate-400 mt-2">Review past sessions, scores, and learnings.</p>
                </div>

                {loading ? (
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-12 text-center text-slate-400">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-12 text-center">
                        <TrendingUp className="w-10 h-10 mx-auto text-slate-500 mb-4" />
                        <p className="text-white font-semibold mb-2">No sessions yet</p>
                        <p className="text-slate-400 text-sm mb-5">Start your first AI debate or interview.</p>
                        <Button onClick={() => navigate('/debate')} className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold" data-testid="history-empty-cta">
                            Start a Session
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {items.map((it) => (
                            <div
                                key={it.conversation_id}
                                data-testid={`history-item-${it.conversation_id}`}
                                className="group rounded-2xl bg-brand-navy-elev border border-white/10 hover:border-brand-blue/40 p-5 sm:p-6 flex items-start gap-4 transition"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    it.mode === 'interview' ? 'bg-brand-lime/15 text-brand-lime' : 'bg-brand-blue/15 text-brand-blue'
                                }`}>
                                    {it.mode === 'interview' ? <Briefcase className="w-5 h-5" /> : <MessagesSquare className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">{it.mode}</p>
                                            <h4 className="font-display font-bold text-white text-lg truncate">{it.topic || it.role}</h4>
                                            <p className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" /> {new Date(it.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {it.score != null ? (
                                                <p className="font-display font-black text-3xl text-brand-gradient">{it.score}</p>
                                            ) : (
                                                <p className="text-xs text-slate-500">In progress</p>
                                            )}
                                        </div>
                                    </div>
                                    {it.analysis?.summary && (
                                        <p className="text-sm text-slate-400 mt-3 line-clamp-2">{it.analysis.summary}</p>
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            onClick={() => handleDelete(it.conversation_id)}
                                            data-testid={`history-delete-${it.conversation_id}`}
                                            className="text-xs text-slate-500 hover:text-red-400 inline-flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
};

export default History;
