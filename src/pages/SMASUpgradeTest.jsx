import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, ArrowRight, Trash2 } from 'lucide-react';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';
import { createLogger, saveToUnifiedLog } from '@/components/core/NeuronasLogger';

export default function SMASUpgradeTest() {
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState(null);
    const loggerRef = useRef(createLogger('SMASUpgradeTest'));

    const runTest = async () => {
        setTesting(true);
        const logger = loggerRef.current;
        logger.system('🚀 NEW TEST RUN: SMAS v4.3 Dynamics');

        try {
            const { data } = await base44.functions.invoke('testSMASDynamics');
            setResults(data);
            if (data.logs) {
                data.logs.forEach(l => logger.info(l.msg || JSON.stringify(l)));
            }
            logger.success(`Test completed: ${data.test_results?.all_tests_passed ? 'All passed' : 'Some failed'}`);
            
            await saveToUnifiedLog(logger, {
                source_type: 'pipeline_test',
                execution_context: 'SMASUpgradeTest',
                metrics: { G_t: data.test_results?.G_t || 0, D_t: data.test_results?.D_t || 0, B_t: data.test_results?.B_t || 0 },
                result_summary: `SMAS v4.3: ${data.test_results?.all_tests_passed ? 'All passed' : 'Some failed'}`,
                status: data.test_results?.all_tests_passed ? 'success' : 'failed'
            });
        } catch (error) {
            setResults({ success: false, error: error.message });
            logger.error(`Test failed: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    const clearLogs = () => { loggerRef.current = createLogger('SMASUpgradeTest'); };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5" />
                            PHASE 1: v4.3 SMAS Dynamics Validation
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2">
                            Test des 4 équations SMAS avant upgrade v4.7
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button
                                onClick={runTest}
                                disabled={testing}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Testing v4.3 Functions...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run v4.3 Validation
                                    </>
                                )}
                            </Button>
                            {allLogs.length > 0 && (
                                <Button
                                    onClick={clearLogs}
                                    variant="outline"
                                    className="border-slate-600 text-slate-400 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Clear Logs
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {results && (
                    <>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-blue-400 flex items-center gap-2">
                                    {results.test_results?.all_tests_passed ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    )}
                                    Test Results
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">F_L</div>
                                        <div className="text-xl font-bold text-green-400">
                                            {results.test_results?.F_L?.toFixed(3) || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">F_R</div>
                                        <div className="text-xl font-bold text-purple-400">
                                            {results.test_results?.F_R?.toFixed(3) || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">D(t)</div>
                                        <div className="text-xl font-bold text-orange-400">
                                            {results.test_results?.D_t?.toFixed(3) || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">B(t)</div>
                                        <div className="text-xl font-bold text-yellow-400">
                                            {results.test_results?.B_t?.toFixed(3) || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">G(t)</div>
                                        <div className="text-xl font-bold text-cyan-400">
                                            {results.test_results?.G_t?.toFixed(3) || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-slate-900">
                                    <Badge className={results.test_results?.all_tests_passed ? 'bg-green-600' : 'bg-red-600'}>
                                        {results.recommendation}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <UnifiedLogViewer
                            logs={loggerRef.current.getFormattedLogs()}
                            title="Detailed Logs"
                            showStats={true}
                            defaultExpanded={true}
                        />
                    </>
                )}
            </div>
        </div>
    );
}