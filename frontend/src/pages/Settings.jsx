import React from 'react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import { Settings as SettingsIcon, Volume2, Languages, Sparkles } from 'lucide-react';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

const SettingRow = ({ icon: Icon, title, desc, children }) => (
    <div className="flex items-center gap-4 py-4 border-b border-white/5 last:border-b-0">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-blue" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{title}</p>
            <p className="text-xs text-slate-400">{desc}</p>
        </div>
        {children}
    </div>
);

const Settings = () => {
    return (
        <AppShell headerSlot={<TopHeader title="Settings" primaryAction="Done" onPrimaryAction={() => {}} />}>
            <div className="max-w-2xl space-y-8" data-testid="settings-page">
                <div>
                    <h1 className="font-display font-black text-4xl tracking-tight">Settings</h1>
                    <p className="text-slate-400 mt-2">Personalize your Dialectica experience.</p>
                </div>

                <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-7">
                    <h3 className="font-display font-bold text-white mb-2 inline-flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-lime" /> AI Preferences
                    </h3>
                    <SettingRow icon={Volume2} title="AI voice playback" desc="Hear AI responses spoken aloud.">
                        <Switch defaultChecked data-testid="setting-tts-switch" />
                    </SettingRow>
                    <SettingRow icon={Languages} title="Auto-detect language" desc="Whisper picks language from your speech.">
                        <Switch defaultChecked data-testid="setting-lang-switch" />
                    </SettingRow>
                    <SettingRow icon={SettingsIcon} title="Adaptive difficulty" desc="AI scales challenge to your skill.">
                        <Switch data-testid="setting-difficulty-switch" />
                    </SettingRow>
                </div>

                <div className="rounded-2xl bg-brand-navy-elev border border-white/10 p-7">
                    <h3 className="font-display font-bold text-white mb-3">About</h3>
                    <p className="text-sm text-slate-400">Dialectica · v1.0 · Powered by Gemini 3 Pro & OpenAI Whisper.</p>
                </div>
            </div>
        </AppShell>
    );
};

export default Settings;
