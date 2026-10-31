import React from 'react';
import VoiceSession from '../components/VoiceSession';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const Practice = () => (
    <VoiceSession
        mode="debate"
        defaultTopic="Practice pitch"
        setupFields={(config, setConfig) => (
            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-slate-300">What do you want to practice?</Label>
                    <Textarea
                        value={config.topic}
                        onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                        placeholder="e.g. Pitch my startup idea about sustainable fashion"
                        className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                        data-testid="practice-topic-input"
                    />
                </div>
                <p className="text-xs text-slate-500">
                    Solo practice mode — the AI plays a friendly coach who gives sharp feedback.
                </p>
            </div>
        )}
    />
);

export default Practice;
