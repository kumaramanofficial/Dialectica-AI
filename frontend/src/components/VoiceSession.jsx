import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, X, Volume2, VolumeX, Sparkles, ArrowRight, Loader2, Trophy } from 'lucide-react';
import VoiceOrb, { Waveform } from '../components/VoiceOrb';
import { Button } from '../components/ui/button';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import api, { API } from '../lib/api';
import { toast } from 'sonner';

/**
 * Reusable voice session UI.
 * mode: 'debate' | 'interview'
 */
const VoiceSession = ({ mode, defaultTopic, onClose, setupFields }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const prefill = location.state?.prefill;
    const recorder = useVoiceRecorder();
    const audioRef = useRef(null);
    const transcriptRef = useRef(null);

    const [phase, setPhase] = useState('setup'); // setup | active | thinking | speaking | analyzing | done
    const [config, setConfig] = useState({
        topic: prefill?.topic || defaultTopic || '',
        stance: prefill?.stance || 'for',
        role: prefill?.role || 'Software Engineer',
        difficulty: prefill?.difficulty || 'medium',
    });
    const [conversationId, setConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [muted, setMuted] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [messages]);

    const playAudioBlob = async (blob) => {
        if (muted) {
            setPhase('active');
            return;
        }
        setPhase('speaking');
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.onended = () => {
                setPhase('active');
                URL.revokeObjectURL(url);
            };
            try {
                await audioRef.current.play();
            } catch {
                setPhase('active');
            }
        } else {
            setPhase('active');
        }
    };

    const speakText = async (text) => {
        if (muted) return;
        try {
            setPhase('speaking');
            const res = await api.post('/voice/tts', { text, voice: mode === 'interview' ? 'onyx' : 'nova' }, { responseType: 'blob' });
            await playAudioBlob(res.data);
        } catch (e) {
            console.error('TTS failed', e);
            setPhase('active');
        }
    };

    const startSession = async () => {
        try {
            setPhase('thinking');
            const payload = mode === 'debate'
                ? { mode: 'debate', topic: config.topic, stance: config.stance, difficulty: config.difficulty }
                : { mode: 'interview', topic: config.topic || `Interview for ${config.role}`, role: config.role, difficulty: config.difficulty };
            const res = await api.post('/conversation/start', payload);
            setConversationId(res.data.conversation_id);
            setMessages([{ role: 'assistant', text: res.data.ai_text }]);
            await speakText(res.data.ai_text);
        } catch (e) {
            console.error(e);
            const detail = e?.response?.data?.detail || 'Could not start session.';
            toast.error(detail);
            setPhase('setup');
        }
    };

    const handleMicClick = async () => {
        if (phase === 'active') {
            try {
                await recorder.start();
                setPhase('listening');
            } catch (e) {
                toast.error('Microphone access denied.');
            }
            return;
        }
        if (phase === 'listening') {
            const blob = await recorder.stop();
            if (!blob || blob.size < 500) {
                toast.error('Recording too short.');
                setPhase('active');
                return;
            }
            setPhase('thinking');
            try {
                // Single combined call: transcribe + Gemini + TTS all server-side
                const fd = new FormData();
                fd.append('file', blob, 'speech.webm');
                fd.append('conversation_id', conversationId);
                fd.append('voice', mode === 'interview' ? 'onyx' : 'nova');
                const res = await api.post('/voice/speak', fd, {
                    responseType: 'blob',
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                const userB64 = res.headers['x-user-text'] || res.headers['X-User-Text'];
                const aiB64 = res.headers['x-ai-text'] || res.headers['X-AI-Text'];
                let userText = '', aiText = '';
                try { if (userB64) userText = atob(userB64); } catch {}
                try { if (aiB64) aiText = decodeURIComponent(escape(atob(aiB64))); } catch { try { aiText = atob(aiB64); } catch {} }

                if (userText) setMessages((m) => [...m, { role: 'user', text: userText }]);
                if (aiText) setMessages((m) => [...m, { role: 'assistant', text: aiText }]);

                // Play audio immediately — no extra round-trip to /voice/tts
                await playAudioBlob(res.data);
            } catch (e) {
                console.error(e);
                let msg = 'Something went wrong. Try again.';
                try {
                    const errText = await (e?.response?.data?.text?.() || Promise.resolve(''));
                    if (errText) { const j = JSON.parse(errText); if (j?.detail) msg = j.detail; }
                } catch {}
                toast.error(msg);
                setPhase('active');
            }
        }
    };

    const endSession = async () => {
        if (!conversationId) {
            onClose ? onClose() : navigate('/dashboard');
            return;
        }
        try {
            setPhase('analyzing');
            const res = await api.post(`/conversation/${conversationId}/end`);
            setAnalysis(res.data);
            setPhase('done');
        } catch (e) {
            toast.error('Could not analyze session.');
            setPhase('done');
            setAnalysis({ score: 7.5, summary: 'Session ended.' });
        }
    };

    const statusLabel = {
        setup: 'Configuring',
        active: 'Tap mic to speak',
        listening: 'Listening… tap to send',
        thinking: 'AI is thinking…',
        speaking: 'AI is speaking…',
        analyzing: 'Analyzing your performance',
        done: 'Session complete',
    }[phase];

    if (phase === 'setup') {
        return (
            <div className="min-h-screen bg-brand-navy text-white relative overflow-hidden flex items-center justify-center p-6">
                <div className="absolute -top-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-brand-blue/15 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-brand-lime/10 blur-3xl pointer-events-none" />

                <div className="relative max-w-xl w-full">
                    <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1.5" data-testid="setup-back-btn">
                        ← Back to dashboard
                    </button>
                    <div className="rounded-3xl bg-brand-navy-elev border border-white/10 p-8 sm:p-10">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-brand-blue mb-3">
                            <Sparkles className="w-3.5 h-3.5" /> {mode === 'debate' ? 'AI Debate Setup' : 'Interview Prep Setup'}
                        </div>
                        <h2 className="font-display font-black text-3xl tracking-tight mb-6">
                            {mode === 'debate' ? 'Choose your topic and stance.' : 'Pick a role to interview for.'}
                        </h2>

                        {setupFields ? setupFields(config, setConfig) : null}

                        <Button onClick={startSession} className="w-full mt-8 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-lg py-6 shadow-glow-blue gap-2" data-testid="setup-start-btn">
                            Start <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="min-h-screen bg-brand-navy text-white p-6 sm:p-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lime mb-5 shadow-glow-blue">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="font-display font-black text-4xl tracking-tight mb-2">Session complete</h2>
                        <p className="text-slate-400">Here's how you performed.</p>
                    </div>

                    <div className="rounded-3xl bg-brand-navy-elev border border-white/10 p-8 sm:p-10">
                        <div className="flex items-end gap-3 mb-2">
                            <p className="font-display font-black text-7xl text-brand-gradient" data-testid="result-score">{analysis?.score ?? '–'}</p>
                            <span className="text-slate-400 mb-3">/ 10</span>
                        </div>
                        <p className="text-slate-300 mb-8">{analysis?.summary}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                ['Tone', analysis?.tone],
                                ['Clarity', analysis?.clarity],
                                ['Pacing', analysis?.pacing],
                                ['Engagement', analysis?.engagement],
                                ['Filler Words', analysis?.filler_words],
                            ].filter(([, v]) => v).map(([k, v]) => (
                                <div key={k} className="rounded-xl bg-white/5 border border-white/10 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{k}</p>
                                    <p className="text-white font-semibold">{v}</p>
                                </div>
                            ))}
                        </div>

                        {analysis?.strengths?.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm font-bold text-brand-lime uppercase tracking-wider mb-2">Strengths</p>
                                <ul className="space-y-1.5">
                                    {analysis.strengths.map((s, i) => (
                                        <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-brand-lime">✓</span>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {analysis?.improvements?.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm font-bold text-brand-blue uppercase tracking-wider mb-2">Improvements</p>
                                <ul className="space-y-1.5">
                                    {analysis.improvements.map((s, i) => (
                                        <li key={i} className="text-slate-300 text-sm flex gap-2"><span className="text-brand-blue">→</span>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-3 mt-8">
                            <Button onClick={() => navigate('/dashboard')} className="flex-1 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold" data-testid="result-dashboard-btn">
                                Back to Dashboard
                            </Button>
                            <Button onClick={() => navigate('/history')} variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/5" data-testid="result-history-btn">
                                View History
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-navy text-white relative overflow-hidden flex flex-col" data-testid="voice-session">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{
                backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgba(132,227,74,0.2), transparent 50%)'
            }} />

            <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{mode}</p>
                        <p className="text-sm font-semibold text-white">{config.topic || (mode === 'interview' ? config.role : 'Live')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMuted(m => !m)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
                        data-testid="mute-btn"
                        aria-label="mute"
                    >
                        {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
                    </button>
                    <Button onClick={endSession} variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2" data-testid="end-session-btn">
                        <X className="w-4 h-4" /> End
                    </Button>
                </div>
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center gap-10 px-6 py-10">
                <VoiceOrb
                    status={phase === 'listening' ? 'listening' : phase === 'thinking' || phase === 'analyzing' ? 'thinking' : phase === 'speaking' ? 'speaking' : 'idle'}
                    onClick={handleMicClick}
                    label={statusLabel}
                />
                <Waveform active={phase === 'listening' || phase === 'speaking'} />

                {messages.length > 0 && (
                    <div ref={transcriptRef} className="w-full max-w-2xl max-h-48 overflow-y-auto px-4 space-y-3" data-testid="transcript">
                        {messages.slice(-4).map((m, i) => (
                            <div key={i} className={`text-sm ${m.role === 'assistant' ? 'text-slate-300' : 'text-brand-lime'}`}>
                                <span className="font-semibold uppercase text-[10px] tracking-wider mr-2 opacity-60">
                                    {m.role === 'assistant' ? 'AI' : 'YOU'}
                                </span>
                                {m.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <audio ref={audioRef} className="hidden" />
        </div>
    );
};

export default VoiceSession;
