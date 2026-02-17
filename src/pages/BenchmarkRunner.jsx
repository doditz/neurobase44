import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, Brain, TrendingUp, Download, Shield, Loader2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import OptimizationHistoryItem from '@/components/optimization/OptimizationHistoryItem';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';
import { createLogger, saveToUnifiedLog } from '@/components/core/NeuronasLogger';
import { exportData } from '@/components/utils/FileExporter';

export default function BenchmarkRunner() {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [results, setResults] = useState([]);
    const [currentTest, setCurrentTest] = useState(null);
    const [overallStats, setOverallStats] = useState({ total: 0, completed: 0, passed: 0, failed: 0, avgImprovement: 0 });
    const [user, setUser] = useState(null);
    const loggerRef = useRef(createLogger('BenchmarkRunner'));

    useEffect(() => { loadData(); }, []);

    const addLog = (level, message, metadata = {}) => {
        const logger = loggerRef.current;
        const method = level.toLowerCase();
        if (logger[method]) logger[method](message, metadata);
        else logger.info(message, metadata);
    };

    const clearLogs = () => { loggerRef.current = createLogger('BenchmarkRunner'); };

    const loadData = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            const [allQuestions, allResults] = await Promise.all([
                base44.entities.BenchmarkQuestion.list('-created_date', 500),
                base44.entities.BenchmarkResult.list('-created_date', 100)
            ]);

            setQuestions(allQuestions);
            setResults(allResults);
            setOverallStats(prev => ({ ...prev, total: allQuestions.length }));

            console.log(`[BenchmarkRunner] Loaded ${allQuestions.length} questions, ${allResults.length} results`);
        } catch (error) {
            console.error('[BenchmarkRunner] Load error:', error);
            toast.error('Échec du chargement des données');
        }
    };

    const estimateTokens = (text) => {
        return Math.ceil(text.length / 4);
    };

    const runSingleBenchmark = async (question) => {
        setCurrentTest(`Testing: ${question.question_id}`);

        try {
            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: question.question_text,
                question_id: question.question_id,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Test failed');
            }

            return {
                scenario_name: `${question.question_id}: ${question.source_benchmark}`,
                passed: data.winner === 'mode_b',
                performance_improvement: data.improvement || 0,
                global_score_performance: data.spg || 0,
                benchmark_id: data.benchmark_id
            };
        } catch (error) {
            console.error(`[BenchmarkRunner] Error for ${question.question_id}:`, error);
            throw error;
        }
    };

    const runBenchmarkSuite = async () => {
        setIsRunning(true);
        setIsPaused(false);
        setCurrentIndex(0);
        
        // Add separator for new batch run
        if (runLogs.length > 0) {
            addLog('SYSTEM', '────────────────────────────────────────');
        }
        addLog('SYSTEM', `🚀 BATCH START: ${questions.length} questions`);
        
        const testResults = [];
        let passed = 0;
        let failed = 0;
        let totalImprovement = 0;

        for (let i = 0; i < questions.length; i++) {
            if (isPaused) break;
            
            setCurrentIndex(i);
            const question = questions[i];
            
            addLog('INFO', `Testing ${i + 1}/${questions.length}: ${question.question_id}`);
            toast.info(`Test ${i + 1}/${questions.length}: ${question.question_id}`);

            try {
                const result = await runSingleBenchmark(question);
                testResults.push(result);
                
                if (result.passed) {
                    passed++;
                    addLog('SUCCESS', `✅ ${question.question_id}: Mode B wins (SPG: ${result.global_score_performance?.toFixed(3)})`);
                } else {
                    failed++;
                    addLog('WARNING', `⚠️ ${question.question_id}: Mode A wins`);
                }
                
                totalImprovement += result.performance_improvement;
                
                setOverallStats({
                    total: questions.length,
                    completed: i + 1,
                    passed,
                    failed,
                    avgImprovement: totalImprovement / (i + 1)
                });
            } catch (error) {
                console.error(`Failed benchmark for question ${i}:`, error);
                failed++;
                addLog('ERROR', `❌ ${question.question_id}: ${error.message}`);
            }

            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        setIsRunning(false);
        setCurrentTest(null);
        addLog('system', `🏁 BATCH COMPLETE: ${passed}/${questions.length} passed (${((passed/questions.length)*100).toFixed(1)}%)`);
        toast.success(`✅ Suite terminée: ${passed}/${questions.length} réussis`);

        // Save to UnifiedLog
        await saveToUnifiedLog(loggerRef.current, {
            source_type: 'benchmark',
            execution_context: 'BenchmarkRunner',
            metrics: { pass_rate: (passed / questions.length) * 100, total: questions.length, passed, failed, avg_improvement: totalImprovement / questions.length },
            result_summary: `Benchmark batch: ${passed}/${questions.length} passed`,
            status: failed === 0 ? 'success' : 'partial'
        });

        await loadData();
    };

    const pauseBenchmark = () => {
        setIsPaused(true);
        setIsRunning(false);
    };

    const resetBenchmark = () => {
        setIsRunning(false);
        setIsPaused(false);
        setCurrentIndex(0);
        setResults([]);
        setCurrentTest(null);
        setOverallStats({
            total: questions.length,
            completed: 0,
            passed: 0,
            failed: 0,
            avgImprovement: 0
        });
    };

    const exportResults = () => {
        exportData(results, 'benchmark_results', 'json');
        toast.success('Results exported');
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    if (user.role !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Card className="bg-slate-800 border-orange-600 max-w-md">
                    <CardHeader>
                        <CardTitle className="text-orange-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Accès Administrateur Requis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">Cette page est réservée aux administrateurs.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progress = overallStats.total > 0 ? (overallStats.completed / overallStats.total) * 100 : 0;

    return (
        <div className="h-screen overflow-y-auto bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Brain className="w-8 h-8 text-purple-400" />
                        <h1 className="text-3xl font-bold text-green-300">Neuronas Benchmark Suite Runner</h1>
                    </div>
                    <p className="text-slate-400">
                        Automated testing and validation of Neuronas SMAS-ARS architecture across diverse benchmark questions
                    </p>
                </div>

                {/* Controls */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-300 flex items-center justify-between">
                            <span>Test Controls</span>
                            <Badge variant="outline" className="text-purple-400 border-purple-600">
                                {questions.length} Questions Loaded
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button
                                onClick={runBenchmarkSuite}
                                disabled={isRunning || questions.length === 0}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Run Full Suite
                            </Button>
                            <Button
                                onClick={pauseBenchmark}
                                disabled={!isRunning}
                                variant="outline"
                                className="border-orange-600 text-orange-400"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                            <Button
                                onClick={resetBenchmark}
                                variant="outline"
                                className="border-slate-600 text-slate-400"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button
                                onClick={exportResults}
                                disabled={results.length === 0}
                                variant="outline"
                                className="ml-auto border-green-600 text-green-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Results
                            </Button>
                        </div>

                        {isRunning && (
                            <div className="mt-4 space-y-2">
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">{currentTest}</span>
                                    <span className="text-purple-400 font-mono">
                                        {overallStats.completed} / {overallStats.total}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Overall Stats */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-sm text-slate-400">Passed</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">{overallStats.passed}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-sm text-slate-400">Failed</span>
                            </div>
                            <p className="text-3xl font-bold text-red-400">{overallStats.failed}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                <span className="text-sm text-slate-400">Avg Improvement</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-400">
                                {overallStats.avgImprovement > 0 ? '+' : ''}{overallStats.avgImprovement.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <span className="text-sm text-slate-400">Completion</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400">{progress.toFixed(0)}%</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Run Logs */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-green-300">Execution Logs</CardTitle>
                        <Button onClick={clearLogs} variant="outline" size="sm" className="border-slate-600 text-slate-400 hover:text-red-400">
                            <Trash2 className="w-3 h-3 mr-1" /> Clear
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <UnifiedLogViewer logs={loggerRef.current.getFormattedLogs()} title="" showStats={true} defaultExpanded={true} />
                    </CardContent>
                </Card>

                {/* Results List */}
                {results.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-300">Historique Complet</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-3">
                                    {results.map((result, idx) => (
                                        <OptimizationHistoryItem
                                            key={result.id || idx}
                                            benchmark={result}
                                            index={idx}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}