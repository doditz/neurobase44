import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Play, Loader2, CheckCircle2, XCircle, 
    Zap, Shield, Download, RotateCcw, Pause
} from 'lucide-react';
import { toast } from 'sonner';
import OptimizationHistoryItem from '@/components/optimization/OptimizationHistoryItem';

export default function DevTestRunner() {
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState([]);
    const [allResults, setAllResults] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            const [devQuestions, devResults] = await Promise.all([
                base44.entities.DevTestQuestion.list('-created_date', 500),
                base44.entities.DevTestResult.list('-created_date', 100)
            ]);

            setQuestions(devQuestions);
            setAllResults(devResults);

            if (devQuestions.length > 0) {
                setSelectedQuestion(devQuestions[0]);
            }

            console.log(`[DevTestRunner] Loaded ${devQuestions.length} questions, ${devResults.length} results`);
        } catch (error) {
            console.error('[DevTestRunner] Load error:', error);
            toast.error('Échec du chargement');
        }
    };

    const runSingleTest = async () => {
        if (!selectedQuestion) {
            toast.error('Sélectionnez une question');
            return;
        }

        setIsRunning(true);
        try {
            toast.info('🚀 Test en cours...');

            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: selectedQuestion.question_text,
                question_id: selectedQuestion.question_id,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Test échoué');
            }

            toast.success('✅ Test terminé!');
            
            setTimeout(async () => {
                await loadData();
            }, 2000);

        } catch (error) {
            console.error('[DevTestRunner] Test error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const runBatchTests = async () => {
        if (questions.length === 0) {
            toast.error('Aucune question disponible');
            return;
        }

        setIsBatchRunning(true);
        setIsPaused(false);
        setResults([]);
        setCurrentIndex(0);

        const testResults = [];

        for (let i = 0; i < questions.length; i++) {
            if (isPaused) break;

            setCurrentIndex(i);
            const question = questions[i];

            toast.info(`Test ${i + 1}/${questions.length}: ${question.question_id}`);

            try {
                const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                    question_text: question.question_text,
                    question_id: question.question_id,
                    run_mode: 'ab_test'
                });

                testResults.push({
                    question_id: question.question_id,
                    status: data?.success ? 'success' : 'failed',
                    data: data
                });
            } catch (error) {
                testResults.push({
                    question_id: question.question_id,
                    status: 'failed',
                    error: error.message
                });
            }

            setResults([...testResults]);

            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        setIsBatchRunning(false);
        const successCount = testResults.filter(r => r.status === 'success').length;
        toast.success(`✅ Batch terminé: ${successCount}/${testResults.length} réussis`);

        setTimeout(async () => {
            await loadData();
        }, 3000);
    };

    const pauseBatch = () => {
        setIsPaused(true);
        setIsBatchRunning(false);
    };

    const resetBatch = () => {
        setIsBatchRunning(false);
        setIsPaused(false);
        setCurrentIndex(0);
        setResults([]);
    };

    const exportResults = () => {
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devtest_results_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
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

    const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Zap className="w-8 h-8" />
                            Dev Test Runner
                        </h1>
                        <p className="text-slate-400 mt-1">Exécution automatisée des tests de développement</p>
                    </div>
                    <Badge className="bg-orange-600 px-4 py-2">Admin Mode</Badge>
                </div>

                {/* Controls */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center justify-between">
                            <span>Contrôles</span>
                            <Badge variant="outline" className="text-purple-400">
                                {questions.length} questions chargées
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Single Test */}
                        <div className="space-y-3">
                            <label className="text-sm text-slate-400">Test Unitaire</label>
                            <Select
                                value={selectedQuestion?.id}
                                onValueChange={(id) => setSelectedQuestion(questions.find(q => q.id === id))}
                                disabled={isRunning || isBatchRunning}
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

                            <Button
                                onClick={runSingleTest}
                                disabled={isRunning || isBatchRunning || !selectedQuestion}
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
                                        Lancer Test Unitaire
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Batch Controls */}
                        <div className="flex gap-3 pt-3 border-t border-slate-700">
                            <Button
                                onClick={runBatchTests}
                                disabled={isRunning || isBatchRunning || questions.length === 0}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Lancer Batch Complet
                            </Button>
                            <Button
                                onClick={pauseBatch}
                                disabled={!isBatchRunning}
                                variant="outline"
                                className="border-orange-600 text-orange-400"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                            <Button
                                onClick={resetBatch}
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
                                className="border-green-600 text-green-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>

                        {isBatchRunning && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">
                                        Test {currentIndex + 1} / {questions.length}
                                    </span>
                                    <span className="text-purple-400 font-mono">
                                        {progress.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats */}
                {(isBatchRunning || results.length > 0) && (
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span className="text-sm text-slate-400">Réussis</span>
                                </div>
                                <p className="text-3xl font-bold text-green-400">{successCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <span className="text-sm text-slate-400">Échoués</span>
                                </div>
                                <p className="text-3xl font-bold text-red-400">{failedCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-5 h-5 text-purple-400" />
                                    <span className="text-sm text-slate-400">Total</span>
                                </div>
                                <p className="text-3xl font-bold text-purple-400">{results.length}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Historical Results */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Historique Complet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-3">
                                {allResults.map((result, idx) => (
                                    <OptimizationHistoryItem
                                        key={result.id}
                                        benchmark={result}
                                        index={idx}
                                    />
                                ))}

                                {allResults.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        Aucun résultat disponible
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}