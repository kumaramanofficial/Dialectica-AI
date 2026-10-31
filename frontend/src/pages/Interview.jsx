import React from 'react';
import VoiceSession from '../components/VoiceSession';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const Interview = () => (
    <VoiceSession
        mode="interview"
        defaultTopic=""
        setupFields={(config, setConfig) => (
            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-slate-300">Role</Label>
                    <Input
                        value={config.role}
                        onChange={(e) => setConfig({ ...config, role: e.target.value })}
                        placeholder="e.g. Software Engineer"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                        data-testid="interview-role-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Focus area (optional)</Label>
                    <Input
                        value={config.topic}
                        onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                        placeholder="e.g. System design, leadership, React"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                        data-testid="interview-topic-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Difficulty</Label>
                    <Select value={config.difficulty} onValueChange={(v) => setConfig({ ...config, difficulty: v })}>
                        <SelectTrigger data-testid="interview-difficulty-select" className="h-12 bg-white/5 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Junior</SelectItem>
                            <SelectItem value="medium">Mid-level</SelectItem>
                            <SelectItem value="hard">Senior</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )}
    />
);

export default Interview;
