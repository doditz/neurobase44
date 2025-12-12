import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Music, Zap, Users, ThermometerSun, Brain } from 'lucide-react';

export default function SunoSettingsPanel({ settings, onSettingsChange }) {
    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="space-y-6 p-4">
            {/* Preset Header */}
            <div className="text-center pb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Music className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-green-300">Suno AI Settings</h3>
                </div>
                <p className="text-xs text-slate-400">Optimized for music composition & creative generation</p>
            </div>

            {/* Creative Mode Banner */}
            <Card className="bg-purple-900/20 border-purple-600/50">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-purple-300">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">Creative Mode Active</span>
                    </div>
                    <p className="text-xs text-purple-400 mt-1">
                        Enhanced for artistic expression, lyric composition, and musical creativity
                    </p>
                </CardContent>
            </Card>

            <Separator className="bg-slate-700" />

            {/* Temperature Setting */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-300">
                        <ThermometerSun className="w-4 h-4" />
                        Creativity Level
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Higher = more creative and varied outputs
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-400">Temperature</Label>
                        <Badge variant="outline" className="text-xs bg-orange-900/30 text-orange-400 border-orange-600">
                            {settings.temperature || 0.8}
                        </Badge>
                    </div>
                    <Slider
                        value={[settings.temperature || 0.8]}
                        onValueChange={([value]) => handleChange('temperature', value)}
                        min={0.4}
                        max={1.0}
                        step={0.05}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Focused</span>
                        <span>Creative</span>
                    </div>
                </CardContent>
            </Card>

            {/* Personas Setting */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-300">
                        <Users className="w-4 h-4" />
                        Creative Personas
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Number of artistic personas (lyricists, composers, producers)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-400">Max Personas</Label>
                        <Badge variant="outline" className="text-xs bg-purple-900/30 text-purple-400 border-purple-600">
                            {settings.maxPersonas || 3}
                        </Badge>
                    </div>
                    <Slider
                        value={[settings.maxPersonas || 3]}
                        onValueChange={([value]) => handleChange('maxPersonas', value)}
                        min={2}
                        max={5}
                        step={1}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>2 (Fast)</span>
                        <span>5 (Diverse)</span>
                    </div>
                </CardContent>
            </Card>

            {/* Debate Rounds */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-300">
                        <Brain className="w-4 h-4" />
                        Refinement Rounds
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Number of creative iterations for polishing
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-400">Debate Rounds</Label>
                        <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-400 border-blue-600">
                            {settings.debateRounds || 2}
                        </Badge>
                    </div>
                    <Slider
                        value={[settings.debateRounds || 2]}
                        onValueChange={([value]) => handleChange('debateRounds', value)}
                        min={1}
                        max={3}
                        step={1}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>1 (Quick)</span>
                        <span>3 (Polished)</span>
                    </div>
                </CardContent>
            </Card>

            {/* Hemisphere Mode */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-300">Creative Hemisphere</CardTitle>
                    <CardDescription className="text-xs">
                        Cognitive emphasis for music generation
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={settings.hemisphereMode || 'creative'}
                        onValueChange={(value) => handleChange('hemisphereMode', value)}
                    >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="creative" className="text-green-300">
                                <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4" />
                                    Creative (Right-brain dominant)
                                </div>
                            </SelectItem>
                            <SelectItem value="balanced" className="text-green-300">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    Balanced (Integrated)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Info Footer */}
            <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                    Settings optimized for Suno AI music composition with Suno 5.0 Beta guidelines
                </p>
            </div>
        </div>
    );
}