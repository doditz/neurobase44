
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Stethoscope, 
    Play, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    MessageSquare, 
    FlaskConical,
    Clock,
    Zap,
    Brain,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';

export default function SystemDiagnosticPage() {
    const [user, setUser] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState({
        chatOrchestrator: null,
        benchmarkOrchestrator: null
    });
    const [logs, setLogs] = useState([]);

    React.useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error('Failed to load user:', error);
            }
        };
        loadUser();
    }, []);

    const runChatOrchestratorTest = async () => {
        setIsRunning(true);
        const startTime = Date.now();
        
        try {
            toast.info('🧪 Test Chat Orchestrator...');
            
            // Utilisation correcte du SDK avec le bon import
            const { data } = await base44.functions.invoke('chatOrchestrator', {
                conversation_id: 'diagnostic_test',
                agent_name: 'smas_debater',
                user_message: 'Test diagnostic: Quelle est la capitale de la France?',
                settings: {
                    temperature: 0.7,
                    maxPersonas: 3,
                    debateRounds: 2,
                    mode: 'eco'
                },
                file_urls: [],
                metadata: { test: true }
            });

            const duration = Date.now() - startTime;

            if (data && data.success) {
                setTestResults(prev => ({
                    ...prev,
                    chatOrchestrator: {
                        status: 'success',
                        duration,
                        response: data.response?.substring(0, 200),
                        metadata: data.metadata,
                        logs: data.logs || []
                    }
                }));
                
                if (data.logs) {
                    setLogs(prev => [...prev, ...data.logs]);
                }
                
                toast.success(`✅ Chat Orchestrator OK (${duration}ms)`);
            } else {
                throw new Error(data?.error || 'Unknown error');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            
            setTestResults(prev => ({
                ...prev,
                chatOrchestrator: {
                    status: 'error',
                    duration,
                    error: error.message
                }
            }));
            
            toast.error(`❌ Chat Orchestrator Failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const runBenchmarkOrchestratorTest = async () => {
        setIsRunning(true);
        const startTime = Date.now();
        
        try {
            toast.info('🧪 Test Benchmark Orchestrator...');
            
            // Utilisation correcte du SDK avec le bon import
            const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                question_text: 'Test diagnostic: Calculer 2 + 2',
                question_id: 'DIAG_TEST_001',
                run_mode: 'ab_test'
            });

            const duration = Date.now() - startTime;

            if (data && data.success) {
                setTestResults(prev => ({
                    ...prev,
                    benchmarkOrchestrator: {
                        status: 'success',
                        duration,
                        winner: data.winner,
                        improvement: data.improvement,
                        spg: data.spg,
                        mode_a_time: data.mode_a?.time_ms,
                        mode_b_time: data.mode_b?.time_ms,
                        logs: data.logs || []
                    }
                }));
                
                if (data.logs) {
                    setLogs(prev => [...prev, ...data.logs]);
                }
                
                toast.success(`✅ Benchmark Orchestrator OK (${duration}ms)`);
            } else {
                throw new Error(data?.error || 'Unknown error');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            
            setTestResults(prev => ({
                ...prev,
                benchmarkOrchestrator: {
                    status: 'error',
                    duration,
                    error: error.message
                }
            }));
            
            toast.error(`❌ Benchmark Orchestrator Failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const runFullDiagnostic = async () => {
        setTestResults({
            chatOrchestrator: null,
            benchmarkOrchestrator: null
        });
        setLogs([]);
        
        await runChatOrchestratorTest();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await runBenchmarkOrchestratorTest();
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
                            Cette page de diagnostic est réservée aux administrateurs.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-green-400">System Diagnostic</h1>
                        <p className="text-slate-400 text-sm">Tests de santé des orchestrateurs unifiés</p>
                    </div>
                </div>

                <Card className="bg-slate-800 border-slate-700 mb-6">
                    <CardHeader>
                        <CardTitle className="text-green-400">Architecture Unifiée - v2.0</CardTitle>
                        <CardDescription className="text-slate-400">
                            2 points d'entrée uniques pour toute l'application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                    <h3 className="font-semibold text-green-300">Chat Orchestrator</h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">
                                    Point d'entrée pour toutes les conversations et débats
                                </p>
                                <div className="space-y-1 text-xs text-slate-300">
                                    <div>• smas_debater</div>
                                    <div>• suno_prompt_architect</div>
                                    <div>• qronas_dispatcher</div>
                                </div>
                                <Button
                                    onClick={runChatOrchestratorTest}
                                    disabled={isRunning}
                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                                    size="sm"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3 h-3 mr-2" />
                                            Test Chat
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="bg-slate-700 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <FlaskConical className="w-5 h-5 text-orange-400" />
                                    <h3 className="font-semibold text-green-300">Benchmark Orchestrator</h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">
                                    Point d'entrée pour tous les tests et benchmarks
                                </p>
                                <div className="space-y-1 text-xs text-slate-300">
                                    <div>• A/B Testing</div>
                                    <div>• Auto-Optimization</div>
                                    <div>• SPG Calculation</div>
                                </div>
                                <Button
                                    onClick={runBenchmarkOrchestratorTest}
                                    disabled={isRunning}
                                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                                    size="sm"
                                >
                                    {isRunning ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3 h-3 mr-2" />
                                            Test Benchmark
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <Button
                                onClick={runFullDiagnostic}
                                disabled={isRunning}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Diagnostic en cours...
                                    </>
                                ) : (
                                    <>
                                        <Stethoscope className="w-4 h-4 mr-2" />
                                        Lancer Diagnostic Complet
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="results" className="space-y-6">
                    <TabsList className="bg-slate-800">
                        <TabsTrigger value="results">Résultats des Tests</TabsTrigger>
                        <TabsTrigger value="logs">Logs Unifiés</TabsTrigger>
                        <TabsTrigger value="documentation">Documentation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="results" className="space-y-4">
                        {/* Chat Orchestrator Results */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Chat Orchestrator - Résultats
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {testResults.chatOrchestrator ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            {testResults.chatOrchestrator.status === 'success' ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                            ) : (
                                                <AlertCircle className="w-6 h-6 text-red-400" />
                                            )}
                                            <div>
                                                <Badge className={
                                                    testResults.chatOrchestrator.status === 'success' 
                                                        ? 'bg-green-600' 
                                                        : 'bg-red-600'
                                                }>
                                                    {testResults.chatOrchestrator.status}
                                                </Badge>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {testResults.chatOrchestrator.duration}ms
                                                </p>
                                            </div>
                                        </div>

                                        {testResults.chatOrchestrator.status === 'success' && (
                                            <div className="bg-slate-700 p-4 rounded-lg space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-400 mb-1">Réponse:</p>
                                                    <p className="text-sm text-slate-300">
                                                        {testResults.chatOrchestrator.response}...
                                                    </p>
                                                </div>
                                                {testResults.chatOrchestrator.metadata && (
                                                    <div>
                                                        <p className="text-xs text-slate-400 mb-1">Métadonnées:</p>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-slate-500">Tokens:</span>
                                                                <span className="ml-2 text-green-400">
                                                                    {testResults.chatOrchestrator.metadata.total_tokens || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500">LLM Calls:</span>
                                                                <span className="ml-2 text-blue-400">
                                                                    {testResults.chatOrchestrator.metadata.llm_calls || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {testResults.chatOrchestrator.status === 'error' && (
                                            <div className="bg-red-900/20 border border-red-600/50 p-4 rounded-lg">
                                                <p className="text-sm text-red-400">
                                                    {testResults.chatOrchestrator.error}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm">Aucun test exécuté</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Benchmark Orchestrator Results */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5" />
                                    Benchmark Orchestrator - Résultats
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {testResults.benchmarkOrchestrator ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            {testResults.benchmarkOrchestrator.status === 'success' ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                            ) : (
                                                <AlertCircle className="w-6 h-6 text-red-400" />
                                            )}
                                            <div>
                                                <Badge className={
                                                    testResults.benchmarkOrchestrator.status === 'success' 
                                                        ? 'bg-green-600' 
                                                        : 'bg-red-600'
                                                }>
                                                    {testResults.benchmarkOrchestrator.status}
                                                </Badge>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {testResults.benchmarkOrchestrator.duration}ms
                                                </p>
                                            </div>
                                        </div>

                                        {testResults.benchmarkOrchestrator.status === 'success' && (
                                            <div className="bg-slate-700 p-4 rounded-lg">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="text-xs text-slate-400">Winner</p>
                                                        <p className="text-lg font-bold text-green-400">
                                                            {testResults.benchmarkOrchestrator.winner === 'mode_b' ? 'Mode B' : 'Mode A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400">Improvement</p>
                                                        <p className="text-lg font-bold text-orange-400">
                                                            {testResults.benchmarkOrchestrator.improvement?.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400">SPG</p>
                                                        <p className="text-lg font-bold text-purple-400">
                                                            {testResults.benchmarkOrchestrator.spg?.toFixed(3) || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400">Time Diff</p>
                                                        <p className="text-lg font-bold text-blue-400">
                                                            {(testResults.benchmarkOrchestrator.mode_b_time - testResults.benchmarkOrchestrator.mode_a_time)}ms
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {testResults.benchmarkOrchestrator.status === 'error' && (
                                            <div className="bg-red-900/20 border border-red-600/50 p-4 rounded-lg">
                                                <p className="text-sm text-red-400">
                                                    {testResults.benchmarkOrchestrator.error}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-sm">Aucun test exécuté</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="logs" className="space-y-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Logs Unifiés de Diagnostic</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {logs.length > 0 ? (
                                    <UnifiedLogViewer logs={logs} />
                                ) : (
                                    <p className="text-slate-400 text-sm">Aucun log disponible. Lancez un diagnostic.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documentation" className="space-y-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Documentation Architecturale</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-green-300 mb-3">Vue d'ensemble</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        L'architecture Neuronas v2.0 est basée sur deux orchestrateurs unifiés qui centralisent 
                                        toute la logique d'exécution de l'application. Cette approche garantit la cohérence, 
                                        la maintenabilité et la performance.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-green-300 mb-3">1. Chat Orchestrator</h3>
                                    <div className="bg-slate-700 p-4 rounded-lg space-y-2 text-sm">
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Fonction:</strong> <code className="text-blue-300">chatOrchestrator</code>
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Responsabilité:</strong> Gère toutes les interactions conversationnelles
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Agents supportés:</strong>
                                        </p>
                                        <ul className="list-disc list-inside ml-4 text-slate-400">
                                            <li>smas_debater (débats multi-personas)</li>
                                            <li>suno_prompt_architect (génération prompts Suno)</li>
                                            <li>qronas_dispatcher (dispatch intelligent)</li>
                                        </ul>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Intégrations:</strong> D3STIB, QRONAS, Perplexity, Persona Optimizer
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-green-300 mb-3">2. Benchmark Orchestrator</h3>
                                    <div className="bg-slate-700 p-4 rounded-lg space-y-2 text-sm">
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Fonction:</strong> <code className="text-blue-300">benchmarkOrchestrator</code>
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Responsabilité:</strong> Exécute et orchestre tous les tests de benchmark
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Modes supportés:</strong>
                                        </p>
                                        <ul className="list-disc list-inside ml-4 text-slate-400">
                                            <li>ab_test (comparaison Mode A vs Mode B)</li>
                                            <li>auto_tune (optimisation automatique itérative)</li>
                                            <li>single_llm (appel unique pour tests rapides)</li>
                                        </ul>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">Calculs:</strong> SPG, ARS, Token efficiency, Quality scores
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-green-300 mb-3">Avantages de l'architecture unifiée</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-green-900/20 border border-green-600/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Zap className="w-4 h-4 text-green-400" />
                                                <span className="font-semibold text-green-300 text-sm">Performance</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Points d'entrée uniques permettent des optimisations globales et du caching efficace
                                            </p>
                                        </div>

                                        <div className="bg-blue-900/20 border border-blue-600/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Brain className="w-4 h-4 text-blue-400" />
                                                <span className="font-semibold text-blue-300 text-sm">Maintenabilité</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Code centralisé facilite les corrections de bugs et les évolutions
                                            </p>
                                        </div>

                                        <div className="bg-purple-900/20 border border-purple-600/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                                <span className="font-semibold text-purple-300 text-sm">Cohérence</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Logs unifiés, gestion d'erreurs standardisée, patterns réutilisables
                                            </p>
                                        </div>

                                        <div className="bg-orange-900/20 border border-orange-600/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Shield className="w-4 h-4 text-orange-400" />
                                                <span className="font-semibold text-orange-300 text-sm">Sécurité</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Validation centralisée, gestion des permissions, protection contre les abus
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-green-300 mb-3">Migration des anciennes fonctions</h3>
                                    <div className="bg-slate-700 p-4 rounded-lg space-y-2 text-xs">
                                        <p className="text-slate-300">
                                            <strong className="text-red-400">❌ Supprimé:</strong> neuronasOrchestrator.js
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-red-400">❌ Supprimé:</strong> benchmarkRunner.js
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">✅ Remplacé par:</strong> benchmarkOrchestrator.js (unique)
                                        </p>
                                        <p className="text-slate-300">
                                            <strong className="text-green-400">✅ Nouveau:</strong> chatOrchestrator.js (unique)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
