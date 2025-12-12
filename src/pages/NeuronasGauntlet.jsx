import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Play,
    Loader2,
    Trophy,
    AlertCircle,
    CheckCircle2,
    Clock,
    Target,
    Brain
} from 'lucide-react';
import { toast } from 'sonner';

export default function NeuronasGauntletPage() {
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentRun, setCurrentRun] = useState(null);
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        loadUser();
        loadLatestRun();
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadLatestRun = async () => {
        try {
            const allResults = await base44.entities.GauntletResult.list('-created_date', 100);
            if (allResults.length > 0) {
                const latestRunId = allResults[0].run_id;
                const runResults = allResults.filter(r => r.run_id === latestRunId);
                setResults(runResults);
                calculateSummary(runResults);
            }
        } catch (error) {
            console.error('Failed to load results:', error);
        }
    };

    const calculateSummary = (runResults) => {
        const judged = runResults.filter(r => r.status === 'judged');
        const avgScore = judged.length > 0
            ? judged.reduce((sum, r) => sum + r.judge_score, 0) / judged.length
            : 0;
        const avgTime = runResults.filter(r => r.time_taken_ms).length > 0
            ? runResults.filter(r => r.time_taken_ms).reduce((sum, r) => sum + r.time_taken_ms, 0) / 
              runResults.filter(r => r.time_taken_ms).length
            : 0;

        setSummary({
            total: runResults.length,
            judged: judged.length,
            avgScore: avgScore.toFixed(1),
            avgTime: avgTime.toFixed(0)
        });
    };

    const runGauntlet = async () => {
        if (!questions.trim()) {
            toast.error('Please enter at least one question');
            return;
        }

        setIsRunning(true);
        setResults([]);
        setSummary(null);

        const questionArray = questions.split('\n')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        if (questionArray.length === 0) {
            toast.error('No valid questions found');
            setIsRunning(false);
            return;
        }

        try {
            toast.info(`🚀 Starting Neuronas Gauntlet with ${questionArray.length} questions...`);

            const { data } = await base44.functions.invoke('runNeuronasGauntlet', {
                questions: questionArray
            });

            if (!data || !data.success) {
                throw new Error(data?.error || 'Gauntlet run failed');
            }

            setCurrentRun(data.run_id);
            setResults(data.results || []);
            setSummary(data.summary);

            toast.success(`✅ Gauntlet complete! Average score: ${data.summary.average_score.toFixed(1)}/10`);

        } catch (error) {
            console.error('Gauntlet error:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'judged': return 'bg-green-600';
            case 'answered': return 'bg-blue-600';
            case 'timeout': return 'bg-orange-600';
            case 'error': return 'bg-red-600';
            default: return 'bg-slate-600';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        if (score >= 4) return 'text-orange-400';
        return 'text-red-400';
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Target className="w-8 h-8" />
                            Neuronas Empirical Gauntlet
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Sequential LLM testing with D2 modulation (d2_stim=0.2, d2_pin=0.9)
                        </p>
                    </div>
                </div>

                {/* Configuration Info */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Protocol Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-700 p-3 rounded">
                                <div className="text-xs text-slate-400">Model</div>
                                <div className="text-sm font-bold text-green-400">Default LLM (InvokeLLM)</div>
                            </div>
                            <div className="bg-slate-700 p-3 rounded">
                                <div className="text-xs text-slate-400">D2 Stim</div>
                                <div className="text-sm font-bold text-blue-400">0.2 (Low Excitement)</div>
                            </div>
                            <div className="bg-slate-700 p-3 rounded">
                                <div className="text-xs text-slate-400">D2 Pin</div>
                                <div className="text-sm font-bold text-purple-400">0.9 (High Precision)</div>
                            </div>
                            <div className="bg-slate-700 p-3 rounded">
                                <div className="text-xs text-slate-400">Timeout</div>
                                <div className="text-sm font-bold text-orange-400">60s</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Input Section */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Test Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Enter questions, one per line..."
                            value={questions}
                            onChange={(e) => setQuestions(e.target.value)}
                            className="min-h-32 bg-slate-700 border-slate-600 text-green-300"
                            disabled={isRunning}
                        />
                        <Button
                            onClick={runGauntlet}
                            disabled={isRunning || !questions.trim()}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running Gauntlet...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Execute Gauntlet
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-8 h-8 text-green-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Avg Score</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {summary.avgScore}/10
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-8 h-8 text-blue-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Avg Time</div>
                                        <div className="text-2xl font-bold text-blue-400">
                                            {summary.avgTime}ms
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-8 h-8 text-purple-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Judged</div>
                                        <div className="text-2xl font-bold text-purple-400">
                                            {summary.judged}/{summary.total}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Target className="w-8 h-8 text-orange-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Total</div>
                                        <div className="text-2xl font-bold text-orange-400">
                                            {summary.total}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Results Table */}
                {results.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400">Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {results.map((result, idx) => (
                                    <div key={idx} className="bg-slate-700 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-green-400 mb-1">
                                                    {result.question_id || `Q${idx + 1}`}
                                                </div>
                                                <div className="text-xs text-slate-300 mb-2">
                                                    {result.question}
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(result.status)}>
                                                {result.status}
                                            </Badge>
                                        </div>

                                        {result.model_answer && (
                                            <div className="mb-2 p-2 bg-slate-800 rounded text-xs text-slate-300">
                                                <div className="text-slate-500 mb-1">Answer:</div>
                                                {result.model_answer}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 text-xs">
                                            {result.time_taken_ms && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-blue-400" />
                                                    <span className="text-slate-400">{result.time_taken_ms}ms</span>
                                                </div>
                                            )}
                                            {result.judge_score && (
                                                <div className="flex items-center gap-1">
                                                    <Trophy className="w-3 h-3 text-green-400" />
                                                    <span className={getScoreColor(result.judge_score)}>
                                                        {result.judge_score}/10
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {result.judge_reasoning && (
                                            <div className="mt-2 p-2 bg-slate-800 rounded text-xs text-slate-400">
                                                <div className="text-slate-500 mb-1">Judge Reasoning:</div>
                                                {result.judge_reasoning}
                                            </div>
                                        )}

                                        {result.error_message && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                                                <AlertCircle className="w-3 h-3" />
                                                {result.error_message}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}