import React from 'react';
import AppShell from '../components/AppShell';
import TopHeader from '../components/TopHeader';
import { Users } from 'lucide-react';

const Community = () => (
    <AppShell headerSlot={<TopHeader title="Community" primaryAction="Coming Soon" onPrimaryAction={() => {}} />}>
        <div className="max-w-3xl mx-auto py-12 text-center" data-testid="community-page">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-lime mb-6 shadow-glow-blue">
                <Users className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display font-black text-4xl tracking-tight mb-3">Community is coming.</h1>
            <p className="text-slate-400 max-w-md mx-auto">
                Soon you'll be able to compete on leaderboards, join multi-user live debate rooms,
                and share your best sessions.
            </p>
        </div>
    </AppShell>
);

export default Community;
