import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    BarChart3, TrendingUp, TrendingDown, Zap, Clock, Coins, 
    Target, RefreshCw, Loader2, Filter, Calendar, Sparkles,
    CheckCircle2, AlertCircle, Activity, Layers, Brain, Bell
} from 'lucide-react';
import AlertConfigPanel from '@/components/alerts/AlertConfigPanel';
import AlertNotificationBanner from '@/components/alerts/AlertNotificationBanner';
import StrategyComparisonPanel from '@/components/analytics/StrategyComparisonPanel';
import PerformanceReportGenerator from '@/components/analytics/PerformanceReportGenerator';
import UnifiedLogTable from '@/components/logs/UnifiedLogTable.js';
import LogBasedAlertSystem from '@/components/logs/LogBasedAlertSystem.js';
import VersionComparisonPanel from '@/components/versions/VersionComparisonPanel';

import { toast } from 'sonner';
import { 
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = {
    primary: '#10b981',
    secondary: '#6366f1',
    accent: '#f59e0b',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
    purple: '#a855f7',
    pink: '#ec4899',
    cyan: '#06b6d4'
};

const STRATEGY_COLORS = {
    'MinimalViableDebate': COLORS.success,
    'SweetSpotBalanced': COLORS.info,
    'AdaptiveComplexityRouting': COLORS.purple,
    'compression': COLORS.accent,
    'batch_processing': COLORS.cyan,
    'model_cascading': COLORS.pink,
    'default': COLORS.secondary
};

const DATE_RANGES = [
    { value: '24h', label: 'Dernières 24h', filter: () => subDays(new Date(), 1) },
    { value: '7d', label: '7 jours', filter: () => subDays(new Date(), 7) },
    { value: '30d', label: '30 jours', filter: () => subMonths(new Date(), 1) },
    { value: '90d', label: '90 jours', filter: () => subMonths(new Date(), 3) },
    { value: 'all', label: 'Tout', filter: () => new Date(0) }
];

export default function OptimizationMetricsDashboard() {
    const [loading, setLoading] = useState(true);
    const [benchmarks, setBenchmarks] = useState([]);
    const [strategies, setStrategies] = useState([]);
    const [tunableParams, setTunableParams] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [alertThresholds, setAlertThresholds] = useState([]);
    const [showAlertConfig, setShowAlertConfig] = useState(false);
    
    // Filters
    const [dateRange, setDateRange] = useState('7d');
    const [strategyFilter, setStrategyFilter] = useState('all');
    const [confidenceFilter, setConfidenceFilter] = useState('all');
    
    // Computed metrics
    const [aggregatedMetrics, setAggregatedMetrics] = useState(null);

    useEffect(() => {
        loadAllData();
        loadAlerts();
        
        // Poll for alerts every 30 seconds
        const alertInterval = setInterval(loadAlerts, 30000);
        return () => clearInterval(alertInterval);
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [benchmarkData, devTestData, strategyData, paramData] = await Promise.all([
                base44.entities.BenchmarkResult.list('-created_date', 500),
                base44.entities.DevTestResult.list('-created_date', 500),
                base44.entities.OptimizationStrategy.list(),
                base44.entities.TunableParameter.list()
            ]);
            
            // Combine benchmark and devtest results
            const allBenchmarks = [...benchmarkData, ...devTestData].sort(
                (a, b) => new Date(b.created_date) - new Date(a.created_date)
            );
            
            setBenchmarks(allBenchmarks);
            setStrategies(strategyData);
            setTunableParams(paramData);
            
            // Check alerts for latest benchmarks
            if (allBenchmarks.length > 0) {
                checkAlertsForBenchmarks(allBenchmarks.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAlerts = async () => {
        try {
            const alerts = await base44.entities.AlertHistory.filter(
                { acknowledged: false },
                '-created_date',
                10
            );
            setActiveAlerts(alerts);
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    };

    const checkAlertsForBenchmarks = async (recentBenchmarks) => {
        try {
            for (const benchmark of recentBenchmarks) {
                const { data } = await base44.functions.invoke('alertingEngine', {
                    action: 'check_benchmark',
                    benchmark_result: benchmark
                });
                
                if (data?.alerts_triggered > 0) {
                    data.alerts.forEach(alert => {
                        toast.warning(alert.message, {
                            duration: 10000,
                            icon: '🚨'
                        });
                    });
                    loadAlerts();
                }
            }
        } catch (error) {
            console.error('Alert check failed:', error);
        }
    };

    const handleAlertAcknowledge = (alertId) => {
        setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    // Filter benchmarks based on selected filters
    const filteredBenchmarks = useMemo(() => {
        const dateFilter = DATE_RANGES.find(r => r.value === dateRange)?.filter() || new Date(0);
        
        return benchmarks.filter(b => {
            // Date filter
            if (!isAfter(new Date(b.created_date), dateFilter)) return false;
            
            // Strategy filter
            if (strategyFilter !== 'all') {
                const strategy = b.spg_breakdown?.active_strategy || 'default';
                if (strategy !== strategyFilter) return false;
            }
            
            // Confidence filter
            if (confidenceFilter !== 'all') {
                const spg = b.global_score_performance || 0;
                if (confidenceFilter === 'high' && spg < 0.8) return false;
                if (confidenceFilter === 'medium' && (spg < 0.5 || spg >= 0.8)) return false;
                if (confidenceFilter === 'low' && spg >= 0.5) return false;
            }
            
            return true;
        });
    }, [benchmarks, dateRange, strategyFilter, confidenceFilter]);

    // Compute aggregated metrics
    const metrics = useMemo(() => {
        if (filteredBenchmarks.length === 0) return null;
        
        const totalTests = filteredBenchmarks.length;
        const passedTests = filteredBenchmarks.filter(b => b.passed).length;
        
        const avgSPG = filteredBenchmarks.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / totalTests;
        const avgCpuSavings = filteredBenchmarks.reduce((sum, b) => sum + (b.cpu_savings_percentage || 0), 0) / totalTests;
        const avgTokenSavings = filteredBenchmarks.reduce((sum, b) => sum + (b.token_savings_percentage || 0), 0) / totalTests;
        const avgLatency = filteredBenchmarks.reduce((sum, b) => sum + (b.mode_b_time_ms || 0), 0) / totalTests;
        
        // Quality scores aggregation
        const qualityScores = filteredBenchmarks
            .filter(b => b.quality_scores)
            .map(b => b.quality_scores);
        
        const avgModeAScore = qualityScores.reduce((sum, q) => sum + (q.mode_a_ars_score || 0), 0) / (qualityScores.length || 1);
        const avgModeBScore = qualityScores.reduce((sum, q) => sum + (q.mode_b_ars_score || 0), 0) / (qualityScores.length || 1);
        
        // Strategy breakdown
        const strategyBreakdown = {};
        filteredBenchmarks.forEach(b => {
            const strategy = b.spg_breakdown?.active_strategy || 'default';
            if (!strategyBreakdown[strategy]) {
                strategyBreakdown[strategy] = { count: 0, totalSPG: 0, passed: 0 };
            }
            strategyBreakdown[strategy].count++;
            strategyBreakdown[strategy].totalSPG += b.global_score_performance || 0;
            if (b.passed) strategyBreakdown[strategy].passed++;
        });
        
        // Time series data (daily aggregation)
        const dailyData = {};
        filteredBenchmarks.forEach(b => {
            const day = format(new Date(b.created_date), 'yyyy-MM-dd');
            if (!dailyData[day]) {
                dailyData[day] = { 
                    date: day, 
                    count: 0, 
                    totalSPG: 0, 
                    totalCpuSavings: 0,
                    totalTokenSavings: 0,
                    passed: 0 
                };
            }
            dailyData[day].count++;
            dailyData[day].totalSPG += b.global_score_performance || 0;
            dailyData[day].totalCpuSavings += b.cpu_savings_percentage || 0;
            dailyData[day].totalTokenSavings += b.token_savings_percentage || 0;
            if (b.passed) dailyData[day].passed++;
        });
        
        const timeSeriesData = Object.values(dailyData)
            .map(d => ({
                date: d.date,
                displayDate: format(new Date(d.date), 'dd MMM', { locale: fr }),
                avgSPG: d.totalSPG / d.count,
                avgCpuSavings: d.totalCpuSavings / d.count,
                avgTokenSavings: d.totalTokenSavings / d.count,
                passRate: (d.passed / d.count) * 100,
                testCount: d.count
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Winner distribution
        const winnerDist = {
            mode_a: filteredBenchmarks.filter(b => b.winner === 'mode_a').length,
            mode_b: filteredBenchmarks.filter(b => b.winner === 'mode_b').length,
            tie: filteredBenchmarks.filter(b => b.winner === 'tie').length
        };
        
        return {
            totalTests,
            passedTests,
            passRate: (passedTests / totalTests) * 100,
            avgSPG,
            avgCpuSavings,
            avgTokenSavings,
            avgLatency,
            avgModeAScore,
            avgModeBScore,
            qualityImprovement: ((avgModeBScore - avgModeAScore) / avgModeAScore) * 100,
            strategyBreakdown,
            timeSeriesData,
            winnerDist
        };
    }, [filteredBenchmarks]);

    // Strategy performance data for charts
    const strategyChartData = useMemo(() => {
        if (!metrics?.strategyBreakdown) return [];
        
        return Object.entries(metrics.strategyBreakdown).map(([name, data]) => ({
            name: name.replace(/([A-Z])/g, ' $1').trim(),
            shortName: name.substring(0, 10),
            avgSPG: (data.totalSPG / data.count) * 100,
            passRate: (data.passed / data.count) * 100,
            count: data.count,
            fill: STRATEGY_COLORS[name] || STRATEGY_COLORS.default
        }));
    }, [metrics]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-slate-400">Chargement des métriques...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Alert Banner */}
                <AlertNotificationBanner 
                    alerts={activeAlerts} 
                    onAcknowledge={handleAlertAcknowledge}
                />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-green-300">Optimization Metrics Dashboard</h1>
                            <p className="text-slate-400 text-sm">Agrégation centralisée des performances</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setShowAlertConfig(!showAlertConfig)} 
                            variant="outline" 
                            className={`border-orange-600 ${showAlertConfig ? 'bg-orange-900/30 text-orange-400' : 'text-orange-400'}`}
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Alerts {activeAlerts.length > 0 && <Badge className="ml-2 bg-red-600">{activeAlerts.length}</Badge>}
                        </Button>
                        <Button onClick={loadAllData} variant="outline" className="border-green-600 text-green-400">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Actualiser
                        </Button>
                    </div>
                </div>

                {/* Alert Config Panel (collapsible) */}
                {showAlertConfig && (
                    <AlertConfigPanel onAlertChange={setAlertThresholds} />
                )}

                {/* Filters Bar */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-400">Filtres:</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-400" />
                                <Select value={dateRange} onValueChange={setDateRange}>
                                    <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-green-300 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {DATE_RANGES.map(r => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-purple-400" />
                                <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                                    <SelectTrigger className="w-44 bg-slate-700 border-slate-600 text-green-300 h-8">
                                        <SelectValue placeholder="Stratégie" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">Toutes stratégies</SelectItem>
                                        <SelectItem value="MinimalViableDebate">MinimalViableDebate</SelectItem>
                                        <SelectItem value="SweetSpotBalanced">SweetSpotBalanced</SelectItem>
                                        <SelectItem value="AdaptiveComplexityRouting">AdaptiveComplexity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-orange-400" />
                                <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                                    <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-green-300 h-8">
                                        <SelectValue placeholder="Confiance" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">Tous niveaux</SelectItem>
                                        <SelectItem value="high">Haute (&gt;0.8)</SelectItem>
                                        <SelectItem value="medium">Moyenne (0.5-0.8)</SelectItem>
                                        <SelectItem value="low">Basse (&lt;0.5)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <Badge variant="outline" className="text-green-400 border-green-600">
                                {filteredBenchmarks.length} tests
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* KPI Cards */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <KPICard 
                            title="SPG Moyen" 
                            value={metrics.avgSPG.toFixed(3)} 
                            icon={Target}
                            color="green"
                            trend={metrics.avgSPG > 0.7 ? 'up' : 'down'}
                        />
                        <KPICard 
                            title="Pass Rate" 
                            value={`${metrics.passRate.toFixed(1)}%`} 
                            icon={CheckCircle2}
                            color="blue"
                            trend={metrics.passRate > 50 ? 'up' : 'down'}
                        />
                        <KPICard 
                            title="CPU Savings" 
                            value={`${metrics.avgCpuSavings.toFixed(1)}%`} 
                            icon={Zap}
                            color="purple"
                            trend={metrics.avgCpuSavings > 0 ? 'up' : 'down'}
                        />
                        <KPICard 
                            title="Token Savings" 
                            value={`${metrics.avgTokenSavings.toFixed(1)}%`} 
                            icon={Coins}
                            color="orange"
                            trend={metrics.avgTokenSavings > 0 ? 'up' : 'down'}
                        />
                        <KPICard 
                            title="Latence Moy." 
                            value={`${(metrics.avgLatency / 1000).toFixed(1)}s`} 
                            icon={Clock}
                            color="cyan"
                        />
                        <KPICard 
                            title="Quality ↑" 
                            value={`${metrics.qualityImprovement.toFixed(1)}%`} 
                            icon={Sparkles}
                            color="pink"
                            trend={metrics.qualityImprovement > 0 ? 'up' : 'down'}
                        />
                    </div>
                )}

                {/* Main Charts */}
                <Tabs defaultValue="trends" className="space-y-4">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="trends" className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-400">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Tendances
                        </TabsTrigger>
                        <TabsTrigger value="strategies" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Layers className="w-4 h-4 mr-2" />
                            Stratégies
                        </TabsTrigger>
                        <TabsTrigger value="quality" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
                            <Brain className="w-4 h-4 mr-2" />
                            Qualité
                        </TabsTrigger>
                        <TabsTrigger value="distribution" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <Activity className="w-4 h-4 mr-2" />
                            Distribution
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-400">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyse
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="data-[state=active]:bg-cyan-900/30 data-[state=active]:text-cyan-400">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Rapports
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-400">
                            <Layers className="w-4 h-4 mr-2" />
                            Logs Unifiés
                        </TabsTrigger>
                        <TabsTrigger value="versions" className="data-[state=active]:bg-yellow-900/30 data-[state=active]:text-yellow-400">
                            <Target className="w-4 h-4 mr-2" />
                            Versions
                        </TabsTrigger>
                    </TabsList>

                    {/* Trends Tab */}
                    <TabsContent value="trends">
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Évolution SPG & Pass Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={metrics?.timeSeriesData || []}>
                                            <defs>
                                                <linearGradient id="spgGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="passGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={COLORS.info} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                labelStyle={{ color: '#94a3b8' }}
                                            />
                                            <Legend />
                                            <Area 
                                                type="monotone" 
                                                dataKey="avgSPG" 
                                                name="SPG" 
                                                stroke={COLORS.primary} 
                                                fill="url(#spgGradient)" 
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="passRate" 
                                                name="Pass Rate %" 
                                                stroke={COLORS.info} 
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Économies (CPU & Tokens)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <LineChart data={metrics?.timeSeriesData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                                formatter={(value) => `${value.toFixed(1)}%`}
                                            />
                                            <Legend />
                                            <Line 
                                                type="monotone" 
                                                dataKey="avgCpuSavings" 
                                                name="CPU Savings %" 
                                                stroke={COLORS.purple} 
                                                strokeWidth={2}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="avgTokenSavings" 
                                                name="Token Savings %" 
                                                stroke={COLORS.accent} 
                                                strokeWidth={2}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Strategies Tab */}
                    <TabsContent value="strategies">
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Performance par Stratégie</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={strategyChartData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis type="number" stroke="#64748b" fontSize={11} />
                                            <YAxis dataKey="shortName" type="category" stroke="#64748b" fontSize={10} width={80} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                            />
                                            <Bar dataKey="avgSPG" name="SPG %" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="passRate" name="Pass Rate %" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Répartition des Tests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={strategyChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="count"
                                                label={({ name, percent }) => `${name.substring(0, 8)} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {strategyChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Strategy Cards */}
                            <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Détail des Stratégies Actives</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        {strategies.filter(s => s.is_active).map(strategy => (
                                            <div key={strategy.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-green-300 text-sm">{strategy.strategy_name}</span>
                                                    <Badge className={`text-xs ${strategy.priority_level >= 8 ? 'bg-red-600' : strategy.priority_level >= 5 ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                                        P{strategy.priority_level}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-2 line-clamp-2">{strategy.description}</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">{strategy.strategy_type}</Badge>
                                                    <Badge variant="outline" className="text-xs">{strategy.cost_impact}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Quality Tab */}
                    <TabsContent value="quality">
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Comparaison Mode A vs Mode B</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 text-sm">Mode A (Baseline)</span>
                                            <span className="text-orange-400 font-bold">{metrics?.avgModeAScore.toFixed(3)}</span>
                                        </div>
                                        <Progress value={metrics?.avgModeAScore * 100} className="h-3 bg-slate-700" />
                                        
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 text-sm">Mode B (Neuronas)</span>
                                            <span className="text-green-400 font-bold">{metrics?.avgModeBScore.toFixed(3)}</span>
                                        </div>
                                        <Progress value={metrics?.avgModeBScore * 100} className="h-3 bg-slate-700" />
                                        
                                        <div className="bg-slate-700 rounded-lg p-3 mt-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-300">Amélioration Qualité</span>
                                                <span className={`font-bold ${metrics?.qualityImprovement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {metrics?.qualityImprovement > 0 ? '+' : ''}{metrics?.qualityImprovement.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Distribution des Gagnants</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Mode B (Neuronas)', value: metrics?.winnerDist.mode_b || 0, fill: COLORS.success },
                                                    { name: 'Mode A (Baseline)', value: metrics?.winnerDist.mode_a || 0, fill: COLORS.error },
                                                    { name: 'Égalité', value: metrics?.winnerDist.tie || 0, fill: COLORS.warning }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Distribution Tab */}
                    <TabsContent value="distribution">
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Volume de Tests par Jour</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={metrics?.timeSeriesData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                            <Bar dataKey="testCount" name="Tests" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-green-300 text-sm">Paramètres Actifs</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-64">
                                        <div className="space-y-2">
                                            {tunableParams.slice(0, 8).map(param => (
                                                <div key={param.id} className="flex items-center justify-between bg-slate-700 rounded p-2">
                                                    <div>
                                                        <span className="text-sm text-green-300">{param.parameter_name}</span>
                                                        <span className="text-xs text-slate-500 ml-2">({param.parameter_category})</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {param.current_value?.toFixed(2)}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Analysis Tab - Strategy Correlation */}
                    <TabsContent value="analysis">
                        <StrategyComparisonPanel 
                            benchmarks={filteredBenchmarks} 
                            strategies={strategies}
                        />
                    </TabsContent>

                    {/* Reports Tab - Custom Report Generator */}
                    <TabsContent value="reports">
                        <PerformanceReportGenerator 
                            benchmarks={benchmarks}
                            strategies={strategies}
                            tunableParams={tunableParams}
                        />
                    </TabsContent>

                    {/* Unified Logs Tab */}
                    <TabsContent value="logs">
                        <div className="space-y-6">
                            <UnifiedLogTable />
                            <LogBasedAlertSystem />
                        </div>
                    </TabsContent>

                    {/* Versions Tab */}
                    <TabsContent value="versions">
                        <VersionComparisonPanel />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// KPI Card Component
function KPICard({ title, value, icon: Icon, color, trend }) {
    const colorClasses = {
        green: 'text-green-400 bg-green-900/30 border-green-600/50',
        blue: 'text-blue-400 bg-blue-900/30 border-blue-600/50',
        purple: 'text-purple-400 bg-purple-900/30 border-purple-600/50',
        orange: 'text-orange-400 bg-orange-900/30 border-orange-600/50',
        cyan: 'text-cyan-400 bg-cyan-900/30 border-cyan-600/50',
        pink: 'text-pink-400 bg-pink-900/30 border-pink-600/50'
    };
    
    return (
        <Card className={`bg-slate-800 border ${colorClasses[color]?.split(' ')[2] || 'border-slate-700'}`}>
            <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-4 h-4 ${colorClasses[color]?.split(' ')[0]}`} />
                    {trend && (
                        trend === 'up' 
                            ? <TrendingUp className="w-3 h-3 text-green-400" />
                            : <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400">{title}</p>
            </CardContent>
        </Card>
    );
}