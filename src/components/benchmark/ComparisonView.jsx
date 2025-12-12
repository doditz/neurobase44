import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Loader2, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';

export default function ComparisonView() {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedA, setSelectedA] = useState(null);
    const [selectedB, setSelectedB] = useState(null);
    const [comparison, setComparison] = useState(null);

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        setIsLoading(true);
        try {
            const data = await base44.entities.DevTestResult.list('-created_date', 50);
            setResults(data);
        } catch (error) {
            console.error('Failed to load results:', error);
            toast.error('Erreur de chargement');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedA && selectedB) {
            generateComparison();
        }
    }, [selectedA, selectedB]);

    const generateComparison = () => {
        const a = results.find(r => r.id === selectedA);
        const b = results.find(r => r.id === selectedB);

        if (!a || !b) return;

        const comp = {
            spg: {
                a: a.global_score_performance || 0,
                b: b.global_score_performance || 0,
                diff: ((b.global_score_performance || 0) - (a.global_score_performance || 0)),
                diffPercent: ((((b.global_score_performance || 0) - (a.global_score_performance || 0)) / (a.global_score_performance || 0.001)) * 100)
            },
            time: {
                a: a.mode_b_time_ms || 0,
                b: b.mode_b_time_ms || 0,
                diff: ((b.mode_b_time_ms || 0) - (a.mode_b_time_ms || 0)),
                diffPercent: ((((b.mode_b_time_ms || 0) - (a.mode_b_time_ms || 0)) / (a.mode_b_time_ms || 1)) * 100)
            },
            tokens: {
                a: a.mode_b_token_count || 0,
                b: b.mode_b_token_count || 0,
                diff: ((b.mode_b_token_count || 0) - (a.mode_b_token_count || 0)),
                diffPercent: ((((b.mode_b_token_count || 0) - (a.mode_b_token_count || 0)) / (a.mode_b_token_count || 1)) * 100)
            },
            cpuSavings: {
                a: a.cpu_savings_percentage || 0,
                b: b.cpu_savings_percentage || 0,
                diff: ((b.cpu_savings_percentage || 0) - (a.cpu_savings_percentage || 0))
            },
            tokenSavings: {
                a: a.token_savings_percentage || 0,
                b: b.token_savings_percentage || 0,
                diff: ((b.token_savings_percentage || 0) - (a.token_savings_percentage || 0))
            },
            winner: {
                a: a.winner,
                b: b.winner
            },
            names: {
                a: a.scenario_name,
                b: b.scenario_name
            }
        };

        setComparison(comp);
    };

    const getDiffIndicator = (diff) => {
        if (Math.abs(diff) < 0.01) return { icon: Minus, color: 'text-slate-400', label: 'Identique' };
        if (diff > 0) return { icon: TrendingUp, color: 'text-green-400', label: '+' };
        return { icon: TrendingDown, color: 'text-red-400', label: '' };
    };

    const prepareRadarData = () => {
        if (!comparison) return [];
        
        return [
            {
                metric: 'SPG',
                A: (comparison.spg.a * 100).toFixed(1),
                B: (comparison.spg.b * 100).toFixed(1)
            },
            {
                metric: 'CPU Savings',
                A: comparison.cpuSavings.a.toFixed(1),
                B: comparison.cpuSavings.b.toFixed(1)
            },
            {
                metric: 'Token Savings',
                A: comparison.tokenSavings.a.toFixed(1),
                B: comparison.tokenSavings.b.toFixed(1)
            }
        ];
    };

    const prepareBarData = () => {
        if (!comparison) return [];
        
        return [
            {
                name: 'SPG',
                A: (comparison.spg.a * 100).toFixed(1),
                B: (comparison.spg.b * 100).toFixed(1)
            },
            {
                name: 'Temps (s)',
                A: (comparison.time.a / 1000).toFixed(1),
                B: (comparison.time.b / 1000).toFixed(1)
            },
            {
                name: 'Tokens (k)',
                A: (comparison.tokens.a / 1000).toFixed(1),
                B: (comparison.tokens.b / 1000).toFixed(1)
            }
        ];
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-400 flex items-center gap-2">
                        <GitCompare className="w-5 h-5" />
                        Comparaison Côte à Côte
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Test A</label>
                            <Select value={selectedA} onValueChange={setSelectedA}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-300">
                                    <SelectValue placeholder="Sélectionner test A..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {results.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.scenario_name} - SPG: {(r.global_score_performance || 0).toFixed(3)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Test B</label>
                            <Select value={selectedB} onValueChange={setSelectedB}>
                                <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-300">
                                    <SelectValue placeholder="Sélectionner test B..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {results.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.scenario_name} - SPG: {(r.global_score_performance || 0).toFixed(3)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {comparison && (
                        <>
                            {/* Key Metrics Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                {/* SPG */}
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-500 mb-2">Score de Performance Global</div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">A</div>
                                            <div className="text-xl font-bold text-blue-400">{(comparison.spg.a * 100).toFixed(1)}</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">B</div>
                                            <div className="text-xl font-bold text-green-400">{(comparison.spg.b * 100).toFixed(1)}</div>
                                        </div>
                                    </div>
                                    <div className={`text-center text-sm ${getDiffIndicator(comparison.spg.diff).color}`}>
                                        {comparison.spg.diffPercent > 0 ? '+' : ''}{comparison.spg.diffPercent.toFixed(1)}%
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-500 mb-2">Temps d'Exécution</div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">A</div>
                                            <div className="text-xl font-bold text-blue-400">{comparison.time.a}ms</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">B</div>
                                            <div className="text-xl font-bold text-green-400">{comparison.time.b}ms</div>
                                        </div>
                                    </div>
                                    <div className={`text-center text-sm ${getDiffIndicator(-comparison.time.diff).color}`}>
                                        {comparison.time.diff > 0 ? '+' : ''}{comparison.time.diff.toFixed(0)}ms
                                    </div>
                                </div>

                                {/* Tokens */}
                                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
                                    <div className="text-xs text-slate-500 mb-2">Tokens Utilisés</div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">A</div>
                                            <div className="text-xl font-bold text-blue-400">{comparison.tokens.a}</div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                        <div className="text-center">
                                            <div className="text-sm text-slate-400">B</div>
                                            <div className="text-xl font-bold text-green-400">{comparison.tokens.b}</div>
                                        </div>
                                    </div>
                                    <div className={`text-center text-sm ${getDiffIndicator(-comparison.tokens.diff).color}`}>
                                        {comparison.tokens.diff > 0 ? '+' : ''}{comparison.tokens.diff.toFixed(0)}
                                    </div>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <Card className="bg-slate-900 border-slate-700">
                                    <CardContent className="p-4">
                                        <h4 className="text-sm font-semibold text-slate-300 mb-4">Comparaison Barres</h4>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={prepareBarData()}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1e293b',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="A" fill="#3b82f6" />
                                                <Bar dataKey="B" fill="#10b981" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900 border-slate-700">
                                    <CardContent className="p-4">
                                        <h4 className="text-sm font-semibold text-slate-300 mb-4">Radar Comparatif</h4>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <RadarChart data={prepareRadarData()}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                                                <PolarRadiusAxis stroke="#94a3b8" />
                                                <Radar name="A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                                <Radar name="B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                                <Legend />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Winner Analysis */}
                            <Card className="bg-slate-900 border-slate-700">
                                <CardContent className="p-4">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Analyse des Gagnants</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-800 rounded">
                                            <div className="text-xs text-slate-500 mb-1">Test A</div>
                                            <Badge className={
                                                comparison.winner.a === 'mode_b' ? 'bg-green-600' :
                                                comparison.winner.a === 'mode_a' ? 'bg-orange-600' : 'bg-slate-600'
                                            }>
                                                {comparison.winner.a}
                                            </Badge>
                                        </div>
                                        <div className="p-3 bg-slate-800 rounded">
                                            <div className="text-xs text-slate-500 mb-1">Test B</div>
                                            <Badge className={
                                                comparison.winner.b === 'mode_b' ? 'bg-green-600' :
                                                comparison.winner.b === 'mode_a' ? 'bg-orange-600' : 'bg-slate-600'
                                            }>
                                                {comparison.winner.b}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}