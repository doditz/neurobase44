import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, BarChart3, Shield, Zap, Plus, Minus, Play } from 'lucide-react';

const SCENARIO_OPTIONS = [
    { id: 'creative', title: 'Créatif', icon: Sparkles, color: 'bg-purple-600' },
    { id: 'analytical', title: 'Analytique', icon: BarChart3, color: 'bg-blue-600' },
    { id: 'ethical', title: 'Éthique', icon: Shield, color: 'bg-orange-600' },
    { id: 'technical', title: 'Technique', icon: Zap, color: 'bg-green-600' }
];

export default function BatchScenarioConfig({ onLaunchBatch, disabled }) {
    const [scenarioConfig, setScenarioConfig] = useState({
        creative: 0,
        analytical: 0,
        ethical: 0,
        technical: 0
    });

    const totalQuestions = Object.values(scenarioConfig).reduce((sum, val) => sum + val, 0);

    const updateCount = (scenarioId, delta) => {
        setScenarioConfig(prev => ({
            ...prev,
            [scenarioId]: Math.max(0, Math.min(50, prev[scenarioId] + delta))
        }));
    };

    const handleLaunch = () => {
        if (totalQuestions === 0) return;
        onLaunchBatch({ scenarioConfig, totalQuestions });
    };

    const quickPresets = [
        { name: 'Équilibré (12)', config: { creative: 3, analytical: 3, ethical: 3, technical: 3 } },
        { name: 'Focus Analytique (15)', config: { creative: 2, analytical: 8, ethical: 3, technical: 2 } },
        { name: 'Complet (25)', config: { creative: 6, analytical: 7, ethical: 6, technical: 6 } }
    ];

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-400">Configuration Batch par Scénarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                    {quickPresets.map((preset, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => setScenarioConfig(preset.config)}
                            disabled={disabled}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            {preset.name}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScenarioConfig({ creative: 0, analytical: 0, ethical: 0, technical: 0 })}
                        disabled={disabled}
                        className="border-slate-600 text-red-400 hover:bg-slate-700"
                    >
                        Réinitialiser
                    </Button>
                </div>

                {/* Scenario Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SCENARIO_OPTIONS.map((scenario) => {
                        const Icon = scenario.icon;
                        const count = scenarioConfig[scenario.id];
                        
                        return (
                            <div key={scenario.id} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${scenario.color} rounded-lg flex items-center justify-center`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-slate-300 font-medium">{scenario.title}</span>
                                    </div>
                                    <Badge className={count > 0 ? 'bg-green-600' : 'bg-slate-700'}>
                                        {count}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateCount(scenario.id, -1)}
                                        disabled={count === 0 || disabled}
                                        className="h-8 w-8 p-0 border-slate-600"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={count}
                                        onChange={(e) => setScenarioConfig(prev => ({
                                            ...prev,
                                            [scenario.id]: Math.max(0, Math.min(50, parseInt(e.target.value) || 0))
                                        }))}
                                        disabled={disabled}
                                        className="h-8 text-center bg-slate-800 border-slate-600 text-slate-300"
                                        min="0"
                                        max="50"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateCount(scenario.id, 1)}
                                        disabled={count >= 50 || disabled}
                                        className="h-8 w-8 p-0 border-slate-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total & Launch */}
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <div>
                        <div className="text-sm text-slate-400">Total de questions</div>
                        <div className="text-2xl font-bold text-green-400">{totalQuestions}</div>
                    </div>
                    <Button
                        onClick={handleLaunch}
                        disabled={totalQuestions === 0 || disabled}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Lancer Batch Personnalisé
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}