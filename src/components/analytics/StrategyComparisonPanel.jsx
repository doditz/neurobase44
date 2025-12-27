import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, ZAxis, Legend, ReferenceLine
} from 'recharts';
import { TrendingUp, BarChart3, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const METRIC_OPTIONS = [
    { value: 'spg', label: 'SPG Score', key: 'global_score_performance' },
    { value: 'latency', label: 'Latence (ms)', key: 'mode_b_time_ms' },
    { value: 'tokens', label: 'Tokens', key: 'mode_b_token_count' },
    { value: 'cpu_savings', label: 'CPU Savings %', key: 'cpu_savings_percentage' },
    { value: 'token_savings', label: 'Token Savings %', key: 'token_savings_percentage' },
    { value: 'improvement', label: 'Amélioration %', key: 'performance_improvement' }
];

const STRATEGY_COLORS = {
    'MinimalViableDebate': '#22c55e',
    'SweetSpotBalanced': '#3b82f6',
    'AdaptiveComplexityRouting': '#a855f7',
    'default': '#6366f1'
};

export default function StrategyComparisonPanel({ benchmarks, strategies }) {
    const [xMetric, setXMetric] = useState('spg');
    const [yMetric, setYMetric] = useState('latency');
    const [selectedStrategies, setSelectedStrategies] = useState(['all']);

    // Prepare scatter data
    const scatterData = useMemo(() => {
        if (!benchmarks?.length) return [];

        const xKey = METRIC_OPTIONS.find(m => m.value === xMetric)?.key;
        const yKey = METRIC_OPTIONS.find(m => m.value === yMetric)?.key;

        return benchmarks
            .filter(b => {
                if (selectedStrategies.includes('all')) return true;
                const strategy = b.spg_breakdown?.active_strategy || 'default';
                return selectedStrategies.includes(strategy);
            })
            .map(b => ({
                x: b[xKey] || 0,
                y: b[yKey] || 0,
                strategy: b.spg_breakdown?.active_strategy || 'default',
                name: b.scenario_name,
                winner: b.winner,
                date: format(new Date(b.created_date), 'dd MMM HH:mm', { locale: fr }),
                fill: STRATEGY_COLORS[b.spg_breakdown?.active_strategy] || STRATEGY_COLORS.default
            }));
    }, [benchmarks, xMetric, yMetric, selectedStrategies]);

    // Strategy statistics
    const strategyStats = useMemo(() => {
        if (!benchmarks?.length) return {};

        const stats = {};
        benchmarks.forEach(b => {
            const strategy = b.spg_breakdown?.active_strategy || 'default';
            if (!stats[strategy]) {
                stats[strategy] = {
                    count: 0,
                    totalSPG: 0,
                    totalLatency: 0,
                    totalTokens: 0,
                    wins: 0
                };
            }
            stats[strategy].count++;
            stats[strategy].totalSPG += b.global_score_performance || 0;
            stats[strategy].totalLatency += b.mode_b_time_ms || 0;
            stats[strategy].totalTokens += b.mode_b_token_count || 0;
            if (b.winner === 'mode_b') stats[strategy].wins++;
        });

        return Object.entries(stats).map(([name, data]) => ({
            name,
            avgSPG: (data.totalSPG / data.count).toFixed(3),
            avgLatency: Math.round(data.totalLatency / data.count),
            avgTokens: Math.round(data.totalTokens / data.count),
            winRate: ((data.wins / data.count) * 100).toFixed(1),
            count: data.count,
            color: STRATEGY_COLORS[name] || STRATEGY_COLORS.default
        }));
    }, [benchmarks]);

    const generateReport = () => {
        const report = {
            generated_at: new Date().toISOString(),
            period: 'Custom',
            strategies_analyzed: strategyStats.length,
            total_benchmarks: benchmarks.length,
            strategy_performance: strategyStats,
            correlation_metrics: {
                x_axis: xMetric,
                y_axis: yMetric,
                data_points: scatterData.length
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Analyse Corrélation Métriques
                        </CardTitle>
                        <Button onClick={generateReport} size="sm" variant="outline" className="border-green-600 text-green-400">
                            <Download className="w-3 h-3 mr-1" />
                            Rapport
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Axe X:</span>
                            <Select value={xMetric} onValueChange={setXMetric}>
                                <SelectTrigger className="w-36 h-8 bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {METRIC_OPTIONS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Axe Y:</span>
                            <Select value={yMetric} onValueChange={setYMetric}>
                                <SelectTrigger className="w-36 h-8 bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {METRIC_OPTIONS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Scatter Plot */}
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={350}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis 
                                type="number" 
                                dataKey="x" 
                                name={METRIC_OPTIONS.find(m => m.value === xMetric)?.label}
                                stroke="#64748b"
                                fontSize={11}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="y" 
                                name={METRIC_OPTIONS.find(m => m.value === yMetric)?.label}
                                stroke="#64748b"
                                fontSize={11}
                            />
                            <ZAxis range={[60, 200]} />
                            <Tooltip 
                                cursor={{ strokeDasharray: '3 3' }}
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                            />
                            <Legend />
                            {Object.keys(STRATEGY_COLORS).map(strategy => (
                                <Scatter 
                                    key={strategy}
                                    name={strategy}
                                    data={scatterData.filter(d => d.strategy === strategy)}
                                    fill={STRATEGY_COLORS[strategy]}
                                />
                            ))}
                        </ScatterChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Strategy Stats Table */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Comparaison Stratégies
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 text-slate-400">Stratégie</th>
                                    <th className="text-right py-2 text-slate-400">Tests</th>
                                    <th className="text-right py-2 text-slate-400">SPG Moy.</th>
                                    <th className="text-right py-2 text-slate-400">Latence</th>
                                    <th className="text-right py-2 text-slate-400">Tokens</th>
                                    <th className="text-right py-2 text-slate-400">Win Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {strategyStats.map(stat => (
                                    <tr key={stat.name} className="border-b border-slate-700/50">
                                        <td className="py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                                                <span className="text-green-300 text-xs">{stat.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-right text-slate-300">{stat.count}</td>
                                        <td className="text-right text-green-400 font-medium">{stat.avgSPG}</td>
                                        <td className="text-right text-blue-400">{stat.avgLatency}ms</td>
                                        <td className="text-right text-purple-400">{stat.avgTokens}</td>
                                        <td className="text-right">
                                            <Badge className={parseFloat(stat.winRate) > 50 ? 'bg-green-600' : 'bg-orange-600'}>
                                                {stat.winRate}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}