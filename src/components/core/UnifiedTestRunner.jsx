/**
 * UNIFIED TEST RUNNER COMPONENT
 * 
 * Single component for running benchmarks/devtests.
 * Used by both Benchmark and DevTest pages.
 * Saves all results to UnifiedLog.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Loader2, Layers, RefreshCw, Radio, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createLogger, saveToUnifiedLog } from '@/components/core/NeuronasLogger';

// Sub-components (lazy loaded for performance)
import BenchmarkComparison from '@/components/benchmark/BenchmarkComparison';
import UnifiedHistory from '@/components/benchmark/UnifiedHistory';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';
import BatchProgressTracker from '@/components/benchmark/BatchProgressTracker';
import BatchQuickStats from '@/components/benchmark/BatchQuickStats';
import BatchSummaryModal from '@/components/benchmark/BatchSummaryModal';

const BATCH_SIZES = [5, 10, 15, 25, 50, 100];

export default function UnifiedTestRunner({
    // Configuration props
    testType = 'benchmark', // 'benchmark' | 'devtest'
    title = 'Test Runner',
    subtitle = 'Run tests',
    scenarios = [],
    entityName = 'BenchmarkResult', // Which entity to load history from
    orchestratorFunction = 'benchmarkOrchestrator',
    
    // Optional customization
    showBatchConfig = false,
    BatchConfigComponent = null,
    ExportComponent = null,
    EnhancedLogsComponent = null,
    
    // Style
    accentColor = 'orange'
}) {
    // Logger for this session
    const [sessionLogger] = useState(() => createLogger(`${testType}_runner`));
    
    // Core state
    const [customPrompt, setCustomPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentTest, setCurrentTest] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [activeTab, setActiveTab] = useState('quick-test');
    const [lastRunLogs, setLastRunLogs] = useState([]);

    // Batch state
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [batchProgress, setBatchProgress] = useState(null);
    const [batchStartTime, setBatchStartTime] = useState(null);
    const [batchElapsedTime, setBatchElapsedTime] = useState(0);
    const [showBatchSummary, setShowBatchSummary] = useState(false);
    const [batchSummaryData, setBatchSummaryData] = useState(null);

    // Load history on mount
    useEffect(() => {
        loadHistory();
        sessionLogger.info(`${testType} runner initialized`);
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
                        sessionLogger.info('Batch completed', { status: progress.status });
                        
                        if (progress.status === 'completed' && progress.summary_data) {
                            setBatchSummaryData(progress);
                            setShowBatchSummary(true);
                        }
                        await loadHistory();
                    }
                } catch (error) {
                    sessionLogger.error('Batch poll error', { error: error.message });
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isBatchRunning, batchProgress?.id]);

    // Elapsed time timer
    useEffect(() => {
        let timer;
        if (isBatchRunning && batchStartTime) {
            timer = setInterval(() => {
                setBatchElapsedTime(Date.now() - batchStartTime);
            }, 500);
        }
        return () => clearInterval(timer);
    }, [isBatchRunning, batchStartTime]);

    const loadHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const results = await base44.entities[entityName].list('-created_date', 100);
            setHistory(results);
            sessionLogger.debug('History loaded', { count: results.length });
        } catch (error) {
            sessionLogger.error('Failed to load history', { error: error.message });
            toast.error('Échec du chargement de l\'historique');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [entityName]);

    // Real-time SSE streaming state
    const [streamingLogs, setStreamingLogs] = useState([]);
    const [streamingPhase, setStreamingPhase] = useState(null);
    const [streamingMetrics, setStreamingMetrics] = useState({});
    const eventSourceRef = useRef(null);

    // Cleanup SSE on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const runTest = async (promptText, scenarioName = 'Custom') => {
        if (!promptText.trim()) {
            toast.error('Veuillez entrer un prompt');
            return;
        }

        const testLogger = createLogger(`${testType}_single`);
        testLogger.startOperation(scenarioName);

        setIsRunning(true);
        setCurrentTest({ prompt: promptText, scenario: scenarioName });
        setLastResult(null);
        setLastRunLogs([]);
        setStreamingLogs([]);
        setStreamingPhase('init');
        setStreamingMetrics({});
        setActiveTab('results');

        // Close any existing SSE connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            toast.info('🚀 Lancement du test en streaming...');

            // Call the streaming function via base44 SDK
            const { data: streamData } = await base44.functions.invoke('streamTestLogs', {
                question_text: promptText,
                question_id: `${scenarioName}_${Date.now()}`,
                run_mode: 'ab_test',
                orchestrator: orchestratorFunction
            });
            
            // The response is the raw SSE text - parse it
            if (typeof streamData === 'string' && streamData.includes('event:')) {
                // Parse the SSE events from the string response
                const events = streamData.split('\n\n').filter(e => e.trim());
                for (const eventBlock of events) {
                    const lines = eventBlock.split('\n');
                    let eventType = 'message';
                    let eventData = '';
                    
                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.slice(7);
                        } else if (line.startsWith('data: ')) {
                            eventData = line.slice(6);
                        }
                    }
                    
                    if (eventData) {
                        try {
                            const data = JSON.parse(eventData);
                            handleSSEEvent(eventType, data, testLogger, scenarioName);
                        } catch (e) {
                            console.warn('Failed to parse SSE event:', eventData);
                        }
                    }
                }
                setIsRunning(false);
                return;
            }
            
            // If we got a JSON response instead (error or non-streaming)
            if (streamData && typeof streamData === 'object') {
                if (streamData.error) {
                    throw new Error(streamData.error);
                }
                // Treat as completed test
                testLogger.endOperation(scenarioName, { success: true });
                setLastResult(streamData);
                setStreamingPhase('complete');
                setIsRunning(false);
                toast.success('✅ Test terminé!');
                setTimeout(() => loadHistory(), 2000);
                return;
            }
            
            // Fallback if response format is unexpected
            throw new Error('Unexpected response format from streaming endpoint');
            


        } catch (error) {
            // Fallback to regular invoke if SSE fails
            console.warn('SSE failed, falling back to regular invoke:', error.message);
            await runTestFallback(promptText, scenarioName, testLogger);
        }
    };

    const handleSSEEvent = (event, data, testLogger, scenarioName) => {
        switch (event) {
            case 'connected':
                setStreamingLogs(prev => [...prev, { 
                    level: 'SYSTEM', 
                    message: `Connected to stream: ${data.session_id}`,
                    timestamp: Date.now()
                }]);
                break;

            case 'log':
                setStreamingLogs(prev => [...prev, {
                    level: data.level || 'INFO',
                    message: data.message,
                    phase: data.phase,
                    timestamp: data.timestamp || Date.now()
                }]);
                if (data.metrics) {
                    setStreamingMetrics(prev => ({ ...prev, ...data.metrics }));
                }
                break;

            case 'phase':
                setStreamingPhase(data.phase);
                if (data.time_ms) {
                    setStreamingMetrics(prev => ({ 
                        ...prev, 
                        [`${data.phase}_time_ms`]: data.time_ms 
                    }));
                }
                break;

            case 'complete':
                testLogger.endOperation(scenarioName, { success: true, spg: data.spg });
                setLastResult({
                    success: true,
                    ...data
                });
                setLastRunLogs(streamingLogs.map(l => `[${l.level}] ${l.message}`));
                setIsRunning(false);
                setStreamingPhase('complete');
                toast.success('✅ Test terminé!');

                // Save to UnifiedLog
                saveToUnifiedLog(testLogger, {
                    source_type: testType,
                    source_id: data.benchmark_id,
                    execution_context: `${testType}_page_streaming`,
                    metrics: {
                        spg: data.spg,
                        quality: data.quality_scores?.mode_b_ars_score,
                        latency_ms: data.metrics?.mode_b_time_ms,
                        tokens: data.metrics?.mode_b_tokens
                    },
                    result_summary: `${scenarioName}: ${data.winner === 'mode_b' ? 'NEURONAS wins' : data.winner === 'mode_a' ? 'Baseline wins' : 'Tie'}`,
                    winner: data.winner,
                    status: 'success'
                });

                setTimeout(() => loadHistory(), 2000);
                break;

            case 'error':
                testLogger.error('Test failed', { error: data.message });
                setStreamingLogs(prev => [...prev, {
                    level: 'ERROR',
                    message: `❌ Error: ${data.message}`,
                    timestamp: Date.now()
                }]);
                if (data.fatal) {
                    setLastResult({ error: data.message });
                    setIsRunning(false);
                    toast.error(`Erreur: ${data.message}`);
                }
                break;
        }
    };

    // Fallback function when SSE is not available
    const runTestFallback = async (promptText, scenarioName, testLogger) => {
        try {
            setStreamingLogs([{ level: 'INFO', message: '⚠️ Fallback mode - SSE unavailable', timestamp: Date.now() }]);

            const { data } = await base44.functions.invoke(orchestratorFunction, {
                question_text: promptText,
                question_id: `${scenarioName}_${Date.now()}`,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Le test a échoué');
            }

            testLogger.endOperation(scenarioName, { success: true, spg: data.global_score_performance });
            
            setLastResult(data);
            setLastRunLogs(data.logs || data.full_debug_log || []);
            setStreamingPhase('complete');
            toast.success('✅ Test terminé!');

            // Save to UnifiedLog
            await saveToUnifiedLog(testLogger, {
                source_type: testType,
                source_id: data.id,
                execution_context: `${testType}_page_fallback`,
                metrics: {
                    spg: data.global_score_performance,
                    quality: data.quality_scores?.mode_b_ars_score,
                    latency_ms: data.mode_b_time_ms,
                    tokens: data.mode_b_token_count
                },
                result_summary: `${scenarioName}: ${data.winner === 'mode_b' ? 'NEURONAS wins' : data.winner === 'mode_a' ? 'Baseline wins' : 'Tie'}`,
                winner: data.winner,
                status: 'success'
            });

            setTimeout(() => loadHistory(), 2000);

        } catch (error) {
            testLogger.error('Test failed', { error: error.message });
            toast.error(`Erreur: ${error.message}`);
            setLastResult({ error: error.message });
            
            await saveToUnifiedLog(testLogger, {
                source_type: testType,
                execution_context: `${testType}_page_fallback`,
                status: 'failed',
                error_message: error.message
            });
        } finally {
            setIsRunning(false);
        }
    };

    const runBatch = async (batchSize, scenarioConfig = null) => {
        if (isBatchRunning) {
            toast.error('Un batch est déjà en cours');
            return;
        }

        const batchLogger = createLogger(`${testType}_batch`);
        batchLogger.startOperation(`Batch_${batchSize}`);

        setIsBatchRunning(true);
        setBatchStartTime(Date.now());
        setBatchElapsedTime(0);
        setBatchProgress(null);
        setActiveTab('batch-tests');

        try {
            toast.info(`🚀 Démarrage du batch de ${batchSize} questions...`);

            const payload = {
                run_mode: 'batch',
                batch_count: batchSize
            };
            if (scenarioConfig) payload.scenario_config = scenarioConfig;

            const { data } = await base44.functions.invoke(orchestratorFunction, payload);

            if (!data || !data.success) {
                throw new Error(data?.error || 'Le batch a échoué');
            }

            batchLogger.info('Batch started', { batch_id: data.batch_id });

            // Set progress tracking
            if (data.progress_record) {
                setBatchProgress(data.progress_record);
            } else if (data.batch_id) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                try {
                    const progress = await base44.entities.BatchRunProgress.get(data.batch_id);
                    setBatchProgress(progress);
                } catch {
                    const allProgress = await base44.entities.BatchRunProgress.list('-created_date', 1);
                    if (allProgress?.length > 0) setBatchProgress(allProgress[0]);
                }
            }

            toast.success(`✅ Batch de ${batchSize} questions démarré`);

        } catch (error) {
            batchLogger.error('Batch failed', { error: error.message });
            toast.error(`Erreur batch: ${error.message}`);
            setIsBatchRunning(false);
            
            await saveToUnifiedLog(batchLogger, {
                source_type: testType,
                execution_context: `${testType}_batch`,
                status: 'failed',
                error_message: error.message
            });
        }
    };

    const buttonColorClass = accentColor === 'orange' 
        ? 'bg-orange-600 hover:bg-orange-700' 
        : accentColor === 'purple'
        ? 'bg-purple-600 hover:bg-purple-700'
        : 'bg-green-600 hover:bg-green-700';

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-slate-800">
                    <TabsTrigger value="quick-test">Tests Rapides</TabsTrigger>
                    <TabsTrigger value="custom-test">Test Personnalisé</TabsTrigger>
                    <TabsTrigger value="batch-tests">
                        <Layers className="w-4 h-4 mr-2" />
                        Batch Tests
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        Historique ({history.length})
                    </TabsTrigger>
                    {(lastResult || isRunning) && (
                        <TabsTrigger value="results">Résultats</TabsTrigger>
                    )}
                </TabsList>

                {/* Quick Tests */}
                <TabsContent value="quick-test" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scenarios.map((scenario) => {
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
                                            onClick={() => runTest(scenario.prompt, scenario.title)}
                                            disabled={isRunning || isBatchRunning}
                                            className={`w-full mt-4 ${buttonColorClass}`}
                                        >
                                            {isRunning && currentTest?.scenario === scenario.title ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</>
                                            ) : (
                                                <><Play className="w-4 h-4 mr-2" /> Lancer</>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Custom Test */}
                <TabsContent value="custom-test" className="space-y-6">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400">Test Personnalisé</CardTitle>
                            <CardDescription>Entrez votre propre prompt</CardDescription>
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
                                onClick={() => runTest(customPrompt, 'Custom')}
                                disabled={isRunning || isBatchRunning || !customPrompt.trim()}
                                className={`w-full ${buttonColorClass}`}
                            >
                                {isRunning && currentTest?.scenario === 'Custom' ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exécution...</>
                                ) : (
                                    <><Play className="w-4 h-4 mr-2" /> Lancer</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Batch Tests */}
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
                        </>
                    )}

                    {!isBatchRunning && EnhancedLogsComponent && history.length > 0 && (
                        <EnhancedLogsComponent results={history} onRefresh={loadHistory} />
                    )}

                    {showBatchConfig && BatchConfigComponent && (
                        <BatchConfigComponent
                            onLaunchBatch={({ scenarioConfig, totalQuestions }) => 
                                runBatch(totalQuestions, scenarioConfig)
                            }
                            disabled={isBatchRunning || isRunning}
                        />
                    )}

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                Batch Rapide
                            </CardTitle>
                            <CardDescription>Tests aléatoires en masse</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {BATCH_SIZES.map(size => (
                                    <Button
                                        key={size}
                                        onClick={() => runBatch(size)}
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

                {/* History */}
                <TabsContent value="history" className="space-y-6">
                    <UnifiedHistory
                        benchmarks={history}
                        isLoading={isLoadingHistory}
                        onSelectBenchmark={(b) => {
                            setLastResult(b);
                            setLastRunLogs(b.full_debug_log || []);
                            setActiveTab('results');
                        }}
                        onRefresh={loadHistory}
                    />
                </TabsContent>

                {/* Results */}
                {(lastResult || isRunning) && (
                    <TabsContent value="results" className="space-y-6">
                        {isRunning && !lastResult ? (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardContent className="p-6">
                                    {/* Header with live indicator */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                                            <div>
                                                <p className="text-green-400 font-medium">Test en cours...</p>
                                                <p className="text-slate-500 text-sm">{currentTest?.scenario}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-red-600 animate-pulse flex items-center gap-1">
                                            <Radio className="w-3 h-3" />
                                            LIVE
                                        </Badge>
                                    </div>

                                    {/* Phase Progress Indicators */}
                                    <div className="grid grid-cols-5 gap-2 mb-4">
                                        {['init', 'mode_a', 'mode_b', 'evaluation', 'saving'].map((phase) => {
                                            const isActive = streamingPhase === phase;
                                            const isComplete = ['init', 'mode_a', 'mode_b', 'evaluation', 'saving', 'complete']
                                                .indexOf(streamingPhase) > ['init', 'mode_a', 'mode_b', 'evaluation', 'saving'].indexOf(phase);
                                            const phaseLabels = {
                                                init: 'Init',
                                                mode_a: 'Mode A',
                                                mode_b: 'Mode B',
                                                evaluation: 'Eval',
                                                saving: 'Save'
                                            };
                                            return (
                                                <div 
                                                    key={phase}
                                                    className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                                                        isActive 
                                                            ? 'border-green-500 bg-green-900/20' 
                                                            : isComplete 
                                                                ? 'border-green-600/50 bg-green-900/10' 
                                                                : 'border-slate-700 bg-slate-800/50'
                                                    }`}
                                                >
                                                    {isComplete ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    ) : isActive ? (
                                                        <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                                                    ) : (
                                                        <Clock className="w-4 h-4 text-slate-500" />
                                                    )}
                                                    <span className={`text-xs mt-1 ${isActive || isComplete ? 'text-green-400' : 'text-slate-500'}`}>
                                                        {phaseLabels[phase]}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Real-time metrics */}
                                    {Object.keys(streamingMetrics).length > 0 && (
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {streamingMetrics.mode_a_time_ms && (
                                                <div className="bg-slate-900 rounded-lg p-2 text-center">
                                                    <div className="text-xs text-slate-500">Mode A</div>
                                                    <div className="text-green-400 font-mono">{streamingMetrics.mode_a_time_ms}ms</div>
                                                </div>
                                            )}
                                            {streamingMetrics.mode_b_time_ms && (
                                                <div className="bg-slate-900 rounded-lg p-2 text-center">
                                                    <div className="text-xs text-slate-500">Mode B</div>
                                                    <div className="text-green-400 font-mono">{streamingMetrics.mode_b_time_ms}ms</div>
                                                </div>
                                            )}
                                            {streamingMetrics.personas && (
                                                <div className="bg-slate-900 rounded-lg p-2 text-center">
                                                    <div className="text-xs text-slate-500">Personas</div>
                                                    <div className="text-green-400 font-mono">{streamingMetrics.personas}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Streaming log console */}
                                    {streamingLogs.length > 0 && (
                                        <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
                                            {streamingLogs.map((log, i) => {
                                                const levelColors = {
                                                    'INFO': 'text-blue-300',
                                                    'DEBUG': 'text-slate-400',
                                                    'SUCCESS': 'text-green-400',
                                                    'WARNING': 'text-yellow-400',
                                                    'ERROR': 'text-red-400',
                                                    'SYSTEM': 'text-purple-400'
                                                };
                                                return (
                                                    <div key={i} className={`py-0.5 ${levelColors[log.level] || 'text-green-300'}`}>
                                                        <span className="text-slate-600 mr-2">
                                                            [{new Date(log.timestamp).toLocaleTimeString()}]
                                                        </span>
                                                        {log.message}
                                                    </div>
                                                );
                                            })}
                                            <div className="text-green-400 animate-pulse">▊</div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : lastResult?.error ? (
                            <Card className="bg-red-900/20 border-red-500">
                                <CardHeader>
                                    <CardTitle className="text-red-400">Erreur</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-300 whitespace-pre-wrap">{lastResult.error}</p>
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

            <BatchSummaryModal
                isOpen={showBatchSummary}
                onClose={() => setShowBatchSummary(false)}
                progressData={batchSummaryData}
            />
        </div>
    );
}