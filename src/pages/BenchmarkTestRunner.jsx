import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/User';
import { BenchmarkQuestion } from '@/entities/BenchmarkQuestion';
import { BenchmarkResult } from '@/entities/BenchmarkResult';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Zap, Loader2, CheckCircle2, AlertCircle, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';

export default function BenchmarkTestRunnerPage() {
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [isSingleTestRunning, setIsSingleTestRunning] = useState(false);
    const [isBatchRunning, setIsBatchRunning] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [batchResults, setBatchResults] = useState([]);
    const [allBenchmarks, setAllBenchmarks] = useState([]);
    const [runLogs, setRunLogs] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const addLog = (level, message) => {
        setRunLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            level,
            message
        }]);
    };

    const clearLogs = () => setRunLogs([]);

    const loadData = async () => {
        try {
            const [currentUser, benchQuestions, benchmarkResults] = await Promise.all([
                User.me(),
                BenchmarkQuestion.list(),
                BenchmarkResult.list('-created_date', 20)
            ]);
            setUser(currentUser);
            setQuestions(benchQuestions);
            setAllBenchmarks(benchmarkResults);
            
            if (benchQuestions.length > 0) {
                setSelectedQuestion(benchQuestions[0]);
            }
        } catch (error) {
            console.error('[BenchmarkTestRunner] Load error:', error);
            toast.error('Échec du chargement des données');
        }
    };

    const runSingleTest = async () => {
        if (!selectedQuestion) {
            toast.error('Sélectionnez une question');
            return;
        }

        setIsSingleTestRunning(true);
        setTestResults(null);

        if (runLogs.length > 0) {
            addLog('SYSTEM', '────────────────────────────────────────');
        }
        addLog('SYSTEM', `🚀 SINGLE TEST: ${selectedQuestion.question_id}`);

        try {
            toast.info('🚀 Test en cours...');

            // APPEL DU BENCHMARK ORCHESTRATOR UNIFIÉ
            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: selectedQuestion.question_text,
                question_id: selectedQuestion.question_id,
                run_mode: 'ab_test'
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Test failed');
            }

            setTestResults(data);
            addLog('SUCCESS', `✅ Winner: ${data.winner === 'mode_b' ? 'Mode B (Neuronas)' : 'Mode A (Baseline)'} | SPG: ${data.spg?.toFixed(3) || 'N/A'}`);
            toast.success('✅ Test terminé!');

            // Attendre la propagation avant reload
            setTimeout(async () => {
                await loadData();
                toast.info('📊 Données rafraîchies');
            }, 2000);
        } catch (error) {
            console.error('[BenchmarkTestRunner] Single test error:', error);
            addLog('ERROR', `❌ Test failed: ${error.message}`);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setIsSingleTestRunning(false);
        }
    };

    const runBatchTests = async () => {
        if (questions.length === 0) {
            toast.error('Aucune question disponible');
            return;
        }

        setIsBatchRunning(true);
        setBatchResults([]);

        if (runLogs.length > 0) {
            addLog('SYSTEM', '────────────────────────────────────────');
        }
        addLog('SYSTEM', `🚀 BATCH START: ${questions.length} questions (~${Math.ceil(questions.length * 30 / 60)} min)`);

        const results = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            addLog('INFO', `Testing ${i + 1}/${questions.length}: ${question.question_id}`);
            toast.info(`Test ${i + 1}/${questions.length}: ${question.question_id}`);

            try {
                // APPEL DU BENCHMARK ORCHESTRATOR UNIFIÉ
                const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                    question_text: question.question_text,
                    question_id: question.question_id,
                    run_mode: 'ab_test'
                });

                if (data && data.success) {
                    results.push({
                        question_id: question.question_id,
                        status: 'success',
                        data: data
                    });
                    addLog('SUCCESS', `✅ ${question.question_id}: ${data.winner === 'mode_b' ? 'Mode B' : 'Mode A'} (SPG: ${data.spg?.toFixed(3) || 'N/A'})`);
                } else {
                    results.push({
                        question_id: question.question_id,
                        status: 'failed',
                        error: data?.error || 'Unknown error'
                    });
                    addLog('WARNING', `⚠️ ${question.question_id}: No success returned`);
                }
            } catch (error) {
                results.push({
                    question_id: question.question_id,
                    status: 'failed',
                    error: error.message
                });
                addLog('ERROR', `❌ ${question.question_id}: ${error.message}`);
            }

            setBatchResults([...results]);

            // Delay entre les tests pour éviter la surcharge
            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        setIsBatchRunning(false);
        const successCount = results.filter(r => r.status === 'success').length;
        addLog('SYSTEM', `🏁 BATCH COMPLETE: ${successCount}/${results.length} passed (${((successCount/results.length)*100).toFixed(1)}%)`);
        toast.success(`✅ Batch complété: ${successCount}/${results.length} réussis`);

        // Attendre propagation
        setTimeout(async () => {
            await loadData();
            toast.info('📊 Historique mis à jour');
        }, 3000);
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Card className="bg-slate-800 border-orange-600 max-w-md">
                    <CardHeader>
                        <CardTitle className="text-orange-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Accès Réservé Administrateur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">
                            Cette page est réservée aux administrateurs. Veuillez vous connecter avec un compte administrateur.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Zap className="w-8 h-8" />
                            Exécuteur de Tests d'Efficacité
                        </h1>
                        <p className="text-slate-400 mt-1">Exécution de tests A/B/C sur dataset complet</p>
                    </div>
                    <Badge className="bg-orange-600 px-4 py-2">Admin Mode</Badge>
                </div>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Test Unitaire</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Sélectionner une question</label>
                            <Select
                                value={selectedQuestion?.id}
                                onValueChange={(id) => setSelectedQuestion(questions.find(q => q.id === id))}
                                disabled={isSingleTestRunning || isBatchRunning}
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
                        </div>

                        {selectedQuestion && (
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <p className="text-sm text-slate-300">{selectedQuestion.question_text}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge className="bg-indigo-600">{selectedQuestion.question_type}</Badge>
                                    <Badge className="bg-purple-600">{selectedQuestion.niveau_complexite}</Badge>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={runSingleTest}
                            disabled={isSingleTestRunning || isBatchRunning || !selectedQuestion}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {isSingleTestRunning ? (
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
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Test Batch (Tout le Dataset)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 mb-4">
                            Exécute tous les tests du dataset ({questions.length} questions). Durée estimée: ~{Math.ceil(questions.length * 30 / 60)} minutes.
                        </p>
                        <Button
                            onClick={runBatchTests}
                            disabled={isSingleTestRunning || isBatchRunning || questions.length === 0}
                            className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                            {isBatchRunning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Batch en cours... {batchResults.length}/{questions.length}
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Lancer Batch Complet
                                </>
                            )}
                        </Button>

                        {batchResults.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h4 className="text-sm font-semibold text-green-400">Résultats Batch:</h4>
                                {batchResults.map((result, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                                        <span className="text-sm text-slate-300">{result.question_id}</span>
                                        {result.status === 'success' ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {testResults && (
                    <Card className="bg-slate-800 border-green-600">
                        <CardHeader>
                            <CardTitle className="text-green-400">Dernier Résultat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Winner</p>
                                    <p className="text-xl font-bold text-green-400">
                                        {testResults.winner === 'mode_b' ? 'Mode B' : 'Mode A'}
                                    </p>
                                </div>
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Improvement</p>
                                    <p className="text-xl font-bold text-orange-400">
                                        {testResults.improvement?.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">SPG</p>
                                    <p className="text-xl font-bold text-purple-400">
                                        {testResults.spg?.toFixed(3) || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Unified Logs */}
                {runLogs.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-green-400">Execution Logs ({runLogs.length})</CardTitle>
                            <Button
                                onClick={clearLogs}
                                variant="outline"
                                size="sm"
                                className="border-slate-600 text-slate-400 hover:text-red-400"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Clear
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <UnifiedLogViewer
                                logs={runLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`)}
                                title=""
                                showStats={true}
                                defaultExpanded={true}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}