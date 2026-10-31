import React from 'react';
import VoiceSession from '../components/VoiceSession';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const Debate = () => (
    <VoiceSession
        mode="debate"
        defaultTopic="Should AI replace human teachers?"
        setupFields={(config, setConfig) => (
            <div className="space-y-5">
                <div className="space-y-2">
                    <Label className="text-slate-300">Topic</Label>
                    <Input
                        value={config.topic}
                        onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                        placeholder="e.g. Should AI replace human teachers?"
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                        data-testid="debate-topic-input"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Your stance</Label>
                        <Select value={config.stance} onValueChange={(v) => setConfig({ ...config, stance: v })}>
                            <SelectTrigger data-testid="debate-stance-select" className="h-12 bg-white/5 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="for">For</SelectItem>
                                <SelectItem value="against">Against</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Difficulty</Label>
                        <Select value={config.difficulty} onValueChange={(v) => setConfig({ ...config, difficulty: v })}>
                            <SelectTrigger data-testid="debate-difficulty-select" className="h-12 bg-white/5 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        )}
    />
);

export default Debate;
