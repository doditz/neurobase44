import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { TrendingUp, Target, Zap, Clock, Star, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const COLORS = {
    spg: '#10b981',
    quality: '#ec4899',
    efficiency: '#f59e0b',
    tokens: '#6366f1',
    latency: '#06b6d4'
};

export default function OptimizationHistoryChart({ results, showIterations = false, showPinnedComparison = true }) {
    const [pinnedResults, setPinnedResults] = useState([]);
    const [showPinned, setShowPinned] = useState(false);
    const [loadingPinned, setLoadingPinned] = useState(false);

    useEffect(() => {
        if (showPinnedComparison) {
            loadPinnedResults();
        }
    }, [showPinnedComparison]);

    const loadPinnedResults = async () => {
        setLoadingPinned(true);
        try {
            const { data } = await base44.functions.invoke('unifiedLogManager', {
                action: 'get_pinned'
            });
            if (data.success) {
                setPinnedResults(data.pinned.map(p => ({
                    name: p.pin_label || p.log_id,
                    spg: p.metrics?.spg || 0,
                    quality: p.metrics?.quality || 0,
                    efficiency: (p.metrics?.efficiency || 0) * 100,
                    tokens: p.metrics?.tokens || 0,
                    isPinned: true
                })));
            }
        } catch (e) {
            console.error('Load pinned error:', e);
        } finally {
            setLoadingPinned(false);
        }
    };

    const chartData = useMemo(() => {
        if (!results?.length) return [];

        return results.map((r, idx) => ({
            index: idx + 1,
            name: showIterations ? `Iter ${idx + 1}` : format(new Date(r.created_date), 'dd/MM HH:mm', { locale: fr }),
            spg: r.global_score_performance || r.best_spg || 0,
            quality: r.quality_scores?.mode_b_ars_score || r.best_metrics?.quality || 0,
            efficiency: r.token_savings_percentage || (r.best_metrics?.efficiency * 100) || 0,
            tokens: r.mode_b_token_count || r.best_metrics?.tokens || 0,
            latency: r.mode_b_time_ms || 0,
            winner: r.winner,
            passed: r.passed,
            isPinned: false
        }));
    }, [results, showIterations]);

    const combinedData = useMemo(() => {
        if (!showPinned || pinnedResults.length === 0) return chartData;
        // Add pinned results as reference lines data
        return chartData;
    }, [chartData, pinnedResults, showPinned]);

    const stats = useMemo(() => {
        if (!chartData.length) return null;

        const spgValues = chartData.map(d => d.spg);
        const qualityValues = chartData.map(d => d.quality);
        const efficiencyValues = chartData.map(d => d.efficiency);

        return {
            avgSPG: (spgValues.reduce((a, b) => a + b, 0) / spgValues.length).toFixed(3),
            maxSPG: Math.max(...spgValues).toFixed(3),
            avgQuality: (qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length).toFixed(3),
            avgEfficiency: (efficiencyValues.reduce((a, b) => a + b, 0) / efficiencyValues.length).toFixed(1),
            trend: spgValues.length > 1 && spgValues[spgValues.length - 1] > spgValues[0] ? 'up' : 'down'
        };
    }, [chartData]);

    if (!chartData.length) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune donnée d'historique disponible</p>
                </CardContent>
            </Card>
        );
    }

    // Calculate pinned averages for reference lines
    const pinnedAvgSPG = pinnedResults.length > 0 
        ? pinnedResults.reduce((s, p) => s + p.spg, 0) / pinnedResults.length 
        : null;

    return (
        <div className="space-y-4">
            {/* Pinned Toggle */}
            {showPinnedComparison && pinnedResults.length > 0 && (
                <Card className="bg-slate-800 border-yellow-600/50">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-slate-300">{pinnedResults.length} résultat(s) épinglé(s)</span>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={showPinned}
                                        onCheckedChange={setShowPinned}
                                        className="border-yellow-500"
                                    />
                                    <span className="text-xs text-slate-400">Afficher lignes référence</span>
                                </div>
                            </div>
                            <Button onClick={loadPinnedResults} variant="ghost" size="sm" className="text-yellow-400">
                                <RefreshCw className={`w-3 h-3 ${loadingPinned ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        {showPinned && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                                {pinnedResults.map((p, i) => (
                                    <Badge key={i} className="bg-yellow-900/30 text-yellow-400 text-xs">
                                        {p.name}: SPG {p.spg.toFixed(3)}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-slate-800 border-green-600/50">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-slate-400">SPG Moy.</span>
                            </div>
                            <p className="text-xl font-bold text-green-400">{stats.avgSPG}</p>
                            <p className="text-xs text-slate-500">Max: {stats.maxSPG}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-pink-600/50">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-slate-400">Qualité Moy.</span>
                            </div>
                            <p className="text-xl font-bold text-pink-400">{stats.avgQuality}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-orange-600/50">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-orange-400" />
                                <span className="text-xs text-slate-400">Efficacité Moy.</span>
                            </div>
                            <p className="text-xl font-bold text-orange-400">{stats.avgEfficiency}%</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-blue-600/50">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-slate-400">Tendance</span>
                            </div>
                            <Badge className={stats.trend === 'up' ? 'bg-green-600' : 'bg-orange-600'}>
                                {stats.trend === 'up' ? '↑ Amélioration' : '↓ Baisse'}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Chart - SPG & Quality */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-green-300 text-sm">Évolution SPG & Qualité</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="spgGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.spg} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={COLORS.spg} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis yAxisId="left" stroke="#64748b" fontSize={10} domain={[0, 1]} />
                            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                            />
                            <Legend />
                            <ReferenceLine yAxisId="left" y={0.7} stroke="#f59e0b" strokeDasharray="5 5" label="Target" />
                            {showPinned && pinnedAvgSPG && (
                                <ReferenceLine yAxisId="left" y={pinnedAvgSPG} stroke="#eab308" strokeWidth={2} label={`Pinned: ${pinnedAvgSPG.toFixed(3)}`} />
                            )}
                            <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="spg" 
                                name="SPG"
                                stroke={COLORS.spg} 
                                fill="url(#spgGrad)"
                                strokeWidth={2}
                            />
                            <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="quality" 
                                name="Qualité"
                                stroke={COLORS.quality}
                                strokeWidth={2}
                                dot={{ fill: COLORS.quality, r: 3 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Secondary Chart - Efficiency & Tokens */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-green-300 text-sm">Efficacité & Consommation Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis yAxisId="left" stroke="#64748b" fontSize={10} />
                            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                            />
                            <Legend />
                            <Bar 
                                yAxisId="right"
                                dataKey="tokens" 
                                name="Tokens"
                                fill={COLORS.tokens}
                                opacity={0.6}
                            />
                            <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="efficiency" 
                                name="Efficacité %"
                                stroke={COLORS.efficiency}
                                strokeWidth={2}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}