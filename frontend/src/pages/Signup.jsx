import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const Signup = () => {
    const navigate = useNavigate();
    const { signupEmail } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signupEmail(email, password, name);
            toast.success('Welcome to Dialectica!');
            navigate('/dashboard');
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Signup failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        const redirectUrl = window.location.origin + '/dashboard';
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    return (
        <div className="min-h-screen flex bg-brand-navy text-white relative overflow-hidden">
            <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-brand-lime/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-brand-blue/20 blur-3xl pointer-events-none" />

            <div className="relative flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Link to="/" className="flex items-center gap-2.5 mb-12">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-blue to-brand-lime flex items-center justify-center shadow-glow-blue">
                            <Mic2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-display font-extrabold text-xl">Dialectica</span>
                    </Link>

                    <h1 className="font-display font-black text-4xl mb-3 tracking-tight">Create your account</h1>
                    <p className="text-slate-400 mb-10">Start practicing in less than a minute.</p>

                    <Button
                        onClick={handleGoogle}
                        data-testid="signup-google-btn"
                        variant="outline"
                        className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold rounded-lg py-6 gap-3 mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853"/>
                            <path d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.84Z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07L5.85 9.9C6.71 7.31 9.14 5.38 12 5.38Z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </Button>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-slate-500 uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-300">Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-brand-blue"
                                    data-testid="signup-name-input" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-brand-blue"
                                    data-testid="signup-email-input" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-brand-blue"
                                    data-testid="signup-password-input" />
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" data-testid="signup-error">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}
                        <Button type="submit" disabled={loading} data-testid="signup-submit-btn"
                            className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-lg py-6 shadow-glow-blue gap-2">
                            {loading ? 'Creating account…' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-8">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-blue font-semibold hover:underline" data-testid="signup-login-link">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
