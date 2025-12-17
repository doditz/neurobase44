import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Play, Loader2, Zap, BarChart3, CheckCircle2,
    AlertCircle, Brain, TrendingUp, Clock, Award,
    FileText, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function DynamicGradingTestPage() {
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('dataset');

    useEffect(() => {
        loadQuestions();
    }, []);

    const handleFixDatasets = async () => {
        setIsLoading(true);
        try {
            const { data } = await base44.functions.invoke('fixDatasetLoading');
            if (data.success) {
                toast.success(`✅ ${data.message}`);
                await loadQuestions();
            } else {
                toast.error('❌ Fix failed');
            }
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuestions = async () => {
        try {
            const data = await base44.entities.DevTestQuestion.list();
            setQuestions(data);
            if (data.length > 0) {
                setSelectedQuestion(data[0]);
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
            toast.error('Échec du chargement des questions');
        }
    };

    // Helper function to retry loading benchmark with exponential backoff
    const loadBenchmarkWithRetry = async (benchmarkId, maxRetries = 8) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[DynamicGradingTest] Loading benchmark ${benchmarkId} (attempt ${attempt}/${maxRetries})`);
                const benchmark = await base44.entities.DevTestResult.get(benchmarkId);
                console.log(`[DynamicGradingTest] ✅ Benchmark loaded successfully on attempt ${attempt}`);
                return benchmark;
            } catch (error) {
                console.warn(`[DynamicGradingTest] ⚠️ Attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt < maxRetries) {
                    const delay = 400 * attempt; // 400ms, 800ms, 1.2s, 1.6s, etc.
                    console.log(`[DynamicGradingTest] Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw new Error(`Benchmark not accessible after ${maxRetries} attempts: ${error.message}`);
                }
            }
        }
    };

    const runTest = async (promptText, questionId = null) => {
        if (!promptText.trim()) {
            toast.error('Veuillez entrer une question');
            return;
        }

        setIsRunning(true);
        setResult(null);

        try {
            toast.info('🧪 Test en cours avec LLM Grader dynamique...');

            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: promptText,
                question_id: questionId,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Test échoué');
            }

            // Charger le benchmark complet créé avec retry AMÉLIORÉ
            if (data.benchmark_id) {
                toast.info('⏳ Chargement des résultats détaillés...');
                
                try {
                    const fullBenchmark = await loadBenchmarkWithRetry(data.benchmark_id);
                    
                    // VÉRIFIER QUE LES LOGS SONT PRÉSENTS
                    if (!fullBenchmark.full_debug_log || fullBenchmark.full_debug_log.length === 0) {
                        console.warn('[DynamicGradingTest] Benchmark lacks logs, using response logs');
                        fullBenchmark.full_debug_log = data.logs || data.full_debug_log || [];
                    }
                    
                    setResult(fullBenchmark);
                    toast.success('✅ Test terminé avec évaluation dynamique!');
                } catch (retryError) {
                    console.error('[DynamicGradingTest] Failed to load benchmark after retries:', retryError);
                    // Fallback: use data from orchestrator response
                    toast.warning('⚠️ Résultats partiels affichés (benchmark en cours de propagation)');
                    setResult({
                        ...data,
                        scenario_name: questionId || 'Custom Test',
                        test_prompt: promptText,
                        global_score_performance: data.spg,
                        passed: data.winner === 'mode_b',
                        cpu_savings_percentage: data.improvement,
                        token_savings_percentage: data.token_reduction,
                        mode_a_response: data.benchmark_result?.mode_a?.response || '',
                        mode_a_time_ms: data.benchmark_result?.mode_a?.time_ms || 0,
                        mode_a_token_count: data.benchmark_result?.mode_a?.tokens || 0,
                        mode_b_response: data.benchmark_result?.mode_b?.response || '',
                        mode_b_time_ms: data.benchmark_result?.mode_b?.time_ms || 0,
                        mode_b_token_count: data.benchmark_result?.mode_b?.tokens || 0,
                        mode_b_personas_used: data.benchmark_result?.mode_b?.personas || [],
                        mode_b_debate_rounds: 3,
                        full_debug_log: data.logs || data.full_debug_log || []
                    });
                }
            } else {
                // No benchmark_id returned, use data directly
                setResult(data);
                toast.success('✅ Test terminé!');
            }

            setActiveTab('results');

        } catch (error) {
            console.error('[DynamicGradingTest] Error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-8 h-8 text-orange-500" />
                        <h1 className="text-3xl font-bold text-green-300">Test d'Efficacité avec LLM Grader</h1>
                    </div>
                    <p className="text-slate-400">
                        Évaluation dynamique de qualité par un LLM arbitre • Mode A (baseline) vs Mode B (Neuronas)
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-800">
                        <TabsTrigger value="dataset">Dataset Questions</TabsTrigger>
                        <TabsTrigger value="custom">Question Personnalisée</TabsTrigger>
                        {result && <TabsTrigger value="results">Résultats</TabsTrigger>}
                    </TabsList>

                    {/* Dataset Tab */}
                    <TabsContent value="dataset">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Sélectionner une question du dataset</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select
                                    value={selectedQuestion?.id}
                                    onValueChange={(id) => setSelectedQuestion(questions.find(q => q.id === id))}
                                    disabled={isRunning}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                        <SelectValue placeholder="Choisir une question" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600">
                                        {questions.map(q => (
                                            <SelectItem key={q.id} value={q.id} className="text-green-300">
                                                {q.question_id} - {q.question_text.substring(0, 50)}...
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedQuestion && (
                                    <div className="bg-slate-700 p-4 rounded-lg space-y-3">
                                        <p className="text-sm text-slate-300">{selectedQuestion.question_text}</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <Badge className="bg-indigo-600">{selectedQuestion.question_type}</Badge>
                                            <Badge className="bg-purple-600">{selectedQuestion.niveau_complexite}</Badge>
                                            {selectedQuestion.hemisphere_dominant && (
                                                <Badge className="bg-blue-600">{selectedQuestion.hemisphere_dominant}</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={() => runTest(selectedQuestion?.question_text, selectedQuestion?.question_id)}
                                    disabled={isRunning || !selectedQuestion}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Test en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Lancer le test A/B
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Custom Tab */}
                    <TabsContent value="custom">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Question Personnalisée</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Entrez votre question ici..."
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    className="min-h-32 bg-slate-700 border-slate-600 text-green-300"
                                    disabled={isRunning}
                                />
                                <Button
                                    onClick={() => runTest(customPrompt)}
                                    disabled={isRunning || !customPrompt.trim()}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Exécution...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Lancer le test A/B
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Results Tab */}
                    {result && (
                        <TabsContent value="results" className="space-y-6">
                            {/* Winner Card */}
                            <Card className={`border-2 ${result.winner === 'mode_b' ? 'border-green-500 bg-green-900/20' : 'border-orange-500 bg-orange-900/20'}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        {result.winner === 'mode_b' ? (
                                            <>
                                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                                <span className="text-green-400">Mode B Wins! (Neuronas)</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-6 h-6 text-orange-400" />
                                                <span className="text-orange-400">Mode A Wins (Baseline)</span>
                                            </>
                                        )}
                                        {result.passed !== undefined && (
                                            <Badge className={result.passed ? 'bg-green-600' : 'bg-red-600'}>
                                                {result.passed ? 'PASS' : 'FAIL'}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.grader_rationale && (
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" />
                                                Raisonnement du Grader:
                                            </h4>
                                            <p className="text-sm text-slate-300 italic whitespace-pre-wrap">{result.grader_rationale}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-slate-400">SPG</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-400">
                                            {result.global_score_performance ? result.global_score_performance.toFixed(3) : 'N/A'}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-slate-400">CPU Savings</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-400">
                                            {result.cpu_savings_percentage?.toFixed(1) || result.performance_improvement?.toFixed(1) || '0'}%
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Zap className="w-4 h-4 text-yellow-400" />
                                            <span className="text-xs text-slate-400">Token Savings</span>
                                        </div>
                                        <p className="text-2xl font-bold text-yellow-400">
                                            {result.token_savings_percentage?.toFixed(1) || '0'}%
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Brain className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs text-slate-400">Personas</span>
                                        </div>
                                        <p className="text-2xl font-bold text-purple-400">
                                            {result.mode_b_personas_used?.length || 0}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Quality Scores Comparison */}
                            {result.quality_scores && (
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5" />
                                            Scores de Qualité (LLM Grader)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Mode A Scores */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                                    Mode A (Baseline LLM)
                                                </h4>

                                                {result.quality_scores.A ? (
                                                    Object.entries(result.quality_scores.A).map(([key, value]) => (
                                                        <div key={key}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs text-slate-400 capitalize">
                                                                    {key.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-xs font-mono text-orange-400">
                                                                    {typeof value === 'number' ? value.toFixed(2) : value}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={typeof value === 'number' ? value * 100 : 0}
                                                                className="h-2 bg-slate-700"
                                                            />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-500">Scores non disponibles</p>
                                                )}
                                            </div>

                                            {/* Mode B Scores */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                                    Mode B (Neuronas)
                                                </h4>

                                                {result.quality_scores.B ? (
                                                    Object.entries(result.quality_scores.B).map(([key, value]) => (
                                                        <div key={key}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs text-slate-400 capitalize">
                                                                    {key.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-xs font-mono text-green-400">
                                                                    {typeof value === 'number' ? value.toFixed(2) : value}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={typeof value === 'number' ? value * 100 : 0}
                                                                className="h-2 bg-slate-700"
                                                            />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-500">Scores non disponibles</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Overall Comparison */}
                                        <div className="mt-6 pt-6 border-t border-slate-700">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-600/30">
                                                    <div className="text-xs text-slate-400 mb-1">Score Global Mode A</div>
                                                    <div className="text-2xl font-bold text-orange-400">
                                                        {result.quality_scores.A?.ars_score?.toFixed(3) || 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="bg-green-900/20 p-3 rounded-lg border border-green-600/30">
                                                    <div className="text-xs text-slate-400 mb-1">Score Global Mode B</div>
                                                    <div className="text-2xl font-bold text-green-400">
                                                        {result.quality_scores.B?.ars_score?.toFixed(3) || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400">Temps de Traitement</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Mode A:</span>
                                                <span className="text-orange-400 font-mono">
                                                    {result.mode_a_time_ms ? (result.mode_a_time_ms / 1000).toFixed(2) : '0'}s
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Mode B:</span>
                                                <span className="text-green-400 font-mono">
                                                    {result.mode_b_time_ms ? (result.mode_b_time_ms / 1000).toFixed(2) : '0'}s
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400">Tokens Utilisés</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Mode A:</span>
                                                <span className="text-orange-400 font-mono">
                                                    {result.mode_a_token_count?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Mode B:</span>
                                                <span className="text-green-400 font-mono">
                                                    {result.mode_b_token_count?.toLocaleString() || '0'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-slate-400">Configuration</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Rondes:</span>
                                                <span className="text-purple-400 font-mono">
                                                    {result.mode_b_debate_rounds || 3}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Personas:</span>
                                                <span className="text-purple-400 font-mono">
                                                    {result.mode_b_personas_used?.length || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Responses Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="bg-slate-800 border-orange-600">
                                    <CardHeader>
                                        <CardTitle className="text-orange-400 text-sm flex items-center gap-2">
                                            <div className="w-3 h-3 bg-orange-500 rounded-full" />
                                            Mode A Response
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                                {result.mode_a_response || 'Aucune réponse'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-green-600">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                                            Mode B Response (Neuronas)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                                {result.mode_b_response || 'Aucune réponse'}
                                            </p>
                                        </div>

                                        {/* Personas Used */}
                                        {result.mode_b_personas_used && result.mode_b_personas_used.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-xs text-slate-400 mb-2">Personas Activées:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {result.mode_b_personas_used.map((persona, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {persona}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Test Prompt */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-400 text-sm">Prompt de Test</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-slate-700 p-4 rounded-lg">
                                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                            {result.test_prompt}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Logs */}
                            {result.full_debug_log && result.full_debug_log.length > 0 && (
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 text-sm">Debug Logs</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
                                            {result.full_debug_log.map((log, idx) => (
                                                <div key={idx} className="text-slate-400 py-0.5">
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}