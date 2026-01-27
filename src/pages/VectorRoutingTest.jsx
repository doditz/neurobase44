import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, Zap, Trash2 } from 'lucide-react';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';

export default function VectorRoutingTest() {
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState(null);
    const [allLogs, setAllLogs] = useState([]);

    const runTest = async () => {
        setTesting(true);
        setAllLogs(prev => [
            ...prev,
            ...(prev.length > 0 ? [{ level: 'SYSTEM', msg: '────────────────────────────────────────', timestamp: new Date().toISOString() }] : []),
            { level: 'SYSTEM', msg: '🚀 NEW TEST RUN: Vector Routing', timestamp: new Date().toISOString() }
        ]);

        try {
            const { data } = await base44.functions.invoke('testVectorRouting');
            setResults(data);
            if (data.logs) {
                setAllLogs(prev => [...prev, ...data.logs]);
            }
        } catch (error) {
            setResults({
                success: false,
                error: error.message
            });
            setAllLogs(prev => [...prev, { level: 'ERROR', msg: `Test failed: ${error.message}`, timestamp: new Date().toISOString() }]);
        } finally {
            setTesting(false);
        }
    };

    const clearLogs = () => setAllLogs([]);

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-purple-400 flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            PHASE 2: Vector Embedding & Semantic Routing Test
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2">
                            Tests embeddings generation + cosine similarity-based tier detection
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button
                                onClick={runTest}
                                disabled={testing}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Testing Vector Routing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Run Phase 2 Tests
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

                        {results.detailed_results && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-blue-400">Detailed Test Results</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {results.detailed_results.map((result, idx) => (
                                            <div key={idx} className="p-3 bg-slate-900 rounded-lg">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="text-sm text-slate-300 mb-1">
                                                            {result.query}
                                                        </div>
                                                        <div className="flex gap-2 items-center">
                                                            <Badge variant="outline" className="text-xs">
                                                                Expected: {result.expected}
                                                            </Badge>
                                                            <Badge className={result.passed ? 'bg-green-600' : 'bg-red-600'}>
                                                                Detected: {result.detected}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {result.passed ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    )}
                                                </div>
                                                {result.confidence && (
                                                    <div className="text-xs text-slate-400 mt-2">
                                                        Confidence: {result.confidence?.toFixed(3)} | Method: {result.method}
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
                        )}

                        <UnifiedLogViewer
                            logs={allLogs.map(l => `[${l.timestamp}] [${l.level || 'INFO'}] ${l.msg}${l.data ? ' ' + JSON.stringify(l.data) : ''}`)}
                            title={`Execution Logs (${allLogs.length} entries)`}
                            showStats={true}
                            defaultExpanded={true}
                        />
                    </>
                )}
            </div>
        </div>
    );
}