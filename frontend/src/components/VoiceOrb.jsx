import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

/**
 * Voice Orb — animated AI/user speaking visualization.
 * status: 'idle' | 'listening' | 'thinking' | 'speaking'
 */
const VoiceOrb = ({ status = 'idle', onClick, disabled = false, label }) => {
    const statusColors = {
        idle: 'from-brand-blue/40 to-brand-lime/30',
        listening: 'from-brand-blue to-brand-lime',
        thinking: 'from-purple-500 to-brand-blue',
        speaking: 'from-brand-lime to-brand-blue',
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative w-72 h-72 flex items-center justify-center" data-testid="voice-orb">
                {/* Outer glow rings */}
                <div className={`absolute inset-0 bg-gradient-to-tr ${statusColors[status]} rounded-full blur-3xl opacity-50 ${status !== 'idle' ? 'animate-orb' : ''}`} />
                <div className={`absolute inset-6 bg-gradient-to-br ${statusColors[status]} rounded-full blur-2xl opacity-60 ${status !== 'idle' ? 'animate-orb' : ''}`} style={{ animationDelay: '0.4s' }} />

                {/* Rotating ring */}
                <div className={`absolute inset-3 rounded-full border-2 border-brand-blue/30 ${status !== 'idle' ? 'animate-orb-rotate' : ''}`}
                    style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(59,130,246,0.4), transparent 50%, rgba(132,227,74,0.4), transparent)',
                        WebkitMask: 'radial-gradient(circle, transparent 60%, black 62%)',
                        mask: 'radial-gradient(circle, transparent 60%, black 62%)',
                    }}
                />

                {/* Core button */}
                <button
                    onClick={onClick}
                    disabled={disabled || status === 'thinking' || status === 'speaking'}
                    data-testid="voice-orb-mic-btn"
                    className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center text-white transition-all
                        bg-brand-navy-elev border-2 ${status === 'listening' ? 'border-brand-lime' : 'border-brand-blue'}
                        hover:scale-105 active:scale-95
                        ${disabled || status === 'thinking' || status === 'speaking' ? 'opacity-70 cursor-not-allowed' : ''}
                        shadow-2xl shadow-blue-500/40`}
                    aria-label="Mic"
                >
                    {status === 'thinking' ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : status === 'listening' ? (
                        <Square className="w-9 h-9 fill-brand-lime text-brand-lime" />
                    ) : (
                        <Mic className="w-10 h-10" />
                    )}
                </button>
            </div>

            {label && (
                <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-1.5 font-bold">Status</p>
                    <p className="text-base text-white font-semibold" data-testid="voice-orb-status">{label}</p>
                </div>
            )}
        </div>
    );
};

export const Waveform = ({ active = false, bars = 24 }) => {
    return (
        <div className="flex items-end justify-center gap-1.5 h-16" data-testid="waveform">
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    className="wave-bar"
                    style={{
                        animationDelay: `${(i * 0.06) % 0.8}s`,
                        animationDuration: `${0.7 + (i % 4) * 0.2}s`,
                        height: active ? undefined : '8px',
                        animationPlayState: active ? 'running' : 'paused',
                        opacity: active ? 1 : 0.35,
                    }}
                />
            ))}
        </div>
    );
};

export default VoiceOrb;
