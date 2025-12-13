import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, Zap, Brain } from 'lucide-react';

export default function MemoryPathwayExplorer({ memories, stats }) {
    const [omega, setOmega] = useState([0.5]);
    const [dopamine, setDopamine] = useState([0.7]);

    const getPathwayType = () => {
        const o = omega[0];
        if (o > 0.7) return 'ANALYTICAL';
        if (o < 0.3) return 'CREATIVE';
        return 'BALANCED';
    };

    const getDopamineMode = () => {
        const d = dopamine[0];
        if (d < 0.3) return 'ECONOMY';
        if (d > 0.7) return 'EXPLORATION';
        return 'BALANCED';
    };

    const simulateRetrieval = () => {
        const o = omega[0];
        const d = dopamine[0];

        const leftWeight = o;
        const rightWeight = 1 - o;

        const leftMemories = memories.filter(m => m.hemisphere === 'left');
        const rightMemories = memories.filter(m => m.hemisphere === 'right');
        const gcMemories = memories.filter(m => m.hemisphere === 'central');

        // Calculate expected retrieval counts
        const leftExpected = Math.ceil(leftMemories.length * leftWeight * d);
        const rightExpected = Math.ceil(rightMemories.length * rightWeight * d);
        const gcExpected = Math.ceil(gcMemories.length * 0.5);

        return {
            left: leftExpected,
            right: rightExpected,
            gc: gcExpected,
            total: leftExpected + rightExpected + gcExpected
        };
    };

    const retrieval = simulateRetrieval();
    const pathwayType = getPathwayType();
    const dopamineMode = getDopamineMode();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-400 text-base">Pathway Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Omega Control */}
                    <div>
                        <div className="flex justify-between mb-3">
                            <span className="text-sm text-slate-400">Omega (ω) - Hemispheric Balance</span>
                            <Badge className="bg-purple-600">{omega[0].toFixed(2)}</Badge>
                        </div>
                        <Slider
                            value={omega}
                            onValueChange={setOmega}
                            min={0}
                            max={1}
                            step={0.01}
                            className="mb-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Creative (R)</span>
                            <span>Balanced</span>
                            <span>Analytical (L)</span>
                        </div>
                    </div>

                    {/* Dopamine Control */}
                    <div>
                        <div className="flex justify-between mb-3">
                            <span className="text-sm text-slate-400">D2 Activation - Attention Level</span>
                            <Badge className="bg-blue-600">{dopamine[0].toFixed(2)}</Badge>
                        </div>
                        <Slider
                            value={dopamine}
                            onValueChange={setDopamine}
                            min={0}
                            max={1}
                            step={0.01}
                            className="mb-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Economy</span>
                            <span>Balanced</span>
                            <span>Exploration</span>
                        </div>
                    </div>

                    {/* Current State */}
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-xs text-slate-400">Pathway Type:</span>
                                <Badge className={
                                    pathwayType === 'ANALYTICAL' ? 'bg-blue-600' :
                                    pathwayType === 'CREATIVE' ? 'bg-pink-600' :
                                    'bg-purple-600'
                                }>
                                    {pathwayType}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-slate-400">Dopamine Mode:</span>
                                <Badge className={
                                    dopamineMode === 'ECONOMY' ? 'bg-orange-600' :
                                    dopamineMode === 'EXPLORATION' ? 'bg-green-600' :
                                    'bg-slate-600'
                                }>
                                    {dopamineMode}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Visualization */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-blue-400 text-base">Pathway Flow Simulation</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative h-80">
                        {/* Left Hemisphere */}
                        <div className="absolute left-0 top-0 bottom-0 w-1/3 flex flex-col justify-center items-center">
                            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${
                                omega[0] > 0.5 ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500/30 bg-blue-500/5'
                            }`}>
                                <Brain className={`w-12 h-12 ${omega[0] > 0.5 ? 'text-blue-400' : 'text-blue-400/30'}`} />
                            </div>
                            <div className="mt-3 text-center">
                                <div className="text-xs text-slate-400">Left Hemisphere</div>
                                <div className="text-lg font-bold text-blue-400">{retrieval.left}</div>
                                <div className="text-xs text-slate-500">memories</div>
                            </div>
                        </div>

                        {/* Genius Central */}
                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-20 h-20 rounded-full border-4 border-purple-500 bg-purple-500/20 flex items-center justify-center">
                                <Zap className="w-10 h-10 text-purple-400" />
                            </div>
                            <div className="mt-2 text-center">
                                <div className="text-xs text-slate-400">GC</div>
                                <div className="text-lg font-bold text-purple-400">{retrieval.gc}</div>
                            </div>
                        </div>

                        {/* Right Hemisphere */}
                        <div className="absolute right-0 top-0 bottom-0 w-1/3 flex flex-col justify-center items-center">
                            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${
                                omega[0] < 0.5 ? 'border-pink-500 bg-pink-500/20' : 'border-pink-500/30 bg-pink-500/5'
                            }`}>
                                <Brain className={`w-12 h-12 ${omega[0] < 0.5 ? 'text-pink-400' : 'text-pink-400/30'}`} />
                            </div>
                            <div className="mt-3 text-center">
                                <div className="text-xs text-slate-400">Right Hemisphere</div>
                                <div className="text-lg font-bold text-pink-400">{retrieval.right}</div>
                                <div className="text-xs text-slate-500">memories</div>
                            </div>
                        </div>

                        {/* Flow arrows */}
                        <svg className="absolute inset-0 pointer-events-none">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                                </marker>
                            </defs>
                            <line x1="25%" y1="50%" x2="45%" y2="50%" stroke="#3b82f6" strokeWidth="2" 
                                  opacity={omega[0] > 0.5 ? 0.8 : 0.3} markerEnd="url(#arrowhead)" />
                            <line x1="75%" y1="50%" x2="55%" y2="50%" stroke="#f472b6" strokeWidth="2"
                                  opacity={omega[0] < 0.5 ? 0.8 : 0.3} markerEnd="url(#arrowhead)" />
                        </svg>
                    </div>

                    <div className="mt-4 p-3 bg-slate-900 rounded-lg">
                        <div className="text-xs text-slate-400 mb-2">Expected Retrieval</div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Total memories retrieved:</span>
                            <Badge className="bg-green-600 text-base">{retrieval.total}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}