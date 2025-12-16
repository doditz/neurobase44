import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, ArrowRight } from 'lucide-react';

export default function SMASUpgradeTest() {
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState(null);

    const runTest = async () => {
        setTesting(true);
        setResults(null);

        try {
            const { data } = await base44.functions.invoke('testSMASDynamics');
            setResults(data);
        } catch (error) {
            setResults({
                success: false,
                error: error.message
            });
        } finally {
            setTesting(false);
        }
    };

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
                        <Button
                            onClick={runTest}
                            disabled={testing}
                            className="w-full bg-green-600 hover:bg-green-700"
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

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-400">Detailed Logs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                                    {results.logs?.map((log, idx) => (
                                        <div key={idx} className="text-slate-300">
                                            <span className="text-slate-500">{log.timestamp}</span>
                                            <span className="ml-2">{log.msg}</span>
                                            {log.data && (
                                                <span className="ml-2 text-green-400">
                                                    {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}