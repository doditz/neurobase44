import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Play,
    Loader2,
    Zap,
    Sparkles,
    BarChart3,
    Shield,
    FlaskConical,
    Layers
} from 'lucide-react';
import { toast } from 'sonner';
import BenchmarkComparison from '@/components/benchmark/BenchmarkComparison';
import UnifiedHistory from "@/components/benchmark/UnifiedHistory";
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';
import BatchSummaryModal from '@/components/benchmark/BatchSummaryModal';
import BatchProgressTracker from '@/components/benchmark/BatchProgressTracker';
import BatchQuickStats from '@/components/benchmark/BatchQuickStats';
import ExportAllButton from '@/components/benchmark/ExportAllButton';
import BatchScenarioConfig from '@/components/benchmark/BatchScenarioConfig';
import BatchDetailedLogs from '@/components/benchmark/BatchDetailedLogs';

const PREDEFINED_SCENARIOS = [
    {
        id: 'creative',
        title: 'Test Créatif',
        icon: Sparkles,
        color: 'bg-purple-600',
        prompt: 'Imagine une histoire courte sur un robot qui découvre l\'art de la peinture pour la première fois.',
        description: 'Teste la créativité et l\'imagination'
    },
    {
        id: 'analytical',
        title: 'Test Analytique',
        icon: BarChart3,
        color: 'bg-blue-600',
        prompt: 'Analyse les avantages et inconvénients de l\'énergie nucléaire vs les énergies renouvelables, avec des données chiffrées.',
        description: 'Teste le raisonnement logique et l\'analyse'
    },
    {
        id: 'ethical',
        title: 'Test Éthique',
        icon: Shield,
        color: 'bg-orange-600',
        prompt: 'Un médecin doit choisir entre sauver 5 patients avec un traitement expérimental ou garantir la survie d\'1 patient avec un traitement éprouvé. Que devrait-il faire ?',
        description: 'Teste le raisonnement éthique et moral'
    },
    {
        id: 'technical',
        icon: Zap,
        title: 'Test Technique',
        color: 'bg-green-600',
        prompt: 'Explique comment implémenter un algorithme de tri rapide (quicksort) en Python, avec optimisations et gestion des cas limites.',
        description: 'Teste les compétences techniques et la précision'
    }
];

const BATCH_SIZES = [5, 10, 15, 25, 50, 100];

export default function DevTestPage() {
    const [customPrompt, setCustomPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentTest, setCurrentTest] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [benchmarkHistory, setBenchmarkHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [activeTab, setActiveTab] = useState('quick-test');
    const [lastRunLogs, setLastRunLogs] = useState([]);

    // Batch states
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [batchProgress, setBatchProgress] = useState(null);
    const [batchStartTime, setBatchStartTime] = useState(null);
    const [batchElapsedTime, setBatchElapsedTime] = useState(0);
    const [showBatchSummary, setShowBatchSummary] = useState(false);
    const [batchSummaryData, setBatchSummaryData] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    // Poll batch progress
    useEffect(() => {
        let interval;
        if (isBatchRunning && batchProgress?.id) {
            interval = setInterval(async () => {
                try {
                    const progress = await base44.entities.BatchRunProgress.get(batchProgress.id);
                    setBatchProgress(progress);

                    if (progress.status === 'completed' || progress.status === 'failed') {
                        setIsBatchRunning(false);
                        if (progress.status === 'completed' && progress.summary_data) {
                            setBatchSummaryData(progress);
                            setShowBatchSummary(true);
                        }
                        await loadHistory();
                    }
                } catch (error) {
                    console.error('Error polling batch progress:', error);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isBatchRunning, batchProgress?.id]);

    // Update elapsed time
    useEffect(() => {
        let timer;
        if (isBatchRunning && batchStartTime) {
            timer = setInterval(() => {
                setBatchElapsedTime(Date.now() - batchStartTime);
            }, 500);
        }
        return () => clearInterval(timer);
    }, [isBatchRunning, batchStartTime]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            // FIXED: Use BenchmarkResult which has data
            const results = await base44.entities.BenchmarkResult.list('-created_date', 100);
            setBenchmarkHistory(results);
        } catch (error) {
            console.error('[DevTest] Failed to load history:', error);
            toast.error('Échec du chargement de l\'historique');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const runBenchmark = async (promptText, scenarioName = 'Custom') => {
        if (!promptText.trim()) {
            toast.error('Veuillez entrer un prompt');
            return;
        }

        setIsRunning(true);
        setCurrentTest({ prompt: promptText, scenario: scenarioName });
        setLastResult(null);
        setLastRunLogs([]);
        setActiveTab('results');

        try {
            toast.info('🚀 Lancement du test de développement...');

            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: promptText,
                question_id: `${scenarioName}_${Date.now()}`,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Le test a échoué sans message d\'erreur.');
            }

            setLastResult(data);
            setLastRunLogs(data.logs || data.full_debug_log || []);
            toast.success('✅ Test terminé!');
            
            setTimeout(async () => {
                await loadHistory();
                toast.info('📊 Historique mis à jour', { duration: 2000 });
            }, 2000);

        } catch (error) {
            console.error('[DevTest] Error:', error);
            toast.error(`Erreur: ${error.message}`);
            setLastResult({ error: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    const runBatchBenchmark = async (batchSize, scenarioConfig = null) => {
        if (isBatchRunning) {
            toast.error('Un batch est déjà en cours');
            return;
        }

        setIsBatchRunning(true);
        setBatchStartTime(Date.now());
        setBatchElapsedTime(0);
        setBatchProgress(null);
        setActiveTab('batch-tests');

        try {
            const message = scenarioConfig 
                ? `🚀 Démarrage du batch personnalisé (${batchSize} questions)...`
                : `🚀 Démarrage du batch de ${batchSize} questions...`;
            toast.info(message);

            const payload = {
                run_mode: 'batch',
                batch_count: batchSize
            };

            if (scenarioConfig) {
                payload.scenario_config = scenarioConfig;
            }

            const response = await base44.functions.invoke('benchmarkOrchestrator', payload);

            const { data } = response;

            if (!data || !data.success) {
                throw new Error(data?.error || 'Le batch a échoué');
            }

            if (data.progress_record) {
                setBatchProgress(data.progress_record);
            } else if (data.batch_id) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                try {
                    const progress = await base44.entities.BatchRunProgress.get(data.batch_id);
                    setBatchProgress(progress);
                } catch (error) {
                    const allProgress = await base44.entities.BatchRunProgress.list('-created_date', 1);
                    if (allProgress && allProgress.length > 0) {
                        setBatchProgress(allProgress[0]);
                    }
                }
            }

            toast.success(`✅ Batch de ${batchSize} questions démarré`);

        } catch (error) {
            console.error('[DevTest] Batch error:', error);
            toast.error(`Erreur batch: ${error.message}`);
            setIsBatchRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <FlaskConical className="w-8 h-8" />
                            Tests de Développement Neuronas
                        </h1>
                        <p className="text-slate-400 mt-1">Comparez Mode A (LLM seul) vs Mode B (Neuronas complet)</p>
                    </div>
                    <ExportAllButton limit={100} />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-800">
                        <TabsTrigger value="quick-test">Tests Rapides</TabsTrigger>
                        <TabsTrigger value="custom-test">Test Personnalisé</TabsTrigger>
                        <TabsTrigger value="batch-tests">
                            <Layers className="w-4 h-4 mr-2" />
                            Batch Tests
                        </TabsTrigger>
                        <TabsTrigger value="history">Historique ({benchmarkHistory.length})</TabsTrigger>
                        {(lastResult || isRunning) && <TabsTrigger value="results">Résultats</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="quick-test" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PREDEFINED_SCENARIOS.map((scenario) => {
                                const Icon = scenario.icon;
                                return (
                                    <Card
                                        key={scenario.id}
                                        className="bg-slate-800 border-slate-700 hover:border-orange-500 transition-all"
                                    >
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <div className={`w-10 h-10 ${scenario.color} rounded-lg flex items-center justify-center`}>
                                                    <Icon className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="text-green-400">{scenario.title}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-300 italic">"{scenario.prompt}"</p>
                                            <Button
                                                onClick={() => runBenchmark(scenario.prompt, scenario.title)}
                                                disabled={isRunning || isBatchRunning}
                                                className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                                            >
                                                {isRunning && currentTest?.scenario === scenario.title ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</>
                                                ) : (
                                                    <><Play className="w-4 h-4 mr-2" /> Lancer ce test</>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="custom-test" className="space-y-6">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Test Personnalisé</CardTitle>
                                <CardDescription>Entrez votre propre prompt pour tester l'architecture complète.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Entrez votre question ou prompt ici..."
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    className="min-h-32 bg-slate-700 border-slate-600 text-green-300"
                                    disabled={isRunning || isBatchRunning}
                                />
                                <Button
                                    onClick={() => runBenchmark(customPrompt, 'Custom')}
                                    disabled={isRunning || isBatchRunning || !customPrompt.trim()}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    {isRunning && currentTest?.scenario === 'Custom' ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exécution...</>
                                    ) : (
                                        <><Play className="w-4 h-4 mr-2" /> Lancer le test</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="batch-tests" className="space-y-6">
                        {isBatchRunning && batchProgress && (
                            <>
                                <BatchProgressTracker 
                                    progressData={batchProgress} 
                                    elapsedTime={batchElapsedTime}
                                />
                                {batchProgress.summary_data && (
                                    <BatchQuickStats summaryData={batchProgress.summary_data} />
                                )}
                                <BatchDetailedLogs progressData={batchProgress} />
                            </>
                        )}

                        {/* Scenario-Based Batch */}
                        <BatchScenarioConfig
                            onLaunchBatch={({ scenarioConfig, totalQuestions }) => 
                                runBatchBenchmark(totalQuestions, scenarioConfig)
                            }
                            disabled={isBatchRunning || isRunning}
                        />

                        {/* Quick Random Batch */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    Batch Aléatoire Rapide
                                </CardTitle>
                                <CardDescription>
                                    Exécutez plusieurs tests aléatoires
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {BATCH_SIZES.map(size => (
                                        <Button
                                            key={size}
                                            onClick={() => runBatchBenchmark(size)}
                                            disabled={isBatchRunning || isRunning}
                                            className="bg-indigo-600 hover:bg-indigo-700 h-16"
                                        >
                                            {isBatchRunning ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Layers className="w-4 h-4 mr-2" />
                                            )}
                                            <div>
                                                <div className="font-bold text-lg">{size}</div>
                                                <div className="text-xs opacity-75">questions</div>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        <UnifiedHistory
                            benchmarks={benchmarkHistory}
                            isLoading={isLoadingHistory}
                            onSelectBenchmark={(b) => {
                                setLastResult(b);
                                setLastRunLogs(b.full_debug_log || []);
                                setActiveTab('results');
                            }}
                            onRefresh={loadHistory}
                        />
                    </TabsContent>

                    {(lastResult || isRunning) && (
                        <TabsContent value="results" className="space-y-6">
                             {isRunning && !lastResult ? (
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-12 flex flex-col items-center justify-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-green-400 mb-4" />
                                        <p className="text-slate-400">Test en cours...</p>
                                    </CardContent>
                                </Card>
                            ) : lastResult?.error ? (
                                <Card className="bg-red-900/20 border-red-500">
                                     <CardHeader>
                                        <CardTitle className="text-red-400">Erreur de Test</CardTitle>
                                     </CardHeader>
                                     <CardContent>
                                        <p className="text-slate-300 whitespace-pre-wrap">{lastResult.error}</p>
                                     </CardContent>
                                </Card>
                            ) : lastResult ? (
                                <BenchmarkComparison benchmark={lastResult} />
                            ) : null}
                        </TabsContent>
                    )}
                </Tabs>

                <BatchSummaryModal
                    isOpen={showBatchSummary}
                    onClose={() => setShowBatchSummary(false)}
                    progressData={batchSummaryData}
                />
            </div>
        </div>
    );
}