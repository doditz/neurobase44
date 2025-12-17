import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, AlertTriangle } from 'lucide-react';

export default function Phase3JerkFilterTest() {
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState(null);

    const runTest = async () => {
        setTesting(true);
        setResults(null);

        try {
            const { data } = await base44.functions.invoke('testPhase3JerkFilter');
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
            <div className="max-w-6xl mx-auto space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            PHASE 3: D³STIB Semantic Jerk Filter Test
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2">
                            Tests 3rd derivative analysis for detecting semantic discontinuities and attacks
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={runTest}
                            disabled={testing}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Testing Jerk Filter...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Phase 3 Tests
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {results && (
                    <>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-orange-400 flex items-center gap-2">
                                    {results.test_results?.passed === results.test_results?.total ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-yellow-400" />
                                    )}
                                    Test Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Total Tests</div>
                                        <div className="text-2xl font-bold text-slate-200">
                                            {results.test_results?.total || 0}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Passed</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {results.test_results?.passed || 0}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Failed</div>
                                        <div className="text-2xl font-bold text-red-400">
                                            {results.test_results?.failed || 0}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-lg">
                                        <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                                        <div className="text-2xl font-bold text-cyan-400">
                                            {results.test_results?.success_rate || '0%'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-slate-900">
                                    <Badge className={results.test_results?.passed === results.test_results?.total ? 'bg-green-600' : 'bg-yellow-600'}>
                                        {results.recommendation}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-blue-400">Jerk Detection Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {results.detailed_results?.map((result, idx) => (
                                        <div key={idx} className="p-3 bg-slate-900 rounded-lg">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-200 mb-1">
                                                        {result.test_name}
                                                    </div>
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        {result.expected_jerk !== undefined && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Expected: {result.expected_jerk ? 'Jerk' : 'No Jerk'}
                                                            </Badge>
                                                        )}
                                                        <Badge className={result.detected_jerk ? 'bg-red-600' : 'bg-green-600'}>
                                                            Detected: {result.detected_jerk ? 'Jerk' : 'No Jerk'}
                                                        </Badge>
                                                        {result.jerk_type && result.jerk_type !== 'none' && (
                                                            <Badge className="bg-orange-600">
                                                                {result.jerk_type}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {result.passed ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            {result.jerk_magnitude !== undefined && (
                                                <div className="text-xs text-slate-400 mt-2">
                                                    Magnitude: {result.jerk_magnitude?.toFixed(4)} | 
                                                    Action: {result.filtering_action}
                                                </div>
                                            )}
                                            {result.security_enabled && (
                                                <div className="text-xs text-green-400 mt-2">
                                                    🛡️ Security measures activated
                                                </div>
                                            )}
                                            {result.error && (
                                                <div className="text-xs text-red-400 mt-2">
                                                    Error: {result.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-400">Execution Logs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                                    {results.logs?.map((log, idx) => (
                                        <div key={idx} className="text-slate-300">
                                            <span className="text-slate-500">{log.timestamp}</span>
                                            <span className="ml-2">{log.msg}</span>
                                            {log.data && (
                                                <span className="ml-2 text-red-400">
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