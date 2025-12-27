import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Zap, TrendingUp, Clock, DollarSign, CheckCircle2, Loader2, BarChart3, Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoOptimizationTestPage() {
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [systemState, setSystemState] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isSystemBusy, setIsSystemBusy] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [recentResults, setRecentResults] = useState([]);

    useEffect(() => {
        loadData();
        const interval = setInterval(checkSystemState, 2000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [currentUser, benchQuestions, results] = await Promise.all([
                base44.auth.me(),
                base44.entities.BenchmarkQuestion.list(),
                base44.entities.BenchmarkResult.list('-created_date', 5)
            ]);
            setUser(currentUser);
            setQuestions(benchQuestions);
            setRecentResults(results);
            if (benchQuestions.length > 0) setSelectedQuestion(benchQuestions[0]);
        } catch (error) {
            console.error('Load error:', error);
            toast.error('❌ Erreur lors du chargement des données.');
        }
    };

    const checkSystemState = async () => {
        try {
            const state = await base44.entities.SystemState.filter({ state_key: 'auto_optimization_mode_active' });
            setSystemState(state[0] || null);
            setIsSystemBusy(state[0]?.is_active || false);
        } catch (error) {
            // Silently handle - don't block UI
            setSystemState(null);
            setIsSystemBusy(false);
        }
    };

    const handleQuickTest = async () => {
        if (!selectedQuestion) {
            toast.error('Sélectionne une question');
            return;
        }

        setIsRunning(true);
        setTestResult(null);

        try {
            toast.info('🧪 Lancement test A/B/C...');
            
            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: selectedQuestion.question_text,
                question_id: selectedQuestion.question_id,
                run_mode: 'ab_test'
            });

            if (data && data.success) {
                const spgDisplay = data.spg?.toFixed(3) || 'N/A';
                const winnerDisplay = data.winner === 'mode_b' ? 'Mode B gagne!' : data.winner === 'mode_a' ? 'Mode A' : 'Égalité';
                toast.success(`✅ ${winnerDisplay} SPG: ${spgDisplay}`);
                setTestResult(data);
                
                setTimeout(async () => {
                    await loadData();
                }, 1500);
            } else {
                throw new Error(data?.error || data?.message || 'Test failed - no data returned');
            }
        } catch (error) {
            console.error('Test error:', error);
            
            const errorData = error.response?.data || {};
            const errorMessage = errorData.error || errorData.message || errorData.err || error.message;
            
            // Show detailed logs if available
            if (errorData.logs && Array.isArray(errorData.logs)) {
                console.error('Backend logs:', errorData.logs);
            }
            
            toast.error(`❌ ${errorMessage}`, { duration: 6000 });
        } finally {
            setIsRunning(false);
        }
    };

    const handleAutoOptimization = async () => {
        if (!selectedQuestion) {
            toast.error('Sélectionne une question');
            return;
        }

        setIsRunning(true);
        setTestResult(null);

        try {
            toast.info('🎯 Démarrage BALANCED Sweet Spot Optimization...', { duration: 3000 });
            
            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: selectedQuestion.question_text,
                question_id: selectedQuestion.question_id,
                run_mode: 'auto_tune',
                benchmark_settings: {
                    max_iterations: 10,
                    convergence_threshold: 0.92,
                    exploration_rate: 0.15,
                    quality_floor: 0.85,
                    efficiency_target: 0.50
                }
            });

            if (data.status === 'sweet_spot_reached') {
                toast.success(`🏆 Sweet Spot atteint! Q=${data.best_metrics.quality.toFixed(3)}, Eff=${data.best_metrics.efficiency.toFixed(2)}`, { duration: 6000 });
            } else if (data.status === 'converged') {
                toast.success(`✅ Convergence: SPG=${data.best_metrics.spg.toFixed(3)}`, { duration: 5000 });
            } else {
                toast.success(`✅ ${data.iterations} itérations complétées`, { duration: 4000 });
            }

            setTestResult(data);
            
            setTimeout(async () => {
                await loadData();
                toast.info('📊 Historique rafraîchi');
            }, 2000);
        } catch (error) {
            console.error('Auto-optimization error:', error);
            
            const errorData = error.response?.data || {};
            const errorMessage = errorData.message || errorData.err || error.message;
            const errorSuggestion = errorData.suggestion || '';
            
            if (error.response?.status === 409) {
                toast.error(`⚠️ Conflit: ${errorMessage}`, { duration: 6000 });
                if (errorSuggestion) {
                    toast.info(`💡 ${errorSuggestion}`, { duration: 6000 });
                }
            } else {
                toast.error(`❌ Erreur: ${errorMessage}`, { duration: 5000 });
                if (errorSuggestion) {
                    toast.info(`💡 ${errorSuggestion}`, { duration: 5000 });
                }
            }
        } finally {
            setIsRunning(false);
        }
    };

    const handleForceReset = async () => {
        try {
            toast.info('🔄 Réinitialisation forcée de tous les états...');
            
            try {
                const allStates = await base44.entities.SystemState.list();
                for (const state of allStates) {
                    if (state.is_active) {
                        await base44.entities.SystemState.update(state.id, {
                            is_active: false,
                            current_operation: 'Force reset by user',
                            progress_percentage: 0
                        });
                    }
                }
                toast.success('✅ Tous les états système réinitialisés');
            } catch (entityError) {
                console.error('Direct entity cleanup failed:', entityError);
                toast.error('❌ Échec du nettoyage. Vérifiez les permissions.');
            }

            await checkSystemState();
            await loadData();
        } catch (error) {
            console.error('Force reset error:', error);
            toast.error(`❌ Échec du reset global: ${error.message}`);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    return (
        <div className="min-h-screen bg-slate-900 p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Zap className="w-8 h-8" />
                            Test Auto-Optimization DSTIB
                        </h1>
                        <p className="text-slate-400 mt-1">Tests d'efficacité: 70-80% réduction tokens, qualité &gt; 0.95</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleForceReset}
                            variant="outline"
                            className="border-orange-600 text-orange-400 hover:bg-orange-900/30"
                            size="sm"
                        >
                            🔄 Force Reset
                        </Button>
                    </div>
                </div>

                {/* System State */}
                {isSystemBusy && systemState && (
                    <Card className="bg-orange-900/20 border-orange-600">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                                    <div>
                                        <p className="text-orange-400 font-semibold">{systemState.current_operation}</p>
                                        <p className="text-xs text-slate-400">Par: {systemState.started_by}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-orange-400">
                                        {Math.round(systemState.metadata?.progress_percentage || 0)}%
                                    </p>
                                </div>
                            </div>
                            <Progress value={systemState.metadata?.progress_percentage || 0} className="mt-3 h-2" />
                        </CardContent>
                    </Card>
                )}

                {/* Test Controls */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            Lancer un Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Question de Benchmark</label>
                            <Select
                                value={selectedQuestion?.id}
                                onValueChange={(id) => setSelectedQuestion(questions.find(q => q.id === id))}
                                disabled={isRunning}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue placeholder="Sélectionne une question" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                    {questions.map(q => (
                                        <SelectItem key={q.id} value={q.id} className="text-green-300">
                                            {q.question_id} - {q.question_text.substring(0, 60)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedQuestion && (
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <div className="flex gap-2 mb-2">
                                    <Badge className="bg-indigo-600">{selectedQuestion.question_type}</Badge>
                                    <Badge className="bg-purple-600">{selectedQuestion.niveau_complexite}</Badge>
                                    <Badge className="bg-blue-600">{selectedQuestion.hemisphere_dominant}</Badge>
                                </div>
                                <p className="text-sm text-slate-300">{selectedQuestion.question_text}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={handleQuickTest}
                                disabled={isRunning || isSystemBusy || !selectedQuestion}
                                className="bg-blue-600 hover:bg-blue-700 h-12"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Test en cours...
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Test A/B/C Rapide
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleAutoOptimization}
                                disabled={isRunning || isSystemBusy || !selectedQuestion || !isAdmin}
                                className="bg-orange-600 hover:bg-orange-700 h-12"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Optimization...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Auto-Optimization (Admin)
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Result */}
                {testResult && (
                    <Card className="bg-slate-800 border-green-600">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                {testResult.status === 'sweet_spot_reached' ? '🏆 Sweet Spot Atteint!' : 'Résultat du Test'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {testResult.best_metrics && (
                                    <>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                                <span className="text-xs text-slate-400">SPG Final</span>
                                            </div>
                                            <p className="text-2xl font-bold text-green-400">
                                                {testResult.best_metrics.spg.toFixed(3)}
                                            </p>
                                            {testResult.improvements?.spg_improvement_percent > 0 && (
                                                <p className="text-xs text-green-300 mt-1">
                                                    +{testResult.improvements.spg_improvement_percent.toFixed(1)}%
                                                </p>
                                            )}
                                        </div>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Heart className="w-4 h-4 text-pink-400" />
                                                <span className="text-xs text-slate-400">Qualité</span>
                                            </div>
                                            <p className="text-2xl font-bold text-pink-400">
                                                {testResult.best_metrics.quality.toFixed(3)}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Floor: 0.85
                                            </p>
                                        </div>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Zap className="w-4 h-4 text-orange-400" />
                                                <span className="text-xs text-slate-400">Efficacité</span>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-400">
                                                {(testResult.best_metrics.efficiency * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign className="w-4 h-4 text-blue-400" />
                                                <span className="text-xs text-slate-400">Tokens</span>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-400">
                                                {testResult.best_metrics.tokens}
                                            </p>
                                            {testResult.improvements?.token_reduction_percent > 0 && (
                                                <p className="text-xs text-green-300 mt-1">
                                                    -{testResult.improvements.token_reduction_percent.toFixed(1)}%
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                                
                                {testResult.best_spg !== undefined && !testResult.best_metrics && (
                                    <>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                                <span className="text-xs text-slate-400">SPG Final</span>
                                            </div>
                                            <p className="text-2xl font-bold text-green-400">
                                                {testResult.best_spg.toFixed(3)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Zap className="w-4 h-4 text-orange-400" />
                                                <span className="text-xs text-slate-400">Amélioration</span>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-400">
                                                +{(testResult.improvement * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="bg-slate-700 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-4 h-4 text-purple-400" />
                                                <span className="text-xs text-slate-400">Itérations</span>
                                            </div>
                                            <p className="text-2xl font-bold text-purple-400">
                                                {testResult.iterations}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {testResult.spg !== undefined && !testResult.best_spg && !testResult.best_metrics && (
                                    <div className="bg-slate-700 p-4 rounded-lg col-span-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-slate-400">SPG Score</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-400">
                                            {testResult.spg.toFixed(3)}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            {testResult.sweet_spot_achieved && (
                                <div className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
                                    <p className="text-sm text-green-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Sweet Spot atteint: Qualité ≥0.85 ET Efficacité ≥50%
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Recent Results */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Résultats Récents ({recentResults.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentResults.map(result => (
                                <div key={result.id} className="bg-slate-700 p-4 rounded-lg">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-green-300">{result.scenario_name}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(result.created_date).toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge className={
                                                result.winner === 'mode_b' ? 'bg-green-600' :
                                                result.winner === 'mode_a' ? 'bg-orange-600' : 'bg-gray-600'
                                            }>
                                                {result.winner === 'mode_b' ? '✓ Mode B' : 
                                                 result.winner === 'mode_a' ? 'Mode A' : 'Tie'}
                                            </Badge>
                                            {result.global_score_performance && (
                                                <Badge className="bg-indigo-600">
                                                    SPG: {result.global_score_performance.toFixed(3)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-xs">
                                        <div>
                                            <span className="text-slate-400">Improvement:</span>
                                            <span className="ml-2 font-semibold text-green-400">
                                                {result.performance_improvement > 0 ? '+' : ''}
                                                {result.performance_improvement?.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Time B:</span>
                                            <span className="ml-2 font-semibold text-blue-400">
                                                {result.mode_b_time_ms}ms
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Tokens B:</span>
                                            <span className="ml-2 font-semibold text-purple-400">
                                                {result.mode_b_token_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}