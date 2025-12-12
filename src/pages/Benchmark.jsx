
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

export default function BenchmarkPage() {
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
        if (isBatchRunning && batchProgress?.id) { // Use batchProgress.id for polling
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
    }, [isBatchRunning, batchProgress?.id]); // Depend on batchProgress.id

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
            const results = await base44.entities.BenchmarkResult.list('-created_date', 100);
            setBenchmarkHistory(results);
        } catch (error) {
            console.error('[Benchmark] Failed to load history:', error);
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
            toast.info('🚀 Lancement du benchmark unifié...');

            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: promptText,
                question_id: `${scenarioName}_${Date.now()}`,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Le benchmark a échoué sans message d\'erreur.');
            }

            // IMPORTANT: Attendre la propagation avant de recharger l'historique
            setLastResult(data);
            setLastRunLogs(data.logs || data.full_debug_log || []); // Changed line
            toast.success('✅ Benchmark terminé!');
            
            // Attendre 2 secondes puis recharger l'historique
            setTimeout(async () => {
                await loadHistory();
                toast.info('📊 Historique mis à jour', { duration: 2000 });
            }, 2000);

        } catch (error) {
            console.error('[Benchmark] Error:', error);
            toast.error(`Erreur: ${error.message}`);
            setLastResult({ error: error.message });
        } finally {
            setIsRunning(false);
        }
    };

    const runBatchBenchmark = async (batchSize) => {
        if (isBatchRunning) {
            toast.error('Un batch est déjà en cours');
            return;
        }

        console.log('[Benchmark] Starting batch run with size:', batchSize);
        setIsBatchRunning(true);
        setBatchStartTime(Date.now());
        setBatchElapsedTime(0);
        setBatchProgress(null); // Clear previous progress when starting a new batch
        setActiveTab('batch-tests');

        try {
            toast.info(`🚀 Démarrage du batch de ${batchSize} questions...`);

            console.log('[Benchmark] Invoking benchmarkOrchestrator with:', {
                run_mode: 'batch',
                batch_count: batchSize
            });

            const response = await base44.functions.invoke('benchmarkOrchestrator', {
                run_mode: 'batch',
                batch_count: batchSize
            });

            console.log('[Benchmark] Full response received:', response);

            const { data } = response;

            if (!data) {
                console.error('[Benchmark] No data in response:', response);
                throw new Error('Aucune donnée reçue du serveur');
            }

            if (!data.success) {
                console.error('[Benchmark] Error in response:', data);
                const errorMsg = data.error || data.message || 'Le batch a échoué sans message d\'erreur';
                throw new Error(errorMsg);
            }

            console.log('[Benchmark] Batch started successfully:', data);

            // Set initial progress
            if (data.progress_record) {
                setBatchProgress(data.progress_record);
                console.log('[Benchmark] Progress record set from response');
            } else if (data.batch_id) {
                // Wait a moment for entity creation, then fetch
                await new Promise(resolve => setTimeout(resolve, 1500)); // Increased wait time
                
                try {
                    console.log('[Benchmark] Fetching progress by ID:', data.batch_id);
                    const progress = await base44.entities.BatchRunProgress.get(data.batch_id);
                    setBatchProgress(progress);
                    console.log('[Benchmark] Progress record fetched successfully');
                } catch (error) {
                    console.error('[Benchmark] Failed to fetch progress record:', error.message); // Log error message
                    
                    // Try to list instead of get
                    try {
                        console.log('[Benchmark] Trying to list progress records...');
                        const allProgress = await base44.entities.BatchRunProgress.list('-created_date', 1);
                        if (allProgress && allProgress.length > 0) {
                            setBatchProgress(allProgress[0]);
                            console.log('[Benchmark] Using latest progress record');
                        } else {
                            toast.warning('Batch démarré mais impossible de trouver un enregistrement de progression');
                        }
                    } catch (listError) {
                        console.error('[Benchmark] Failed to list progress:', listError.message); // Log list error message
                        toast.warning('Batch démarré mais impossible de suivre la progression');
                    }
                }
            } else {
                console.warn('[Benchmark] No progress_record or batch_id in response');
                toast.warning('Batch démarré mais aucune ID de progression fournie');
            }

            toast.success(`✅ Batch de ${batchSize} questions démarré`);

        } catch (error) {
            console.error('[Benchmark] Batch error:', error);
            console.error('[Benchmark] Error message:', error.message);
            
            // More detailed error message
            let errorMessage = error.message || 'Erreur inconnue';
            
            if (error.response) {
                console.error('[Benchmark] Server response:', error.response);
                const errorData = error.response.data || {};
                console.error('[Benchmark] Error data:', errorData);
                
                if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (error.response.statusText) {
                    errorMessage = `${error.response.status}: ${error.response.statusText}`;
                }
                
                // Log any additional details
                if (errorData.logs) {
                    console.log('[Benchmark] Server logs:', errorData.logs);
                }
                if (errorData.details) {
                    console.log('[Benchmark] Error details:', errorData.details);
                }
            }
            
            toast.error(`Erreur batch: ${errorMessage}`, { duration: 8000 }); // Longer toast duration for errors
            setIsBatchRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <FlaskConical className="w-8 h-8" />
                            Tests d'Efficacité Neuronas
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
                                        <><Play className="w-4 h-4 mr-2" /> Lancer le benchmark</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="batch-tests" className="space-y-6">
                        {/* Batch Progress */}
                        {isBatchRunning && batchProgress && (
                            <>
                                <BatchProgressTracker 
                                    progressData={batchProgress} 
                                    elapsedTime={batchElapsedTime}
                                />
                                {batchProgress.summary_data && (
                                    <BatchQuickStats summaryData={batchProgress.summary_data} />
                                )}
                            </>
                        )}

                        {/* Batch Controls */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    Lancer un Batch Test
                                </CardTitle>
                                <CardDescription>
                                    Exécutez plusieurs benchmarks séquentiellement sur des questions aléatoires
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
                                <div className="mt-4 text-xs text-slate-400 flex items-start gap-2">
                                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>
                                        Les tests batch s'exécutent séquentiellement. Chaque question est testée avec Mode A et Mode B.
                                        Un rapport détaillé sera généré automatiquement à la fin.
                                    </p>
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
                                        <p className="text-slate-400">Benchmark en cours...</p>
                                    </CardContent>
                                </Card>
                            ) : lastResult?.error ? (
                                <Card className="bg-red-900/20 border-red-500">
                                     <CardHeader>
                                        <CardTitle className="text-red-400">Erreur de Benchmark</CardTitle>
                                     </CardHeader>
                                     <CardContent>
                                        <p className="text-slate-300">{lastResult.error}</p>
                                     </CardContent>
                                </Card>
                            ) : lastResult ? (
                                <BenchmarkComparison benchmark={lastResult} />
                            ) : null}
                            {lastRunLogs.length > 0 && (
                                <UnifiedLogViewer logs={lastRunLogs} />
                            )}
                        </TabsContent>
                    )}
                </Tabs>

                {/* Batch Summary Modal */}
                <BatchSummaryModal
                    isOpen={showBatchSummary}
                    onClose={() => setShowBatchSummary(false)}
                    progressData={batchSummaryData}
                />
            </div>
        </div>
    );
}
