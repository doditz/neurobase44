import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    BarChart3,
    Loader2,
    RefreshCw,
    GitCompare
} from 'lucide-react';
import { toast } from 'sonner';


import ExportAllButton from '@/components/benchmark/ExportAllButton';
import ComparisonView from '@/components/benchmark/ComparisonView';
import DevTestAIAnalysis from '@/components/benchmark/DevTestAIAnalysis';

const GROUP_BY_OPTIONS = [
    { value: 'scenario_category', label: 'Catégorie de Scénario' },
    { value: 'winner', label: 'Gagnant (Mode A/B)' },
    { value: 'persona_usage', label: 'Nombre de Personas' },
    { value: 'spg_range', label: 'Plage de SPG' },
    { value: 'debate_rounds', label: 'Rondes de Débat' }
];

export default function DevTestAnalyticsPage() {
    const [user, setUser] = useState(null);
    const [analyticsReport, setAnalyticsReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedGroupBy, setSelectedGroupBy] = useState(['scenario_category', 'winner']);
    const [lookbackDays, setLookbackDays] = useState(30);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [chartGroupBy, setChartGroupBy] = useState('scenario_category');
    const [showTimeSeriesChart, setShowTimeSeriesChart] = useState(true);
    const [showComparison, setShowComparison] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadResults();
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
            toast.info('🔍 Analyse des tests en cours...');
            
            const { data } = await base44.functions.invoke('benchmarkAnalytics', {
                group_by: selectedGroupBy,
                lookback_days: lookbackDays,
                min_samples_per_group: 3,
                outlier_threshold_z_score: 2.0,
                include_trend_analysis: true
            });

            if (data && data.success) {
                setAnalyticsReport(data.analytics_report);
                toast.success(`✅ Analyse terminée: ${data.analytics_report.total_benchmarks} tests analysés`);
            } else {
                if (data?.error && data.error.includes('Insufficient data')) {
                    setAnalyticsReport(null);
                    toast.info('Aucun test disponible. Lancez des tests pour commencer!');
                } else {
                    throw new Error(data?.error || 'Analytics failed');
                }
            }
        } catch (error) {
            console.error('Analytics error:', error);
            if (error.message.includes('Insufficient data')) {
                setAnalyticsReport(null);
                toast.info('Aucun test disponible.');
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <BarChart3 className="w-8 h-8" />
                            Analytics des Tests de Développement
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Analyse approfondie de {analyticsReport?.total_benchmarks || 0} tests
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant={showComparison ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowComparison(!showComparison)}
                            className={showComparison ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                        >
                            <GitCompare className="w-4 h-4 mr-2" />
                            Comparaison
                        </Button>
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

                {/* Comparison View */}
                {showComparison && (
                    <ComparisonView />
                )}

                {/* AI-Powered Analysis Section */}
                {analyticsReport && analyticsReport.results && analyticsReport.results.length > 0 && !showComparison && (
                    <DevTestAIAnalysis 
                        testIds={analyticsReport.results.slice(0, 10).map(r => r.id)}
                        analysisType="multi"
                    />
                )}

                {analyticsReport && !showComparison && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Tests Analysés</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {analyticsReport.total_benchmarks}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">SPG Moyen</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {analyticsReport.overall_stats.mean_spg.toFixed(3)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Outliers</div>
                                <div className="text-2xl font-bold text-orange-400">
                                    {analyticsReport.outliers.length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="text-xs text-slate-400 mb-1">Insights</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {analyticsReport.insights.length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!analyticsReport && !isLoading && !showComparison && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-400 mb-2">
                                Aucune Analyse Disponible
                            </h3>
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
            </div>
        </div>
    );
}