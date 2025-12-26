import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Zap, 
    TrendingUp, 
    Settings, 
    Activity, 
    Target,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    BarChart3,
    FlaskConical
} from 'lucide-react';
import { toast } from 'sonner';
import StrategyDryRunAnalyzer from '@/components/optimization/StrategyDryRunAnalyzer';

export default function AutoOptimizationPage() {
    const [user, setUser] = useState(null);
    const [tunableParams, setTunableParams] = useState([]);
    const [spgConfig, setSpgConfig] = useState(null);
    const [strategies, setStrategies] = useState([]);
    const [systemState, setSystemState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalParams: 0,
        activeStrategies: 0,
        avgQuality: 0,
        avgEfficiency: 0
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(checkSystemState, 3000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [currentUser, params, configs, strats] = await Promise.all([
                base44.auth.me(),
                base44.entities.TunableParameter.list(),
                base44.entities.SPGConfiguration.filter({ is_active: true }),
                base44.entities.OptimizationStrategy.filter({ is_active: true })
            ]);

            setUser(currentUser);
            setTunableParams(params);
            setSpgConfig(configs[0] || null);
            setStrategies(strats);

            // Calculate stats
            setStats({
                totalParams: params.length,
                activeStrategies: strats.length,
                avgQuality: spgConfig?.category_weights?.quality || 0,
                avgEfficiency: spgConfig?.category_weights?.efficiency || 0
            });
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Erreur lors du chargement des données');
        }
        setIsLoading(false);
    };

    const checkSystemState = async () => {
        try {
            const state = await base44.entities.SystemState.filter({ 
                state_key: 'auto_optimization_mode_active' 
            });
            setSystemState(state[0] || null);
        } catch (error) {
            console.log('System state check failed:', error);
            setSystemState(null);
        }
    };

    const getParamColor = (impact) => {
        switch (impact) {
            case 'high': return 'text-red-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-green-400';
            default: return 'text-slate-400';
        }
    };

    const getStrategyColor = (priority) => {
        if (priority >= 9) return 'bg-red-600';
        if (priority >= 7) return 'bg-orange-600';
        if (priority >= 5) return 'bg-yellow-600';
        return 'bg-blue-600';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-orange-900/20 border-orange-600">
                        <CardHeader>
                            <CardTitle className="text-orange-400 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6" />
                                Accès Restreint
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300">
                                Cette page est réservée aux administrateurs.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Zap className="w-8 h-8" />
                            Auto-Optimization Engine
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Configuration du système d'auto-tuning Neuronas
                        </p>
                    </div>
                    <Button
                        onClick={loadData}
                        variant="outline"
                        className="border-green-600 text-green-400 hover:bg-green-900/30"
                    >
                        <Activity className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>
                </div>

                {/* System State Alert */}
                {systemState?.is_active && (
                    <Card className="bg-orange-900/20 border-orange-600">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                                    <div>
                                        <p className="text-orange-400 font-semibold">
                                            {systemState.current_operation}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Par: {systemState.started_by}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-orange-400">
                                        {Math.round(systemState.metadata?.progress_percentage || 0)}%
                                    </p>
                                </div>
                            </div>
                            <Progress 
                                value={systemState.metadata?.progress_percentage || 0} 
                                className="mt-3 h-2" 
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Main Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-green-900/30">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Vue d'ensemble
                        </TabsTrigger>
                        <TabsTrigger value="dryrun" className="data-[state=active]:bg-purple-900/30">
                            <FlaskConical className="w-4 h-4 mr-2" />
                            Analyse Dry-Run ({strategies.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-400">
                                Paramètres Ajustables
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-green-400">
                                    {stats.totalParams}
                                </p>
                                <Settings className="w-8 h-8 text-slate-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-400">
                                Stratégies Actives
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-blue-400">
                                    {stats.activeStrategies}
                                </p>
                                <Target className="w-8 h-8 text-slate-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-400">
                                Poids Qualité
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-pink-400">
                                    {(stats.avgQuality * 100).toFixed(0)}%
                                </p>
                                <CheckCircle2 className="w-8 h-8 text-slate-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-400">
                                Poids Efficacité
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold text-orange-400">
                                    {(stats.avgEfficiency * 100).toFixed(0)}%
                                </p>
                                <TrendingUp className="w-8 h-8 text-slate-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SPG Configuration */}
                {spgConfig && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Configuration SPG Active
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-green-600">{spgConfig.config_version}</Badge>
                                {spgConfig.is_active && (
                                    <Badge className="bg-blue-600">ACTIVE</Badge>
                                )}
                            </div>
                            
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <p className="text-sm text-slate-300 mb-3">
                                    {spgConfig.spg_formula_description}
                                </p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Qualité</p>
                                        <p className="text-2xl font-bold text-pink-400">
                                            {(spgConfig.category_weights.quality * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Efficacité</p>
                                        <p className="text-2xl font-bold text-orange-400">
                                            {(spgConfig.category_weights.efficiency * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Complexité</p>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {(spgConfig.category_weights.complexity * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {spgConfig.notes && (
                                <div className="bg-slate-700 p-3 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Notes:</p>
                                    <p className="text-sm text-slate-300">{spgConfig.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Tunable Parameters */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Paramètres Ajustables ({tunableParams.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {tunableParams.map((param) => (
                                <div 
                                    key={param.id} 
                                    className="bg-slate-700 p-4 rounded-lg"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-green-300">
                                                    {param.parameter_name}
                                                </p>
                                                {param.is_locked && (
                                                    <Badge variant="outline" className="text-xs">
                                                        LOCKED
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {param.description}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-green-400">
                                                {param.current_value.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                [{param.min_bound} - {param.max_bound}]
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-2">
                                        <Badge className="bg-slate-600 text-xs">
                                            {param.parameter_category}
                                        </Badge>
                                        <Badge className={`text-xs ${getParamColor(param.impact_on_quality)}`}>
                                            Quality: {param.impact_on_quality}
                                        </Badge>
                                        <Badge className={`text-xs ${getParamColor(param.impact_on_cost)}`}>
                                            Cost: {param.impact_on_cost}
                                        </Badge>
                                    </div>

                                    {param.last_adjusted && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            Dernière modification: {new Date(param.last_adjusted).toLocaleString('fr-FR')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Optimization Strategies */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Stratégies d'Optimisation ({strategies.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {strategies.map((strategy) => (
                                <div 
                                    key={strategy.id} 
                                    className="bg-slate-700 p-4 rounded-lg"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-green-300">
                                                    {strategy.strategy_name}
                                                </p>
                                                <Badge className={getStrategyColor(strategy.priority_level)}>
                                                    Priority: {strategy.priority_level}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-300 mb-2">
                                                {strategy.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                            {strategy.strategy_type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {strategy.source}
                                        </Badge>
                                        <Badge 
                                            className={`text-xs ${
                                                strategy.cost_impact === 'reduces_cost' 
                                                    ? 'bg-green-600' 
                                                    : 'bg-orange-600'
                                            }`}
                                        >
                                            {strategy.cost_impact}
                                        </Badge>
                                        <Badge 
                                            className={`text-xs ${
                                                strategy.quality_impact === 'improves_quality' 
                                                    ? 'bg-blue-600' 
                                                    : strategy.quality_impact === 'maintains_quality'
                                                    ? 'bg-slate-600'
                                                    : 'bg-yellow-600'
                                            }`}
                                        >
                                            {strategy.quality_impact}
                                        </Badge>
                                    </div>

                                    {strategy.expected_improvement_range && (
                                        <div className="mt-3 bg-slate-800 p-2 rounded">
                                            <p className="text-xs text-slate-400">
                                                Amélioration attendue: {strategy.expected_improvement_range}
                                            </p>
                                        </div>
                                    )}

                                    {strategy.implementation_notes && (
                                        <div className="mt-2 bg-slate-800 p-2 rounded">
                                            <p className="text-xs text-slate-300">
                                                {strategy.implementation_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Action Button */}
                <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-green-400 mb-1">
                                    Lancer l'Auto-Optimization
                                </h3>
                                <p className="text-sm text-slate-300">
                                    Utilisez la page "Test DSTIB" pour lancer un cycle d'auto-optimization avec cette configuration.
                                </p>
                            </div>
                            <Button
                                onClick={() => window.location.href = '/AutoOptimizationTest'}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Aller au Test
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                    </TabsContent>

                    <TabsContent value="dryrun">
                        <StrategyDryRunAnalyzer />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}