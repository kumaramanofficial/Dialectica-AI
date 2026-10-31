import React from 'react';
import Sidebar from './Sidebar';

const AppShell = ({ children, headerSlot }) => {
    return (
        <div className="min-h-screen bg-brand-navy text-white flex">
            <Sidebar />
            <main className="flex-1 min-w-0 relative">
                {/* Decorative wave background */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 70% 0%, rgba(59,130,246,0.45), transparent 55%), radial-gradient(circle at 100% 100%, rgba(132,227,74,0.25), transparent 50%)',
                    }}
                />
                <div className="relative">
                    {headerSlot}
                    <div className="px-6 sm:px-10 py-6">{children}</div>
                </div>
            </main>
        </div>
    );
};

export default AppShell;
