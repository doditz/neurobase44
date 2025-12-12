import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    Play, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    Clock,
    AlertCircle,
    Zap,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function PipelineTestPage() {
    const [testQuestion, setTestQuestion] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [expandedModule, setExpandedModule] = useState(null);

    const runTest = async (fullPipeline = true) => {
        setIsRunning(true);
        setTestResult(null);

        try {
            toast.info('🚀 Démarrage du test de pipeline...');

            const { data } = await base44.functions.invoke('pipelineAutoTest', {
                test_question: testQuestion.trim() || null,
                full_pipeline: fullPipeline
            });

            setTestResult(data);

            if (data.success) {
                toast.success(`✅ Test complété : ${data.summary.pass_rate} de réussite`);
            } else {
                toast.error(`⚠️ Test terminé avec ${data.errors.length} erreur(s)`);
            }
        } catch (error) {
            console.error('[PipelineTest] Error:', error);
            toast.error(`Erreur: ${error.message}`);
            setTestResult({ 
                success: false, 
                error: error.message,
                results: {},
                errors: [{ module: 'SYSTEM', error: error.message }]
            });
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PASS':
                return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'FAIL':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'SKIPPED':
                return <AlertCircle className="w-5 h-5 text-slate-400" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PASS':
                return 'bg-green-900/30 border-green-600/50 text-green-400';
            case 'FAIL':
                return 'bg-red-900/30 border-red-600/50 text-red-400';
            case 'SKIPPED':
                return 'bg-slate-800/50 border-slate-600/50 text-slate-400';
            default:
                return 'bg-slate-800/50 border-slate-600/50 text-slate-400';
        }
    };

    const moduleOrder = [
        'smarce',
        'dstib',
        'd2stim',
        'memory',
        'personas',
        'qronas',
        'validator',
        'bronas'
    ];

    const moduleNames = {
        'smarce': 'SMARCE Scorer',
        'dstib': 'DSTIB-Hebden Router',
        'd2stim': 'D2STIM Modulator',
        'memory': 'Memory Manager (7-DB)',
        'personas': 'Persona Team Optimizer',
        'qronas': 'QRONAS Engine',
        'validator': 'Cognitive Validator',
        'bronas': 'BRONAS Ethical Validator'
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Zap className="w-8 h-8" />
                            Pipeline Auto-Test Neuronas 4.7
                        </h1>
                        <p className="text-slate-400 mt-1">Test autonome de tous les modules du pipeline</p>
                    </div>
                </div>

                {/* Test Configuration */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Configuration du Test</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                Question de Test (optionnel - une question par défaut sera utilisée si vide)
                            </label>
                            <Textarea
                                placeholder="Entrez une question de test personnalisée..."
                                value={testQuestion}
                                onChange={(e) => setTestQuestion(e.target.value)}
                                className="min-h-24 bg-slate-700 border-slate-600 text-green-300"
                                disabled={isRunning}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => runTest(false)}
                                disabled={isRunning}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isRunning ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test en cours...</>
                                ) : (
                                    <><Play className="w-4 h-4 mr-2" /> Test Rapide (Core Modules)</>
                                )}
                            </Button>

                            <Button
                                onClick={() => runTest(true)}
                                disabled={isRunning}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isRunning ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test en cours...</>
                                ) : (
                                    <><Shield className="w-4 h-4 mr-2" /> Test Complet (All Modules)</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Results */}
                {testResult && (
                    <>
                        {/* Summary Card */}
                        <Card className={`border-2 ${
                            testResult.overall_status === 'ALL_PASS' ? 'bg-green-900/20 border-green-600' :
                            testResult.overall_status === 'PARTIAL_PASS' ? 'bg-orange-900/20 border-orange-600' :
                            'bg-red-900/20 border-red-600'
                        }`}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-white">
                                        {testResult.overall_status === 'ALL_PASS' ? '✅ Tous les Tests Réussis' :
                                         testResult.overall_status === 'PARTIAL_PASS' ? '⚠️ Tests Partiellement Réussis' :
                                         '❌ Échec Critique'}
                                    </h2>
                                    <Badge className={
                                        testResult.overall_status === 'ALL_PASS' ? 'bg-green-600' :
                                        testResult.overall_status === 'PARTIAL_PASS' ? 'bg-orange-600' :
                                        'bg-red-600'
                                    }>
                                        {testResult.summary.pass_rate}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Modules Testés</div>
                                        <div className="text-2xl font-bold text-slate-200">{testResult.summary.modules_run}</div>
                                    </div>
                                    <div className="bg-green-900/30 p-4 rounded-lg">
                                        <div className="text-xs text-green-400 mb-1">Réussis</div>
                                        <div className="text-2xl font-bold text-green-400">{testResult.summary.modules_passed}</div>
                                    </div>
                                    <div className="bg-red-900/30 p-4 rounded-lg">
                                        <div className="text-xs text-red-400 mb-1">Échecs</div>
                                        <div className="text-2xl font-bold text-red-400">{testResult.summary.modules_failed}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Temps Total</div>
                                        <div className="text-2xl font-bold text-slate-200">{testResult.summary.total_time_ms}ms</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Module Results */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Résultats par Module</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {moduleOrder.map((moduleKey) => {
                                        const result = testResult.results[moduleKey];
                                        if (!result) return null;

                                        return (
                                            <div key={moduleKey} className="border border-slate-700 rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedModule(expandedModule === moduleKey ? null : moduleKey)}
                                                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors ${getStatusColor(result.status)}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {getStatusIcon(result.status)}
                                                        <span className="font-semibold">{moduleNames[moduleKey]}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {result.status}
                                                        </Badge>
                                                    </div>
                                                    {result.error && (
                                                        <span className="text-xs text-red-400 truncate max-w-md">
                                                            {result.error}
                                                        </span>
                                                    )}
                                                </button>

                                                {expandedModule === moduleKey && result.status === 'PASS' && (
                                                    <div className="bg-slate-900/50 p-4 border-t border-slate-700">
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto">
                                                            {JSON.stringify(result, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Error Details */}
                        {testResult.errors && testResult.errors.length > 0 && (
                            <Card className="bg-red-900/20 border-red-600">
                                <CardHeader>
                                    <CardTitle className="text-red-400">Détails des Erreurs</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {testResult.errors.map((error, idx) => (
                                            <div key={idx} className="bg-slate-900/50 p-3 rounded border border-red-600/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                    <span className="font-semibold text-red-400">{error.module}</span>
                                                </div>
                                                <p className="text-sm text-slate-300">{error.error}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Logs */}
                        {testResult.logs && testResult.logs.length > 0 && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-400">Logs Détaillés</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-96 overflow-y-auto bg-slate-900 p-4 rounded font-mono text-xs">
                                        {testResult.logs.map((log, idx) => (
                                            <div key={idx} className={`mb-1 ${
                                                log.status === 'ERROR' ? 'text-red-400' :
                                                log.status === 'SUCCESS' ? 'text-green-400' :
                                                log.status === 'INFO' ? 'text-blue-400' :
                                                'text-slate-400'
                                            }`}>
                                                [{log.timestamp}] [{log.module}] {log.message}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}