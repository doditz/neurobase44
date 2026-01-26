import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart3,
    TrendingUp,
    AlertTriangle,
    Sparkles,
    Loader2,
    RefreshCw,
    Target,
    Activity,
    Eye,
    LineChart
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
    Line,
    BarChart as RechartsBar,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    ComposedChart
} from 'recharts';
import ExportAllButton from '@/components/benchmark/ExportAllButton';
import UnifiedLogDisplay from '@/components/core/UnifiedLogDisplay';

const GROUP_BY_OPTIONS = [
    { value: 'scenario_category', label: 'Catégorie de Scénario' },
    { value: 'winner', label: 'Gagnant (Mode A/B)' },
    { value: 'persona_usage', label: 'Nombre de Personas' },
    { value: 'spg_range', label: 'Plage de SPG' },
    { value: 'debate_rounds', label: 'Rondes de Débat' }
];

const CHART_METRICS = [
    { value: 'avg_spg', label: 'SPG Moyen', color: '#10b981' },
    { value: 'pass_rate', label: 'Taux de Réussite', color: '#3b82f6' },
    { value: 'avg_cpu_savings', label: 'Économie CPU', color: '#a855f7' },
    { value: 'avg_token_savings', label: 'Économie Tokens', color: '#f59e0b' }
];

export default function BenchmarkAnalyticsPage() {
    const [user, setUser] = useState(null);
    const [analyticsReport, setAnalyticsReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedGroupBy, setSelectedGroupBy] = useState(['scenario_category', 'winner']);
    const [lookbackDays, setLookbackDays] = useState(30);
    const [expandedGroups, setExpandedGroups] = useState({});
    
    // Chart states
    const [selectedChartMetric, setSelectedChartMetric] = useState('avg_spg');
    const [chartGroupBy, setChartGroupBy] = useState('scenario_category');
    const [showTimeSeriesChart, setShowTimeSeriesChart] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadResults(); // Renamed runAnalytics to loadResults
        }
    }, [user]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadResults = async () => {
        setIsLoading(true);
        try {
            toast.info('🔍 Analyse des benchmarks en cours...');
            
            const { data } = await base44.functions.invoke('benchmarkAnalytics', {
                group_by: selectedGroupBy,
                lookback_days: lookbackDays,
                min_samples_per_group: 3,
                outlier_threshold_z_score: 2.0,
                include_trend_analysis: true
            });

            if (data && data.success) {
                setAnalyticsReport(data.analytics_report);
                toast.success(`✅ Analyse terminée: ${data.analytics_report.total_benchmarks} benchmarks analysés`);
            } else {
                if (data?.error && data.error.includes('Insufficient data')) {
                    setAnalyticsReport(null);
                    toast.info('Aucun test disponible. Lancez des tests d\'efficacité pour commencer!');
                } else {
                    throw new Error(data?.error || 'Analytics failed');
                }
            }
        } catch (error) {
            console.error('Analytics error:', error);
            if (error.message.includes('Insufficient data')) {
                setAnalyticsReport(null);
                toast.info('Aucun test disponible. Lancez des tests d\'efficacité pour commencer!');
            } else {
                toast.error(`Erreur: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleGroupExpansion = (criterion, groupKey) => {
        const key = `${criterion}:${groupKey}`;
        setExpandedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // The original exportReport function is no longer used directly by a button, but kept in case it's called elsewhere or for future use.
    const exportReport = () => {
        if (!analyticsReport) return;
        
        const blob = new Blob([JSON.stringify(analyticsReport, null, 2)], { 
            type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `benchmark-analytics-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.success('📥 Rapport analytique exporté');
    };

    const prepareTimeSeriesData = () => {
        if (!analyticsReport?.trends?.weekly) return [];
        
        return analyticsReport.trends.weekly.data.map(week => ({
            week: week.week,
            'SPG Moyen': (week.avg_spg * 100).toFixed(1),
            'Taux Réussite': (week.pass_rate * 100).toFixed(1),
            'Nombre Tests': week.count
        }));
    };

    const prepareGroupedChartData = () => {
        if (!analyticsReport?.groups?.[chartGroupBy]) return [];
        
        const groups = analyticsReport.groups[chartGroupBy];
        return Object.entries(groups)
            .sort((a, b) => b[1].avg_spg - a[1].avg_spg)
            .map(([key, stats]) => ({
                name: key,
                'SPG Moyen': (stats.avg_spg * 100).toFixed(1),
                'Pass Rate': (stats.pass_rate * 100).toFixed(1),
                'CPU Savings': stats.avg_cpu_savings.toFixed(1),
                'Token Savings': stats.avg_token_savings.toFixed(1),
                'Échantillons': stats.sample_count
            }));
    };

    const prepareComparisonData = () => {
        if (!analyticsReport?.groups?.winner) return [];
        
        const modeA = analyticsReport.groups.winner['mode_a'];
        const modeB = analyticsReport.groups.winner['mode_b'];
        
        if (!modeA || !modeB) return [];
        
        return [
            {
                mode: 'Mode A (Baseline)',
                'SPG': (modeA.avg_spg * 100).toFixed(1),
                'CPU Time': modeA.avg_time_ms.toFixed(0),
                'Tokens': modeA.sample_count > 0 ? (modeA.avg_token_savings || 0).toFixed(0) : 0, // Changed from avg_cpu_savings to avg_token_savings based on context, check if this is correct
                'Tests': modeA.sample_count
            },
            {
                mode: 'Mode B (Neuronas)',
                'SPG': (modeB.avg_spg * 100).toFixed(1),
                'CPU Time': modeB.avg_time_ms.toFixed(0),
                'Tokens': modeB.sample_count > 0 ? (modeB.avg_token_savings || 0).toFixed(0) : 0, // Changed from avg_cpu_savings to avg_token_savings based on context, check if this is correct
                'Tests': modeB.sample_count
            }
        ];
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <BarChart3 className="w-8 h-8" />
                            Analytics des Tests d'Efficacité
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Analyse approfondie de {analyticsReport?.total_benchmarks || 0} tests • Sweet Spot: Qualité ≥0.85 ET Économies ≥40%
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadResults}
                            disabled={isLoading}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </Button>
                        <ExportAllButton limit={500} />
                    </div>
                </div>

                {/* Config */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Configuration de l'Analyse</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Grouper par (multiple)</label>
                                <div className="space-y-2">
                                    {GROUP_BY_OPTIONS.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupBy.includes(opt.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedGroupBy([...selectedGroupBy, opt.value]);
                                                    } else {
                                                        setSelectedGroupBy(selectedGroupBy.filter(v => v !== opt.value));
                                                    }
                                                }}
                                                className="w-4 h-4"
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Période d'analyse</label>
                                <Select value={String(lookbackDays)} onValueChange={(v) => setLookbackDays(Number(v))}>
                                    <SelectTrigger className="w-full bg-slate-900 border-slate-600 text-slate-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 derniers jours</SelectItem>
                                        <SelectItem value="14">14 derniers jours</SelectItem>
                                        <SelectItem value="30">30 derniers jours</SelectItem>
                                        <SelectItem value="60">60 derniers jours</SelectItem>
                                        <SelectItem value="90">90 derniers jours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overall Stats */}
                {analyticsReport && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Benchmarks Analysés</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {analyticsReport.total_benchmarks}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {analyticsReport.period_days} jours
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">SPG Moyen</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {analyticsReport.overall_stats.mean_spg.toFixed(3)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    σ = {analyticsReport.overall_stats.std_dev_spg.toFixed(3)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Outliers Détectés</div>
                                <div className="text-2xl font-bold text-orange-400">
                                    {analyticsReport.outliers.length}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {analyticsReport.overall_stats.outliers_percentage}% du total
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Insights Générés</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {analyticsReport.insights.length}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {analyticsReport.recommendations.length} recommandations
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Interactive Charts Section */}
                {analyticsReport && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <LineChart className="w-5 h-5" />
                                    Visualisations Interactives
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant={showTimeSeriesChart ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowTimeSeriesChart(true)}
                                        className={showTimeSeriesChart ? 'bg-green-600' : 'border-slate-600 text-slate-300 hover:text-green-400'}
                                    >
                                        Séries Temporelles
                                    </Button>
                                    <Button
                                        variant={!showTimeSeriesChart ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowTimeSeriesChart(false)}
                                        className={!showTimeSeriesChart ? 'bg-green-600' : 'border-slate-600 text-slate-300 hover:text-green-400'}
                                    >
                                        Comparaisons
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {showTimeSeriesChart ? (
                                <>
                                    {/* Time Series Chart */}
                                    {analyticsReport.trends?.weekly && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-300 mb-4">
                                                Évolution Temporelle (Hebdomadaire)
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <AreaChart data={prepareTimeSeriesData()}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis 
                                                        dataKey="week" 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                    <YAxis 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{
                                                            backgroundColor: '#1e293b',
                                                            border: '1px solid #334155',
                                                            borderRadius: '8px',
                                                            color: '#e2e8f0'
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="SPG Moyen"
                                                        stroke="#10b981"
                                                        fill="#10b981"
                                                        fillOpacity={0.3}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="Taux Réussite"
                                                        stroke="#3b82f6"
                                                        fill="#3b82f6"
                                                        fillOpacity={0.3}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                            
                                            {/* Trend Indicators */}
                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                    <div className="text-xs text-slate-400 mb-1">Tendance SPG</div>
                                                    <div className={`text-lg font-bold flex items-center gap-2 ${
                                                        analyticsReport.trends.weekly.spg_trend_percentage > 0 
                                                            ? 'text-green-400' 
                                                            : 'text-red-400'
                                                    }`}>
                                                        <TrendingUp className={`w-4 h-4 ${
                                                            analyticsReport.trends.weekly.spg_trend_percentage < 0 
                                                                ? 'rotate-180' 
                                                                : ''
                                                        }`} />
                                                        {analyticsReport.trends.weekly.spg_trend_percentage > 0 ? '+' : ''}
                                                        {analyticsReport.trends.weekly.spg_trend_percentage.toFixed(1)}%
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                    <div className="text-xs text-slate-400 mb-1">Tendance Pass Rate</div>
                                                    <div className={`text-lg font-bold flex items-center gap-2 ${
                                                        analyticsReport.trends.weekly.pass_rate_trend_percentage > 0 
                                                            ? 'text-green-400' 
                                                            : 'text-red-400'
                                                    }`}>
                                                        <TrendingUp className={`w-4 h-4 ${
                                                            analyticsReport.trends.weekly.pass_rate_trend_percentage < 0 
                                                                ? 'rotate-180' 
                                                                : ''
                                                        }`} />
                                                        {analyticsReport.trends.weekly.pass_rate_trend_percentage > 0 ? '+' : ''}
                                                        {analyticsReport.trends.weekly.pass_rate_trend_percentage.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Grouped Comparison Charts */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-slate-400">Grouper par:</label>
                                            <Select value={chartGroupBy} onValueChange={setChartGroupBy}>
                                                <SelectTrigger className="w-48 bg-slate-900 border-slate-600 text-slate-300">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {GROUP_BY_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* SPG Comparison Bar Chart */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-300 mb-4">
                                                Comparaison SPG par Groupe
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <RechartsBar data={prepareGroupedChartData()}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                        angle={-45}
                                                        textAnchor="end"
                                                        height={80}
                                                    />
                                                    <YAxis 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{
                                                            backgroundColor: '#1e293b',
                                                            border: '1px solid #334155',
                                                            borderRadius: '8px',
                                                            color: '#e2e8f0'
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="SPG Moyen" fill="#10b981" />
                                                    <Bar dataKey="Pass Rate" fill="#3b82f6" />
                                                </RechartsBar>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Resource Efficiency Chart */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-300 mb-4">
                                                Économies Ressources par Groupe
                                            </h3>
                                            <ResponsiveContainer width="100%" height={300}>
                                                <RechartsBar data={prepareGroupedChartData()}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                        angle={-45}
                                                        textAnchor="end"
                                                        height={80}
                                                    />
                                                    <YAxis 
                                                        stroke="#94a3b8"
                                                        style={{ fontSize: '12px' }}
                                                    />
                                                    <RechartsTooltip
                                                        contentStyle={{
                                                            backgroundColor: '#1e293b',
                                                            border: '1px solid #334155',
                                                            borderRadius: '8px',
                                                            color: '#e2e8f0'
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="CPU Savings" fill="#a855f7" />
                                                    <Bar dataKey="Token Savings" fill="#f59e0b" />
                                                </RechartsBar>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Mode A vs Mode B Comparison */}
                                        {analyticsReport?.groups?.winner && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-300 mb-4">
                                                    Comparaison Mode A vs Mode B
                                                </h3>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <ComposedChart data={prepareComparisonData()}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                        <XAxis 
                                                            dataKey="mode" 
                                                            stroke="#94a3b8"
                                                            style={{ fontSize: '12px' }}
                                                        />
                                                        <YAxis 
                                                            yAxisId="left"
                                                            stroke="#94a3b8"
                                                            style={{ fontSize: '12px' }}
                                                            label={{ value: 'SPG (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                                                        />
                                                        <YAxis 
                                                            yAxisId="right"
                                                            orientation="right"
                                                            stroke="#94a3b8"
                                                            style={{ fontSize: '12px' }}
                                                            label={{ value: 'CPU Time (ms)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                                                        />
                                                        <RechartsTooltip
                                                            contentStyle={{
                                                                backgroundColor: '#1e293b',
                                                                border: '1px solid #334155',
                                                                borderRadius: '8px',
                                                                color: '#e2e8f0'
                                                            }}
                                                        />
                                                        <Legend />
                                                        <Bar yAxisId="left" dataKey="SPG" fill="#10b981" />
                                                        <Line yAxisId="right" type="monotone" dataKey="CPU Time" stroke="#f59e0b" strokeWidth={2} />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Insights */}
                {analyticsReport?.insights && analyticsReport.insights.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Insights Automatiques
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analyticsReport.insights.map((insight, idx) => (
                                <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-blue-600/30">
                                    <div className="flex items-start gap-3">
                                        <Target className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <Badge className="bg-blue-600 mb-2">{insight.type}</Badge>
                                            <p className="text-slate-300">{insight.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Recommendations */}
                {analyticsReport?.recommendations && analyticsReport.recommendations.length > 0 && (
                    <Card className="bg-orange-900/20 border-orange-600">
                        <CardHeader>
                            <CardTitle className="text-orange-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Recommandations ({analyticsReport.recommendations.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analyticsReport.recommendations.map((rec, idx) => (
                                <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-orange-600/30">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={
                                                    rec.priority === 'critical' ? 'bg-red-600' :
                                                    rec.priority === 'high' ? 'bg-orange-600' :
                                                    rec.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                                                }>
                                                    {rec.priority}
                                                </Badge>
                                                <Badge variant="outline">{rec.category}</Badge>
                                            </div>
                                            <p className="text-slate-300 font-semibold mb-1">{rec.message}</p>
                                            <p className="text-sm text-slate-400">→ {rec.action}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Grouped Analysis */}
                {analyticsReport?.groups && Object.keys(analyticsReport.groups).map(criterion => (
                    <Card key={criterion} className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Analyse par {GROUP_BY_OPTIONS.find(o => o.value === criterion)?.label || criterion}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {Object.entries(analyticsReport.groups[criterion])
                                    .sort((a, b) => b[1].avg_spg - a[1].avg_spg)
                                    .map(([groupKey, stats]) => {
                                        const expandKey = `${criterion}:${groupKey}`;
                                        const isExpanded = expandedGroups[expandKey];
                                        
                                        return (
                                            <div key={groupKey} className="bg-slate-900 rounded-lg border border-slate-700">
                                                <button
                                                    onClick={() => toggleGroupExpansion(criterion, groupKey)}
                                                    className="w-full p-4 text-left hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <Badge className="bg-green-600 text-lg">{groupKey}</Badge>
                                                            <span className="text-sm text-slate-400">
                                                                {stats.sample_count} tests ({stats.percentage_of_total}%)
                                                            </span>
                                                        </div>
                                                        <Eye className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <div className="text-xs text-slate-500">SPG Moyen</div>
                                                            <div className="text-lg font-bold text-green-400">
                                                                {stats.avg_spg.toFixed(3)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500">Pass Rate</div>
                                                            <div className="text-lg font-bold text-blue-400">
                                                                {(stats.pass_rate * 100).toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500">Économie CPU</div>
                                                            <div className="text-lg font-bold text-purple-400">
                                                                {stats.avg_cpu_savings.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500">Économie Tokens</div>
                                                            <div className="text-lg font-bold text-orange-400">
                                                                {stats.avg_token_savings.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-2 border-t border-slate-700 space-y-2">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-slate-500">Médiane SPG</div>
                                                                <div className="text-green-400 font-semibold">{stats.median_spg.toFixed(3)}</div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-slate-500">Min - Max SPG</div>
                                                                <div className="text-slate-300 font-semibold">
                                                                    {stats.min_spg.toFixed(3)} - {stats.max_spg.toFixed(3)}
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-slate-500">Écart-Type</div>
                                                                <div className="text-yellow-400 font-semibold">{stats.std_dev_spg.toFixed(3)}</div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-slate-500">Temps Moyen</div>
                                                                <div className="text-blue-400 font-semibold">{stats.avg_time_ms.toFixed(0)}ms</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                                                            <span>✅ Passés: {stats.total_passed}</span>
                                                            <span>❌ Échecs: {stats.total_failed}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Outliers */}
                {analyticsReport?.outliers && analyticsReport.outliers.length > 0 && (
                    <Card className="bg-red-900/20 border-red-600">
                        <CardHeader>
                            <CardTitle className="text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Outliers Détectés ({analyticsReport.outliers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {analyticsReport.outliers.map((outlier, idx) => (
                                    <div 
                                        key={idx}
                                        className={`p-3 rounded-lg border ${
                                            outlier.type === 'poor_performance' 
                                                ? 'bg-red-900/30 border-red-600/50' 
                                                : 'bg-green-900/30 border-green-600/50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={
                                                        outlier.type === 'poor_performance' 
                                                            ? 'bg-red-600' 
                                                            : 'bg-green-600'
                                                    }>
                                                        {outlier.type === 'poor_performance' ? '⚠️ Sous-Performance' : '🏆 Exceptionnel'}
                                                    </Badge>
                                                    <span className="text-sm text-slate-300">{outlier.scenario_name}</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3 text-xs mt-2">
                                                    <div>
                                                        <span className="text-slate-500">SPG: </span>
                                                        <span className={outlier.type === 'poor_performance' ? 'text-red-400' : 'text-green-400'}>
                                                            {outlier.spg.toFixed(3)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Z-Score: </span>
                                                        <span className="text-orange-400">{outlier.z_score.toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Personas: </span>
                                                        <span className="text-slate-300">{outlier.details.personas_used}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">Winner: </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {outlier.details.winner}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link 
                                                to={`${createPageUrl('Benchmark')}?view=${outlier.benchmark_id}`}
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <Eye className="w-3 h-3" />
                                                Voir
                                            </Link>
                                        </div>
                                        <p className="text-xs text-slate-400 italic">{outlier.investigation_notes}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Trends */}
                {analyticsReport?.trends?.weekly && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Tendances Temporelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <div className="text-xs text-slate-400">Direction</div>
                                        <Badge className={
                                            analyticsReport.trends.weekly.trend_direction === 'improving' ? 'bg-green-600' :
                                            analyticsReport.trends.weekly.trend_direction === 'declining' ? 'bg-red-600' :
                                            'bg-slate-600'
                                        }>
                                            {analyticsReport.trends.weekly.trend_direction}
                                        </Badge>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400">Évolution SPG</div>
                                        <div className={`text-lg font-bold ${
                                            analyticsReport.trends.weekly.spg_trend_percentage > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {analyticsReport.trends.weekly.spg_trend_percentage > 0 ? '+' : ''}
                                            {analyticsReport.trends.weekly.spg_trend_percentage.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400">Évolution Pass Rate</div>
                                        <div className={`text-lg font-bold ${
                                            analyticsReport.trends.weekly.pass_rate_trend_percentage > 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {analyticsReport.trends.weekly.pass_rate_trend_percentage > 0 ? '+' : ''}
                                            {analyticsReport.trends.weekly.pass_rate_trend_percentage.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Weekly chart */}
                                <div className="bg-slate-900 p-4 rounded-lg">
                                    <h4 className="text-sm text-slate-400 mb-3">SPG par Semaine</h4>
                                    <div className="space-y-2">
                                        {analyticsReport.trends.weekly.data.map((week, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-16 text-xs text-slate-500">{week.week}</div>
                                                <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden relative">
                                                    <div 
                                                        className="bg-green-600 h-full transition-all"
                                                        style={{ width: `${week.avg_spg * 100}%` }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center px-2 text-xs text-white font-semibold">
                                                        {week.avg_spg.toFixed(3)}
                                                    </div>
                                                </div>
                                                <div className="w-12 text-xs text-slate-400">{week.count} tests</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* No Data */}
                {!analyticsReport && !isLoading && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-400 mb-2">
                                Aucune Analyse Disponible
                            </h3>
                            <p className="text-slate-500 mb-6">
                                Cliquez sur le bouton Rafraîchir pour générer un rapport analytique complet
                            </p>
                            <Button
                                onClick={loadResults}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Lancer l'Analyse
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Unified Logs Section */}
                <UnifiedLogDisplay
                    title="Logs Unifiés - Benchmark Analytics"
                    sourceType="benchmark"
                    limit={50}
                    showFilters={true}
                    showSearch={true}
                    collapsible={true}
                    maxHeight="400px"
                />
            </div>
        </div>
    );
}