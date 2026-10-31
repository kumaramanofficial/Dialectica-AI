import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, Users, Brain, Mic, TrendingUp, Trophy, Briefcase, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
    { icon: Users, title: 'AI Debate Opponent', desc: 'Spar with a sharp, fact-loaded AI partner across hundreds of topics.' },
    { icon: Brain, title: 'Powered by Gemini 3', desc: 'Top-tier reasoning meets adaptive difficulty for serious practice.' },
    { icon: Mic, title: 'Voice-First Speaking', desc: 'Speak naturally — Whisper transcribes, the AI replies out loud.' },
    { icon: TrendingUp, title: 'Performance Analytics', desc: 'Track tone, clarity, pacing, filler words and engagement.' },
    { icon: Trophy, title: 'Score & Improve', desc: 'Get a graded session report with strengths and growth areas.' },
    { icon: Briefcase, title: 'Interview Prep', desc: 'Mock interviews tailored to roles with instant AI feedback.' },
];

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden">
            {/* Soft gradient blobs */}
            <div className="absolute top-0 -right-40 w-[36rem] h-[36rem] rounded-full bg-brand-blue/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -left-40 w-[36rem] h-[36rem] rounded-full bg-brand-lime/10 blur-3xl pointer-events-none" />

            {/* Nav */}
            <nav className="relative max-w-7xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5" data-testid="landing-logo">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Mic2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-display font-extrabold text-xl tracking-tight">Dialectica</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2" data-testid="landing-signin-link">
                        Sign In
                    </Link>
                    <Button
                        onClick={() => navigate('/signup')}
                        data-testid="landing-getstarted-btn"
                        className="bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30"
                    >
                        Get Started
                    </Button>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative max-w-7xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white/80 backdrop-blur text-xs font-semibold text-slate-600 mb-8 animate-float-up">
                    <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                    Voice-first AI speaking coach
                </div>
                <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05] animate-float-up" style={{ animationDelay: '0.1s' }}>
                    Master the
                    <br />
                    <span className="text-brand-gradient">Art of Debate</span>
                </h1>
                <p className="mt-8 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed animate-float-up" style={{ animationDelay: '0.2s' }}>
                    Practice public speaking, debate with AI opponents, ace interviews, and join a community
                    of eloquent speakers. Real-time voice analysis, performance tracking, and expert feedback.
                </p>
                <div className="mt-10 flex items-center justify-center gap-3 animate-float-up" style={{ animationDelay: '0.3s' }}>
                    <Button
                        onClick={() => navigate('/signup')}
                        data-testid="hero-getstarted-btn"
                        className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-lg shadow-xl shadow-blue-500/40 px-7 py-6 text-base gap-2"
                    >
                        Start Speaking <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        data-testid="hero-learnmore-btn"
                        className="border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-lg px-7 py-6 text-base"
                    >
                        Learn More
                    </Button>
                </div>

                {/* Hero image / mock card */}
                <div className="mt-20 relative max-w-4xl mx-auto animate-float-up" style={{ animationDelay: '0.4s' }}>
                    <div className="relative rounded-3xl overflow-hidden bg-brand-navy border border-white/10 shadow-2xl shadow-blue-500/20 p-8 sm:p-12">
                        <div className="absolute inset-0 opacity-30" style={{
                            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.5), transparent 50%), radial-gradient(circle at 80% 80%, rgba(132,227,74,0.4), transparent 50%)'
                        }} />
                        <div className="relative flex flex-col items-center gap-6">
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center shadow-glow-blue">
                                <Mic2 className="w-12 h-12 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="flex items-end gap-1.5 h-16">
                                {Array.from({ length: 32 }).map((_, i) => (
                                    <div key={i} className="wave-bar" style={{ animationDelay: `${(i * 0.05) % 1}s`, animationDuration: `${0.6 + (i % 5) * 0.2}s` }} />
                                ))}
                            </div>
                            <p className="text-white/80 text-sm font-semibold uppercase tracking-[0.2em]">Live • AI listening</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="relative max-w-7xl mx-auto px-6 sm:px-8 py-24">
                <div className="text-center mb-16">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-blue mb-3">Powerful Features</p>
                    <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
                        Everything you need to become
                        <br />
                        <span className="text-brand-gradient">an exceptional speaker.</span>
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, idx) => (
                        <div
                            key={f.title}
                            data-testid={`feature-card-${idx}`}
                            className="group relative bg-white border border-slate-200 rounded-2xl p-7 hover:border-brand-blue/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-5 group-hover:bg-brand-blue group-hover:scale-110 transition-all">
                                <f.icon className="w-6 h-6 text-brand-blue group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative max-w-7xl mx-auto px-6 sm:px-8 py-20 pb-32">
                <div className="rounded-3xl bg-gradient-to-br from-brand-navy via-[#0d1b2e] to-[#15253d] p-12 sm:p-16 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-40" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.4), transparent 50%), radial-gradient(circle at 90% 70%, rgba(132,227,74,0.3), transparent 50%)'
                    }} />
                    <div className="relative">
                        <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight mb-4">
                            Find your voice. Win the room.
                        </h2>
                        <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8">
                            Free to start. No credit card. Just plug in your headphones and speak.
                        </p>
                        <Button
                            onClick={() => navigate('/signup')}
                            data-testid="cta-getstarted-btn"
                            className="bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-lg shadow-glow-blue px-8 py-6 text-base gap-2"
                        >
                            Get Started Free <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </section>

            <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                © 2026 Dialectica · Crafted for speakers, debaters & dreamers.
            </footer>
        </div>
    );
};

export default Landing;
