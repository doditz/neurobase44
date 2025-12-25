import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
    Play, Zap, 
    Target, Settings, Activity,
    CheckCircle2, AlertCircle, Loader2, BarChart3, Sparkles, Database, List, RefreshCw, History
} from 'lucide-react';
import OptimizationHistoryItem from '@/components/optimization/OptimizationHistoryItem';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { autoTuningLoop } from '@/functions/autoTuningLoop';
import { parameterSensitivityAnalysis } from '@/functions/parameterSensitivityAnalysis';
import { systemStateManager } from '@/functions/systemStateManager';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SelfOptimizationDashboard() {
    const [tunableParams, setTunableParams] = useState([]);
    const [strategies, setStrategies] = useState([]);
    const [spgConfig, setSpgConfig] = useState(null);
    const [recentBenchmarks, setRecentBenchmarks] = useState([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationStatus, setOptimizationStatus] = useState(null);
    const [selectedTestQuestion, setSelectedTestQuestion] = useState('');
    const [datasetType, setDatasetType] = useState('benchmark');
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [autoOptimizationSettings, setAutoOptimizationSettings] = useState({
        max_iterations: 10,
        convergence_threshold: 0.92,
        exploration_rate: 0.15
    });
    const [systemStatus, setSystemStatus] = useState({ ab_test: false, auto_opt: false });

    useEffect(() => {
        loadData();
        loadQuestions('benchmark'); // Charge les questions benchmark par défaut
        
        // Poll system status
        const interval = setInterval(checkSystemStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const checkSystemStatus = async () => {
        try {
            const { data: abStatus } = await systemStateManager({
                action: 'check_status',
                mode: 'benchmark_mode_active'
            });
            
            const { data: autoOptStatus } = await systemStateManager({
                action: 'check_status',
                mode: 'auto_optimization_mode_active'
            });

            setSystemStatus({
                ab_test: abStatus?.is_active || false,
                auto_opt: autoOptStatus?.is_active || false
            });
        } catch (error) {
            console.error('Failed to check system status:', error);
        }
    };

    const loadData = async () => {
        try {
            const [params, strats, configs, benchmarks] = await Promise.all([
                TunableParameter.list(),
                OptimizationStrategy.filter({ is_active: true }),
                SPGConfiguration.filter({ is_active: true }),
BenchmarkResult.list('-created_date', 100)
            ]);

            setTunableParams(params);
            setStrategies(strats);
            setSpgConfig(configs[0] || null);
            setRecentBenchmarks(benchmarks);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Échec du chargement des données');
        }
    };

    const loadQuestions = async (type) => {
        setLoadingQuestions(true);
        try {
            let questions = [];
            if (type === 'benchmark') {
                questions = await BenchmarkQuestion.list('-created_date', 300);
            } else if (type === 'devtest') {
                questions = await DevTestQuestion.list('-created_date', 300);
            }
            setAvailableQuestions(questions);
            if (questions.length > 0) {
                setSelectedQuestionId(questions[0].id);
                setSelectedTestQuestion(questions[0].question_text);
            }
            toast.success(`${questions.length} questions chargées`);
        } catch (error) {
            console.error('Failed to load questions:', error);
            toast.error('Échec du chargement des questions');
        } finally {
            setLoadingQuestions(false);
        }
    };

    useEffect(() => {
        if (datasetType !== 'custom') {
            loadQuestions(datasetType);
        } else {
            setAvailableQuestions([]);
            setSelectedQuestionId('');
        }
    }, [datasetType]);

    const startAutoOptimization = async () => {
        if (!selectedTestQuestion.trim()) {
            toast.error('Veuillez entrer une question de test');
            return;
        }

        if (systemStatus.ab_test) {
            toast.error('Mode A/B Test actif. Veuillez attendre qu\'il se termine.');
            return;
        }

        setIsOptimizing(true);
        setOptimizationStatus({ 
            status: 'running', 
            message: 'Démarrage de l\'auto-optimisation...',
            progress: 0
        });

        try {
            const { data } = await autoTuningLoop({
                test_question_id: selectedTestQuestion,
                ...autoOptimizationSettings
            });

            setOptimizationStatus({
                status: data.status === 'converged' ? 'success' : 'completed',
                message: `Auto-optimisation terminée: SPG ${data.initial_spg.toFixed(3)} → ${data.final_spg.toFixed(3)} (+${data.improvement_percent.toFixed(1)}%)`,
                data: data,
                progress: 100
            });

            toast.success(`Optimisation réussie! Amélioration: +${data.improvement_percent.toFixed(1)}%`);
            await loadData();
        } catch (error) {
            console.error('Auto-optimization failed:', error);
            setOptimizationStatus({ 
                status: 'error', 
                message: error.response?.data?.error || error.message,
                progress: 0
            });
            toast.error('Échec de l\'auto-optimisation');
        } finally {
            setIsOptimizing(false);
        }
    };

    const runSensitivityAnalysis = async () => {
        if (!selectedTestQuestion.trim()) {
            toast.error('Veuillez entrer une question de test');
            return;
        }

        setIsOptimizing(true);
        toast.info('Analyse de sensibilité en cours...');

        try {
            const { data } = await parameterSensitivityAnalysis({
                test_question_id: selectedTestQuestion,
                parameters_to_test: [],
                perturbation_factor: 0.1
            });

            setOptimizationStatus({
                status: 'analysis_complete',
                message: `Analyse terminée: ${data.critical_parameters?.length || 0} paramètres critiques identifiés`,
                data: data
            });

            toast.success(`Analyse terminée: ${data.parameters_tested} paramètres testés`);
        } catch (error) {
            console.error('Sensitivity analysis failed:', error);
            toast.error('Échec de l\'analyse de sensibilité');
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* System Status Banner */}
                {(systemStatus.ab_test || systemStatus.auto_opt) && (
                    <div className={`mb-4 p-3 rounded-lg border-2 ${
                        systemStatus.auto_opt 
                            ? 'bg-purple-900/30 border-purple-600' 
                            : 'bg-blue-900/30 border-blue-600'
                    }`}>
                        <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-white font-medium">
                                {systemStatus.auto_opt 
                                    ? '🔮 Mode Auto-Optimisation actif - Tests A/B bloqués'
                                    : 'ℹ️ Test A/B en cours - Auto-optimisation bloquée'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-green-300">Self-Optimization Dashboard</h1>
                            <p className="text-slate-400">Auto-tuning continu basé sur Base44 principles</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-purple-400" />
                                Paramètres Actifs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">{tunableParams.length}</div>
                            <p className="text-xs text-slate-400">Paramètres ajustables</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-400" />
                                Stratégies
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">{strategies.length}</div>
                            <p className="text-xs text-slate-400">Optimisations disponibles</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                Benchmarks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">{recentBenchmarks.length}</div>
                            <p className="text-xs text-slate-400">Tests récents</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Target className="w-4 h-4 text-green-400" />
                                SPG Moyen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">
                                {recentBenchmarks.length > 0
                                    ? (recentBenchmarks.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / recentBenchmarks.length).toFixed(3)
                                    : '---'}
                            </div>
                            <p className="text-xs text-slate-400">Score de performance global</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="auto_optimize" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="auto_optimize" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Auto-Optimization
                        </TabsTrigger>
                        <TabsTrigger value="parameters" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Settings className="w-4 h-4 mr-2" />
                            Paramètres
                        </TabsTrigger>
                        <TabsTrigger value="strategies" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Zap className="w-4 h-4 mr-2" />
                            Stratégies
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    {/* Auto-Optimization Tab */}
                    <TabsContent value="auto_optimize">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Lancer l'Auto-Optimisation</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Mode d'apprentissage continu avec ajustement automatique des paramètres
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Dataset Selection */}
                                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                    <label className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Source de Test
                                    </label>
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <Button
                                            variant={datasetType === 'custom' ? 'default' : 'outline'}
                                            onClick={() => setDatasetType('custom')}
                                            className={datasetType === 'custom' ? 'bg-purple-600' : 'border-slate-500'}
                                            disabled={isOptimizing}
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Question Personnalisée
                                        </Button>
                                        <Button
                                            variant={datasetType === 'benchmark' ? 'default' : 'outline'}
                                            onClick={() => setDatasetType('benchmark')}
                                            className={datasetType === 'benchmark' ? 'bg-purple-600' : 'border-slate-500'}
                                            disabled={isOptimizing}
                                        >
                                            <Target className="w-4 h-4 mr-2" />
                                            Dataset Benchmark
                                        </Button>
                                        <Button
                                            variant={datasetType === 'devtest' ? 'default' : 'outline'}
                                            onClick={() => setDatasetType('devtest')}
                                            className={datasetType === 'devtest' ? 'bg-purple-600' : 'border-slate-500'}
                                            disabled={isOptimizing}
                                        >
                                            <List className="w-4 h-4 mr-2" />
                                            Dataset Dev Tests
                                        </Button>
                                    </div>
                                </div>

                                {/* Question Selection */}
                                {datasetType !== 'custom' && (
                                    <div>
                                        <label className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
                                            Sélectionner une Question
                                            {availableQuestions.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {availableQuestions.length} disponibles
                                                </Badge>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => loadQuestions(datasetType)}
                                                disabled={loadingQuestions}
                                                className="h-6 w-6 p-0"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${loadingQuestions ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </label>
                                        <Select
                                            value={selectedQuestionId}
                                            onValueChange={(value) => {
                                                setSelectedQuestionId(value);
                                                const q = availableQuestions.find(q => q.id === value);
                                                if (q) setSelectedTestQuestion(q.question_text);
                                            }}
                                            disabled={isOptimizing || loadingQuestions}
                                        >
                                            <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                                <SelectValue placeholder={loadingQuestions ? "Chargement..." : "Choisir une question"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                {availableQuestions.map((q) => (
                                                    <SelectItem key={q.id} value={q.id} className="text-green-300">
                                                        {q.question_id || q.scenario_name} - {q.question_text?.substring(0, 60)}...
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">
                                        {datasetType === 'custom' ? 'Question de Test (Personnalisée)' : 'Question Sélectionnée (Aperçu)'}
                                    </label>
                                    <Textarea
                                        placeholder={datasetType === 'custom' ? "Entrez une question complexe pour tester l'optimisation..." : "Aperçu de la question sélectionnée"}
                                        value={selectedTestQuestion}
                                        onChange={(e) => {
                                            if (datasetType === 'custom') {
                                                setSelectedTestQuestion(e.target.value);
                                            }
                                        }}
                                        className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500"
                                        rows={4}
                                        disabled={isOptimizing || datasetType !== 'custom'}
                                    />
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-green-300 mb-2 block">
                                            Itérations Max
                                        </label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={autoOptimizationSettings.max_iterations}
                                            onChange={(e) => setAutoOptimizationSettings({
                                                ...autoOptimizationSettings,
                                                max_iterations: parseInt(e.target.value)
                                            })}
                                            className="bg-slate-700 border-slate-600 text-green-300"
                                            disabled={isOptimizing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-green-300 mb-2 block">
                                            Seuil Convergence
                                        </label>
                                        <Input
                                            type="number"
                                            min="0.5"
                                            max="1"
                                            step="0.01"
                                            value={autoOptimizationSettings.convergence_threshold}
                                            onChange={(e) => setAutoOptimizationSettings({
                                                ...autoOptimizationSettings,
                                                convergence_threshold: parseFloat(e.target.value)
                                            })}
                                            className="bg-slate-700 border-slate-600 text-green-300"
                                            disabled={isOptimizing}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-green-300 mb-2 block">
                                            Taux d'Exploration
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="0.5"
                                            step="0.05"
                                            value={autoOptimizationSettings.exploration_rate}
                                            onChange={(e) => setAutoOptimizationSettings({
                                                ...autoOptimizationSettings,
                                                exploration_rate: parseFloat(e.target.value)
                                            })}
                                            className="bg-slate-700 border-slate-600 text-green-300"
                                            disabled={isOptimizing}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={startAutoOptimization}
                                        disabled={isOptimizing || !selectedTestQuestion.trim() || systemStatus.ab_test}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                                        size="lg"
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Optimisation en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-5 h-5 mr-2" />
                                                Démarrer Auto-Optimisation
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={runSensitivityAnalysis}
                                        disabled={isOptimizing || !selectedTestQuestion.trim()}
                                        variant="outline"
                                        className="border-green-600 text-green-400"
                                        size="lg"
                                    >
                                        <Activity className="w-5 h-5 mr-2" />
                                        Analyse Sensibilité
                                    </Button>
                                </div>

                                {optimizationStatus && (
                                    <div className={`p-4 rounded-lg border-2 ${
                                        optimizationStatus.status === 'success' 
                                            ? 'bg-green-900/30 border-green-600'
                                            : optimizationStatus.status === 'error'
                                            ? 'bg-red-900/30 border-red-600'
                                            : 'bg-blue-900/30 border-blue-600'
                                    }`}>
                                        <div className="flex items-start gap-3">
                                            {optimizationStatus.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />}
                                            {optimizationStatus.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                                            {optimizationStatus.status === 'running' && <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />}
                                            
                                            <div className="flex-1">
                                                <p className="text-sm text-white font-medium mb-2">
                                                    {optimizationStatus.message}
                                                </p>
                                                
                                                {optimizationStatus.progress > 0 && (
                                                    <Progress 
                                                        value={optimizationStatus.progress} 
                                                        className="h-2 mb-2"
                                                    />
                                                )}

                                                {optimizationStatus.data?.log && (
                                                    <ScrollArea className="h-48 bg-slate-900 rounded p-3 mt-2">
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                                                            {optimizationStatus.data.log.join('\n')}
                                                        </pre>
                                                    </ScrollArea>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Parameters Tab */}
                    <TabsContent value="parameters">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Paramètres Ajustables</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Paramètres optimisés automatiquement par le système
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96">
                                    <div className="space-y-4">
                                        {tunableParams.map((param) => (
                                            <div key={param.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-medium text-green-300">{param.parameter_name}</h4>
                                                        <p className="text-xs text-slate-400">{param.description}</p>
                                                    </div>
                                                    <Badge className="bg-blue-600">
                                                        {param.parameter_category}
                                                    </Badge>
                                                </div>
                                                
                                                <div className="grid grid-cols-4 gap-3 text-sm mt-3">
                                                    <div>
                                                        <div className="text-slate-500 text-xs">Valeur Actuelle</div>
                                                        <div className="font-mono text-green-400">{param.current_value}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 text-xs">Par Défaut</div>
                                                        <div className="font-mono text-slate-300">{param.default_value}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 text-xs">Min-Max</div>
                                                        <div className="font-mono text-slate-300">{param.min_bound} - {param.max_bound}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500 text-xs">Impact</div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {param.impact_on_quality}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Strategies Tab */}
                    <TabsContent value="strategies">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Stratégies d'Optimisation</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Techniques Base44: TACO_RL, PromptWizard, NanoSurge, etc.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {strategies.map((strategy) => (
                                            <div key={strategy.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-medium text-green-300">{strategy.strategy_name}</h4>
                                                        <p className="text-xs text-slate-400 mt-1">{strategy.description}</p>
                                                    </div>
                                                    <Badge className="bg-purple-600">
                                                        {strategy.strategy_type}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 space-y-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Amélioration Attendue:</span>
                                                        <span className="text-green-400">{strategy.expected_improvement_range}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Impact Coût:</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {strategy.cost_impact}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Impact Qualité:</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {strategy.quality_impact}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Priorité:</span>
                                                        <span className="font-mono text-orange-400">{strategy.priority_level}/10</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* History Tab */}
                    <TabsContent value="history">
                        <div className="space-y-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-green-300 flex items-center gap-2">
                                                <History className="w-5 h-5" />
                                                Historique Complet des Optimisations
                                            </CardTitle>
                                            <CardDescription className="text-slate-400 mt-1">
                                                {recentBenchmarks.length} tests • Détails complets avec logs
                                            </CardDescription>
                                        </div>
                                        <Button
                                            onClick={loadData}
                                            variant="outline"
                                            size="sm"
                                            className="border-green-600 text-green-400"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Rafraîchir
                                        </Button>
                                    </div>
                                </CardHeader>
                            </Card>

                            <ScrollArea className="h-[800px]">
                                <div className="space-y-3 pr-4">
                                    {recentBenchmarks.map((benchmark, idx) => (
                                        <OptimizationHistoryItem
                                            key={benchmark.id}
                                            benchmark={benchmark}
                                            index={idx}
                                        />
                                    ))}

                                    {recentBenchmarks.length === 0 && (
                                        <Card className="bg-slate-800 border-slate-700">
                                            <CardContent className="p-12 text-center">
                                                <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-slate-400 mb-2">
                                                    Aucun Test Disponible
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    Lancez une auto-optimisation pour voir l'historique
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}