import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Settings, Play, ChevronDown, Zap, Target, RefreshCw } from 'lucide-react';

const DEFAULT_CONFIG = {
    max_iterations: 10,
    convergence_threshold: 0.92,
    exploration_rate: 0.15,
    quality_floor: 0.85,
    efficiency_target: 0.50,
    run_mode: 'ab_test',
    enable_auto_tune: false,
    temperature: 0.7,
    max_personas: 5,
    debate_rounds: 3
};

export default function ConfigurableTestPanel({ onRunTest, isRunning, selectedQuestion }) {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const resetToDefaults = () => {
        setConfig(DEFAULT_CONFIG);
    };

    const handleRun = () => {
        onRunTest(config);
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Configuration du Test
                    </CardTitle>
                    <Button onClick={resetToDefaults} variant="ghost" size="sm" className="text-slate-400 hover:text-green-400">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Mode Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-slate-400">Mode de Test</Label>
                        <Select value={config.run_mode} onValueChange={(v) => updateConfig('run_mode', v)}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300 mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="ab_test">Test A/B Rapide</SelectItem>
                                <SelectItem value="auto_tune">Auto-Optimization</SelectItem>
                                <SelectItem value="batch">Batch Complet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                        <div>
                            <Label className="text-xs text-slate-400">Auto-Tune Actif</Label>
                            <p className="text-xs text-slate-500">Ajustement paramètres</p>
                        </div>
                        <Switch
                            checked={config.enable_auto_tune}
                            onCheckedChange={(v) => updateConfig('enable_auto_tune', v)}
                        />
                    </div>
                </div>

                {/* Basic Parameters */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label className="text-xs text-slate-400">Température</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Slider
                                value={[config.temperature]}
                                onValueChange={([v]) => updateConfig('temperature', v)}
                                min={0.1}
                                max={1.0}
                                step={0.1}
                                className="flex-1"
                            />
                            <Badge variant="outline" className="w-12 justify-center">{config.temperature}</Badge>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">Max Personas</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Slider
                                value={[config.max_personas]}
                                onValueChange={([v]) => updateConfig('max_personas', v)}
                                min={1}
                                max={10}
                                step={1}
                                className="flex-1"
                            />
                            <Badge variant="outline" className="w-12 justify-center">{config.max_personas}</Badge>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">Rounds Débat</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Slider
                                value={[config.debate_rounds]}
                                onValueChange={([v]) => updateConfig('debate_rounds', v)}
                                min={1}
                                max={5}
                                step={1}
                                className="flex-1"
                            />
                            <Badge variant="outline" className="w-12 justify-center">{config.debate_rounds}</Badge>
                        </div>
                    </div>
                </div>

                {/* Advanced Options */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-slate-400 hover:text-green-400">
                            Options Avancées
                            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-slate-400">Max Itérations</Label>
                                <Input
                                    type="number"
                                    value={config.max_iterations}
                                    onChange={(e) => updateConfig('max_iterations', parseInt(e.target.value))}
                                    className="bg-slate-700 border-slate-600 text-green-300 mt-1"
                                    min={1}
                                    max={50}
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-400">Seuil Convergence</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Slider
                                        value={[config.convergence_threshold]}
                                        onValueChange={([v]) => updateConfig('convergence_threshold', v)}
                                        min={0.5}
                                        max={1.0}
                                        step={0.01}
                                        className="flex-1"
                                    />
                                    <Badge variant="outline" className="w-14 justify-center">{config.convergence_threshold}</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs text-slate-400">Exploration Rate</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Slider
                                        value={[config.exploration_rate]}
                                        onValueChange={([v]) => updateConfig('exploration_rate', v)}
                                        min={0}
                                        max={0.5}
                                        step={0.05}
                                        className="flex-1"
                                    />
                                    <Badge variant="outline" className="w-12 justify-center">{config.exploration_rate}</Badge>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-400">Quality Floor</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Slider
                                        value={[config.quality_floor]}
                                        onValueChange={([v]) => updateConfig('quality_floor', v)}
                                        min={0.5}
                                        max={1.0}
                                        step={0.05}
                                        className="flex-1"
                                    />
                                    <Badge variant="outline" className="w-12 justify-center">{config.quality_floor}</Badge>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-slate-400">Efficiency Target</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Slider
                                        value={[config.efficiency_target]}
                                        onValueChange={([v]) => updateConfig('efficiency_target', v)}
                                        min={0.2}
                                        max={0.8}
                                        step={0.05}
                                        className="flex-1"
                                    />
                                    <Badge variant="outline" className="w-12 justify-center">{config.efficiency_target}</Badge>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* Run Button */}
                <Button
                    onClick={handleRun}
                    disabled={isRunning || !selectedQuestion}
                    className={`w-full h-12 ${config.run_mode === 'auto_tune' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isRunning ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Test en cours...
                        </>
                    ) : (
                        <>
                            {config.run_mode === 'auto_tune' ? <Zap className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            {config.run_mode === 'ab_test' ? 'Lancer Test A/B' : 
                             config.run_mode === 'auto_tune' ? 'Démarrer Auto-Optimization' : 
                             'Lancer Batch'}
                        </>
                    )}
                </Button>

                {/* Current Config Summary */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Mode: {config.run_mode}</Badge>
                    <Badge variant="outline" className="text-xs">T: {config.temperature}</Badge>
                    <Badge variant="outline" className="text-xs">Personas: {config.max_personas}</Badge>
                    <Badge variant="outline" className="text-xs">Rounds: {config.debate_rounds}</Badge>
                    {config.enable_auto_tune && <Badge className="bg-orange-600 text-xs">Auto-Tune ON</Badge>}
                </div>
            </CardContent>
        </Card>
    );
}