import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    TrendingUp, BarChart3, Target, Brain, Layers, Clock, 
    RefreshCw, Loader2, Filter, Calendar, Zap, Activity, GitCompare, FileText
} from 'lucide-react';
import ModelComparisonView from '@/components/performance/ModelComparisonView';
import UnifiedLogDisplay from '@/components/core/UnifiedLogDisplay';
import { 
    LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';

const DOMAIN_COLORS = {
    physics: '#3b82f6',
    philosophy: '#8b5cf6',
    ethics: '#f59e0b',
    creativity: '#ec4899',
    mathematics: '#10b981',
    psychology: '#06b6d4',
    law: '#6366f1',
    ai_safety: '#ef4444',
    quantum: '#14b8a6',
    consciousness: '#a855f7',
    General: '#64748b'
};

const COMPONENT_COLORS = {
    D3STIB: '#3b82f6',
    QRONAS: '#8b5cf6',
    BRONAS: '#f59e0b',
    SMAS: '#10b981',
    GC_HARMONIZER: '#ec4899'
};

export default function PerformanceTracker() {
    const [loading, setLoading] = useState(true);
    const [benchmarkResults, setBenchmarkResults] = useState([]);
    const [devtestResults, setDevtestResults] = useState([]);
    const [timeRange, setTimeRange] = useState('7d');
    const [modelFilter, setModelFilter] = useState('all');
    
    // Computed analytics
    const [domainStats, setDomainStats] = useState([]);
    const [componentStats, setComponentStats] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [timelineData, setTimelineData] = useState([]);
    const [overallKPIs, setOverallKPIs] = useState({});

    useEffect(() => {
        loadData();
    }, [timeRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [benchmarks, devtests] = await Promise.all([
                base44.entities.BenchmarkResult.list('-created_date', 500),
                base44.entities.DevTestResult.list('-created_date', 500)
            ]);

            // Filter by time range
            const now = new Date();
            const filterDate = new Date();
            if (timeRange === '24h') filterDate.setHours(now.getHours() - 24);
            else if (timeRange === '7d') filterDate.setDate(now.getDate() - 7);
            else if (timeRange === '30d') filterDate.setDate(now.getDate() - 30);
            else if (timeRange === '90d') filterDate.setDate(now.getDate() - 90);

            const filteredBenchmarks = benchmarks.filter(b => new Date(b.created_date) >= filterDate);
            const filteredDevtests = devtests.filter(d => new Date(d.created_date) >= filterDate);

            setBenchmarkResults(filteredBenchmarks);
            setDevtestResults(filteredDevtests);

            // Compute analytics
            computeAnalytics(filteredBenchmarks, filteredDevtests);
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const computeAnalytics = (benchmarks, devtests) => {
        const allResults = [...benchmarks, ...devtests];

        // Overall KPIs
        const totalTests = allResults.length;
        const avgSPG = totalTests > 0 
            ? allResults.reduce((sum, r) => sum + (r.global_score_performance || 0), 0) / totalTests 
            : 0;
        const modeBWins = allResults.filter(r => r.winner === 'mode_b').length;
        const winRate = totalTests > 0 ? (modeBWins / totalTests) * 100 : 0;
        const avgImprovement = totalTests > 0
            ? allResults.reduce((sum, r) => sum + (r.performance_improvement || 0), 0) / totalTests
            : 0;

        setOverallKPIs({ totalTests, avgSPG, winRate, avgImprovement });

        // Domain stats
        const domainMap = {};
        allResults.forEach(r => {
            const domain = r.scenario_category || 'General';
            if (!domainMap[domain]) {
                domainMap[domain] = { domain, count: 0, totalSPG: 0, wins: 0 };
            }
            domainMap[domain].count++;
            domainMap[domain].totalSPG += r.global_score_performance || 0;
            if (r.winner === 'mode_b') domainMap[domain].wins++;
        });
        const domainStatsArray = Object.values(domainMap).map(d => ({
            ...d,
            avgSPG: d.count > 0 ? (d.totalSPG / d.count) : 0,
            winRate: d.count > 0 ? (d.wins / d.count) * 100 : 0
        }));
        setDomainStats(domainStatsArray);

        // Component stats (based on hemisphere and capabilities)
        const componentMap = {
            D3STIB: { tests: 0, totalSPG: 0 },
            QRONAS: { tests: 0, totalSPG: 0 },
            BRONAS: { tests: 0, totalSPG: 0 },
            SMAS: { tests: 0, totalSPG: 0 },
            GC_HARMONIZER: { tests: 0, totalSPG: 0 }
        };
        allResults.forEach(r => {
            const spg = r.global_score_performance || 0;
            // Map hemisphere to component
            if (r.mode_b_dominant_hemisphere === 'left') {
                componentMap.D3STIB.tests++;
                componentMap.D3STIB.totalSPG += spg;
            } else if (r.mode_b_dominant_hemisphere === 'right') {
                componentMap.QRONAS.tests++;
                componentMap.QRONAS.totalSPG += spg;
            }
            // SMAS always involved in debate
            if (r.mode_b_debate_rounds > 0) {
                componentMap.SMAS.tests++;
                componentMap.SMAS.totalSPG += spg;
            }
            // BRONAS if validation passed
            if (r.bronas_post_val_status === 'passed') {
                componentMap.BRONAS.tests++;
                componentMap.BRONAS.totalSPG += spg;
            }
            // GC for balanced
            if (r.mode_b_dominant_hemisphere === 'central') {
                componentMap.GC_HARMONIZER.tests++;
                componentMap.GC_HARMONIZER.totalSPG += spg;
            }
        });
        const componentStatsArray = Object.entries(componentMap).map(([name, data]) => ({
            component: name,
            tests: data.tests,
            avgSPG: data.tests > 0 ? data.totalSPG / data.tests : 0,
            fullMark: 1
        }));
        setComponentStats(componentStatsArray);

        // Question type stats
        const typeMap = {};
        allResults.forEach(r => {
            const type = r.scenario_category || 'unknown';
            if (!typeMap[type]) {
                typeMap[type] = { type, count: 0, totalSPG: 0, totalTime: 0 };
            }
            typeMap[type].count++;
            typeMap[type].totalSPG += r.global_score_performance || 0;
            typeMap[type].totalTime += r.mode_b_time_ms || 0;
        });
        setTypeStats(Object.values(typeMap).map(t => ({
            ...t,
            avgSPG: t.count > 0 ? t.totalSPG / t.count : 0,
            avgTime: t.count > 0 ? t.totalTime / t.count : 0
        })));

        // Timeline data (group by day)
        const timelineMap = {};
        allResults.forEach(r => {
            const date = new Date(r.created_date).toLocaleDateString('fr-FR');
            if (!timelineMap[date]) {
                timelineMap[date] = { date, tests: 0, totalSPG: 0, wins: 0 };
            }
            timelineMap[date].tests++;
            timelineMap[date].totalSPG += r.global_score_performance || 0;
            if (r.winner === 'mode_b') timelineMap[date].wins++;
        });
        const timelineArray = Object.values(timelineMap)
            .map(t => ({
                ...t,
                avgSPG: t.tests > 0 ? t.totalSPG / t.tests : 0,
                winRate: t.tests > 0 ? (t.wins / t.tests) * 100 : 0
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        setTimelineData(timelineArray);
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-green-300">Performance Tracker</h1>
                            <p className="text-slate-400 text-sm">Suivi des performances NEURONAS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="24h">24 heures</SelectItem>
                                <SelectItem value="7d">7 jours</SelectItem>
                                <SelectItem value="30d">30 jours</SelectItem>
                                <SelectItem value="90d">90 jours</SelectItem>
                                <SelectItem value="all">Tout</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={loadData} variant="outline" className="border-green-600 text-green-400">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Rafraîchir
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">Tests Totaux</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400">{overallKPIs.totalTests || 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-slate-400">SPG Moyen</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">
                                {(overallKPIs.avgSPG || 0).toFixed(3)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-slate-400">Win Rate Mode B</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-400">
                                {(overallKPIs.winRate || 0).toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-orange-400" />
                                <span className="text-sm text-slate-400">Amélioration Moy.</span>
                            </div>
                            <p className="text-3xl font-bold text-orange-400">
                                +{(overallKPIs.avgImprovement || 0).toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="timeline" className="space-y-4">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="timeline" className="data-[state=active]:bg-blue-900/30">
                            <Clock className="w-4 h-4 mr-2" />
                            Timeline
                        </TabsTrigger>
                        <TabsTrigger value="domains" className="data-[state=active]:bg-purple-900/30">
                            <Layers className="w-4 h-4 mr-2" />
                            Domaines
                        </TabsTrigger>
                        <TabsTrigger value="components" className="data-[state=active]:bg-green-900/30">
                            <Brain className="w-4 h-4 mr-2" />
                            Composants
                        </TabsTrigger>
                        <TabsTrigger value="types" className="data-[state=active]:bg-orange-900/30">
                            <Activity className="w-4 h-4 mr-2" />
                            Types
                        </TabsTrigger>
                        <TabsTrigger value="compare" className="data-[state=active]:bg-pink-900/30">
                            <GitCompare className="w-4 h-4 mr-2" />
                            Comparer
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="data-[state=active]:bg-indigo-900/30">
                            <FileText className="w-4 h-4 mr-2" />
                            Logs Unifiés
                        </TabsTrigger>
                        </TabsList>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Évolution Temporelle</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Performance SPG et Win Rate au fil du temps
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {timelineData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <AreaChart data={timelineData}>
                                            <defs>
                                                <linearGradient id="spgGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                            <YAxis yAxisId="left" stroke="#10b981" domain={[0, 1]} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" domain={[0, 100]} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                                labelStyle={{ color: '#10b981' }}
                                            />
                                            <Legend />
                                            <Area 
                                                yAxisId="left"
                                                type="monotone" 
                                                dataKey="avgSPG" 
                                                name="SPG Moyen"
                                                stroke="#10b981" 
                                                fill="url(#spgGradient)" 
                                            />
                                            <Line 
                                                yAxisId="right"
                                                type="monotone" 
                                                dataKey="winRate" 
                                                name="Win Rate (%)"
                                                stroke="#8b5cf6" 
                                                strokeWidth={2}
                                                dot={{ fill: '#8b5cf6' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-slate-500">
                                        Aucune donnée pour cette période
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Domains Tab */}
                    <TabsContent value="domains">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-300">Performance par Domaine</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={domainStats} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis type="number" domain={[0, 1]} stroke="#9ca3af" />
                                            <YAxis dataKey="domain" type="category" stroke="#9ca3af" width={100} fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                                formatter={(value) => value.toFixed(3)}
                                            />
                                            <Bar dataKey="avgSPG" name="SPG Moyen" fill="#10b981" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-300">Win Rate par Domaine</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={domainStats} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" />
                                            <YAxis dataKey="domain" type="category" stroke="#9ca3af" width={100} fontSize={11} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                                formatter={(value) => `${value.toFixed(1)}%`}
                                            />
                                            <Bar dataKey="winRate" name="Win Rate (%)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Components Tab */}
                    <TabsContent value="components">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-300">Radar des Composants NEURONAS</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <RadarChart data={componentStats}>
                                            <PolarGrid stroke="#374151" />
                                            <PolarAngleAxis dataKey="component" stroke="#9ca3af" fontSize={11} />
                                            <PolarRadiusAxis domain={[0, 1]} stroke="#9ca3af" />
                                            <Radar 
                                                name="SPG Moyen" 
                                                dataKey="avgSPG" 
                                                stroke="#10b981" 
                                                fill="#10b981" 
                                                fillOpacity={0.5} 
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                                formatter={(value) => value.toFixed(3)}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-300">Détail par Composant</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[350px]">
                                        <div className="space-y-3">
                                            {componentStats.map((comp) => (
                                                <div key={comp.component} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div 
                                                                className="w-3 h-3 rounded-full" 
                                                                style={{ backgroundColor: COMPONENT_COLORS[comp.component] }}
                                                            />
                                                            <span className="font-medium text-green-300">{comp.component}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {comp.tests} tests
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <span className="text-xs text-slate-500">SPG Moyen</span>
                                                            <p className="text-lg font-bold text-green-400">
                                                                {comp.avgSPG.toFixed(3)}
                                                            </p>
                                                        </div>
                                                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                                                            <div 
                                                                className="h-2 rounded-full transition-all"
                                                                style={{ 
                                                                    width: `${comp.avgSPG * 100}%`,
                                                                    backgroundColor: COMPONENT_COLORS[comp.component]
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Types Tab */}
                    <TabsContent value="types">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Performance par Type de Question</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {typeStats.map((type) => (
                                        <div key={type.type} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge className="bg-purple-600 capitalize">{type.type}</Badge>
                                                <span className="text-xs text-slate-500">{type.count} tests</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">SPG Moyen</span>
                                                    <span className="font-bold text-green-400">{type.avgSPG.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">Temps Moyen</span>
                                                    <span className="font-bold text-blue-400">{Math.round(type.avgTime)}ms</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Compare Tab */}
                    <TabsContent value="compare">
                        <ModelComparisonView />
                    </TabsContent>

                    {/* Unified Logs Tab */}
                    <TabsContent value="logs">
                        <UnifiedLogDisplay
                            title="Logs Unifiés - Performance Tracker"
                            limit={100}
                            showFilters={true}
                            showSearch={true}
                            collapsible={false}
                            maxHeight="600px"
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}