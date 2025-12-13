import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play, AlertCircle } from 'lucide-react';

export default function SystemPipelineTest() {
    const [testPrompt, setTestPrompt] = useState('Explain the ethical implications of AI in healthcare and propose a framework for responsible deployment.');
    const [testing, setTesting] = useState(false);
    const [results, setResults] = useState(null);

    const runPipelineTest = async () => {
        setTesting(true);
        setResults(null);

        try {
            const { data } = await base44.functions.invoke('pipelineTestRunner', {
                test_prompt: testPrompt
            });

            setResults(data);
        } catch (error) {
            setResults({
                success: false,
                error: error.message,
                test_results: { failed: 1, total_tests: 1 }
            });
        } finally {
            setTesting(false);
        }
    };

    const getStatusColor = (status) => {
        if (status === 'SUCCESS') return 'text-green-400';
        if (status === 'ERROR') return 'text-red-400';
        if (status === 'WARNING') return 'text-orange-400';
        return 'text-slate-400';
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            Neuronas Pipeline Integration Test
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Test Prompt</label>
                            <Textarea
                                value={testPrompt}
                                onChange={(e) => setTestPrompt(e.target.value)}
                                rows={4}
                                className="bg-slate-900 border-slate-700 text-slate-200"
                                placeholder="Enter your test prompt..."
                            />
                        </div>

                        <Button
                            onClick={runPipelineTest}
                            disabled={testing || !testPrompt.trim()}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running Pipeline Tests...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Complete Pipeline Test
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {results && (
                    <>
                        {/* Summary */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-blue-400">Test Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Total Tests</div>
                                        <div className="text-2xl font-bold text-slate-200">
                                            {results.test_results?.total_tests || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Passed</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {results.test_results?.passed || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Failed</div>
                                        <div className="text-2xl font-bold text-red-400">
                                            {results.test_results?.failed || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                                        <div className="text-2xl font-bold text-orange-400">
                                            {results.test_results?.success_rate || 0}%
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 rounded-lg bg-slate-900">
                                    <div className="text-sm text-slate-300">
                                        {results.recommendation}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Modules Tested */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-purple-400">Modules Tested</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {results.test_results?.modules_tested?.map((module, idx) => (
                                        <Badge key={idx} className="bg-purple-600">
                                            {module}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pipeline Flow */}
                        {results.pipeline_flow && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-orange-400">Pipeline Data Flow</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {results.pipeline_flow.smarce_output && (
                                        <div className="p-3 bg-slate-900 rounded-lg">
                                            <div className="text-sm font-semibold text-green-400 mb-2">SMARCE Output</div>
                                            <div className="text-xs text-slate-300 space-y-1">
                                                <div>Complexity: {results.pipeline_flow.smarce_output.complexity?.toFixed(3)}</div>
                                                <div>Archetype: {results.pipeline_flow.smarce_output.archetype}</div>
                                            </div>
                                        </div>
                                    )}

                                    {results.pipeline_flow.dstib_output && (
                                        <div className="p-3 bg-slate-900 rounded-lg">
                                            <div className="text-sm font-semibold text-blue-400 mb-2">DSTIB Output</div>
                                            <div className="text-xs text-slate-300 space-y-1">
                                                <div>Tier: {results.pipeline_flow.dstib_output.semantic_tier}</div>
                                                <div>Layer: {results.pipeline_flow.dstib_output.routing_layer}</div>
                                            </div>
                                        </div>
                                    )}

                                    {results.pipeline_flow.d2stim_output && (
                                        <div className="p-3 bg-slate-900 rounded-lg">
                                            <div className="text-sm font-semibold text-purple-400 mb-2">D2STIM Output</div>
                                            <div className="text-xs text-slate-300 space-y-1">
                                                <div>D2 Activation: {results.pipeline_flow.d2stim_output.d2_activation?.toFixed(3)}</div>
                                                <div>Personas: {results.pipeline_flow.d2stim_output.config?.max_personas}</div>
                                            </div>
                                        </div>
                                    )}

                                    {results.pipeline_flow.qronas_output && (
                                        <div className="p-3 bg-slate-900 rounded-lg">
                                            <div className="text-sm font-semibold text-pink-400 mb-2">QRONAS Output</div>
                                            <div className="text-xs text-slate-300 space-y-1">
                                                <div>Synthesis: {results.pipeline_flow.qronas_output.synthesis_length} chars</div>
                                                <div>Citations: {results.pipeline_flow.qronas_output.citations}</div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Detailed Logs */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-slate-400">Detailed Test Logs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 max-h-96 overflow-y-auto">
                                    {results.test_logs?.map((log, idx) => (
                                        <div key={idx} className="text-xs font-mono">
                                            <span className="text-slate-500">{log.timestamp}</span>
                                            <span className={`ml-2 font-semibold ${getStatusColor(log.level)}`}>
                                                [{log.level}]
                                            </span>
                                            <span className="ml-2 text-slate-400">[{log.module}]</span>
                                            <span className="ml-2 text-slate-300">{log.message}</span>
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