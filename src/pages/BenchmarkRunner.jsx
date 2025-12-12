
import React, { useState, useEffect } from 'react';
import { BenchmarkQuestion } from '@/entities/BenchmarkQuestion';
import { BenchmarkResult } from '@/entities/BenchmarkResult';
import { User } from '@/entities/User';
import { InvokeLLM } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Clock,
    Brain,
    TrendingUp,
    Download
} from 'lucide-react';

export default function BenchmarkRunner() {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [results, setResults] = useState([]);
    const [currentTest, setCurrentTest] = useState(null);
    const [overallStats, setOverallStats] = useState({
        total: 0,
        completed: 0,
        passed: 0,
        failed: 0,
        avgImprovement: 0
    });
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
        loadQuestions();
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadQuestions = async () => {
        try {
            const allQuestions = await BenchmarkQuestion.list();
            setQuestions(allQuestions);
            setOverallStats(prev => ({ ...prev, total: allQuestions.length }));
        } catch (error) {
            console.error('Failed to load questions:', error);
        }
    };

    const estimateTokens = (text) => {
        return Math.ceil(text.length / 4);
    };

    const runSingleBenchmark = async (question) => {
        setCurrentTest(`Testing: ${question.question_id}`);

        const startTime = Date.now();

        // MODE A: Direct LLM (no Neuronas validation)
        const startA = Date.now();
        const responseA = await InvokeLLM({
            prompt: question.question_text,
            add_context_from_internet: false
        });
        const timeA = Date.now() - startA;
        const tokenCountA = estimateTokens(typeof responseA === 'string' ? responseA : JSON.stringify(responseA));

        // MODE B: Neuronas with dynamic parameter adjustment
        const complexityPrompt = `QRONAS_DISPATCHER_REQUEST:
{
  "operation": "calculate_tri_hemispheric_weights",
  "input": {
    "query_text": "${question.question_text.replace(/"/g, '\\"')}",
    "current_d2_modulation": 0.65,
    "context": {
      "question_type": "${question.question_type}",
      "complexity_level": "${question.niveau_complexite}",
      "dominant_hemisphere": "${question.hemisphere_dominant}"
    }
  }
}`;

        const triHemResult = await InvokeLLM({
            prompt: complexityPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    operation: { type: "string" },
                    result: {
                        type: "object",
                        properties: {
                            alpha: { type: "number" },
                            beta: { type: "number" },
                            gamma: { type: "number" },
                            complexity_score: { type: "number" },
                            recommended_persona_count: { type: "integer" },
                            dominant_hemisphere: { type: "string" }
                        }
                    }
                }
            }
        });

        const { alpha, beta, gamma, complexity_score, recommended_persona_count, dominant_hemisphere } = triHemResult.result;

        const d2Activation = alpha > 0.5 ? 0.8 : (beta > 0.5 ? 0.3 : 0.5);
        const temperature = beta > 0.5 ? 0.85 : (alpha > 0.5 ? 0.4 : 0.7);
        const debateRounds = Math.ceil(complexity_score * 5);

        const neuronasPrompt = `${question.question_text}

[SYSTEM SETTINGS: Use ${recommended_persona_count} personas, Temperature: ${temperature}, Mode: ${dominant_hemisphere}, Ethical Level: high, Debate Rounds: ${debateRounds}, D2 Activation: ${d2Activation}, Tri-Hemispheric Weights: α=${alpha.toFixed(2)} β=${beta.toFixed(2)} γ=${gamma.toFixed(2)}]

Ground Truth Context: ${question.ground_truth || 'No ground truth - evaluate on reasoning quality'}
Expected Key Points: ${question.expected_key_points?.join(', ') || 'See priority ARS criteria'}`;

        const startB = Date.now();
        const responseB = await InvokeLLM({
            prompt: neuronasPrompt,
            add_context_from_internet: false
        });
        const timeB = Date.now() - startB;
        const tokenCountB = estimateTokens(typeof responseB === 'string' ? responseB : JSON.stringify(responseB));

        // Evaluation
        const evaluationPrompt = `Evaluate these two responses to the benchmark question:

QUESTION: ${question.question_text}
QUESTION TYPE: ${question.question_type}
COMPLEXITY: ${question.niveau_complexite}
GROUND TRUTH: ${question.ground_truth}
EXPECTED KEY POINTS: ${question.expected_key_points?.join(', ')}

RESPONSE A (Direct LLM):
${typeof responseA === 'string' ? responseA : JSON.stringify(responseA)}

RESPONSE B (Neuronas with ${recommended_persona_count} personas, α=${alpha.toFixed(2)} β=${beta.toFixed(2)} γ=${gamma.toFixed(2)}):
${typeof responseB === 'string' ? responseB : JSON.stringify(responseB)}

Evaluate based on priority ARS criteria:
${JSON.stringify(question.priority_ars_criteria, null, 2)}

Return scores (0.0-1.0) for each criterion, plus winner and detailed reasoning.`;

        const scores = await InvokeLLM({
            prompt: evaluationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    mode_a_ars_score: { type: "number" },
                    mode_b_ars_score: { type: "number" },
                    semantic_fidelity_a: { type: "number" },
                    semantic_fidelity_b: { type: "number" },
                    reasoning_score_a: { type: "number" },
                    reasoning_score_b: { type: "number" },
                    creativity_score_a: { type: "number" },
                    creativity_score_b: { type: "number" },
                    ethics_score_a: { type: "number" },
                    ethics_score_b: { type: "number" },
                    depth_score_a: { type: "number" },
                    depth_score_b: { type: "number" },
                    cultural_authenticity_a: { type: "number" },
                    cultural_authenticity_b: { type: "number" },
                    adaptability_score_b: { type: "number" },
                    winner: { type: "string" },
                    reasoning: { type: "string" },
                    passed_minimum_criteria: { type: "boolean" }
                }
            }
        });

        const avgScoreA = (
            scores.mode_a_ars_score +
            scores.semantic_fidelity_a +
            scores.reasoning_score_a +
            scores.creativity_score_a +
            scores.ethics_score_a +
            scores.depth_score_a +
            scores.cultural_authenticity_a
        ) / 7;

        const avgScoreB = (
            scores.mode_b_ars_score +
            scores.semantic_fidelity_b +
            scores.reasoning_score_b +
            scores.creativity_score_b +
            scores.ethics_score_b +
            scores.depth_score_b +
            scores.cultural_authenticity_b +
            scores.adaptability_score_b
        ) / 8;

        const improvement = ((avgScoreB - avgScoreA) / avgScoreA) * 100;

        const benchmarkData = {
            scenario_name: `${question.question_id}: ${question.source_benchmark}`,
            scenario_category: question.question_type,
            test_prompt: question.question_text,
            mode_a_response: typeof responseA === 'string' ? responseA : JSON.stringify(responseA),
            mode_a_time_ms: timeA,
            mode_a_token_count: tokenCountA,
            mode_b_response: typeof responseB === 'string' ? responseB : JSON.stringify(responseB),
            mode_b_time_ms: timeB,
            mode_b_token_count: tokenCountB,
            mode_b_personas_used: [`${recommended_persona_count} dynamic personas`],
            mode_b_d2_activation: d2Activation,
            mode_b_tri_hemispheric_weights: { alpha, beta, gamma },
            mode_b_complexity_score: complexity_score,
            mode_b_dominant_hemisphere: dominant_hemisphere,
            mode_b_temperature: temperature,
            mode_b_debate_rounds: debateRounds,
            quality_scores: scores,
            winner: scores.winner,
            performance_improvement: improvement,
            notes: `Automated benchmark test for ${question.question_id}\nComplexity: ${question.niveau_complexite}\nPassed Criteria: ${scores.passed_minimum_criteria}\n\n${scores.reasoning}`
        };

        const savedResult = await BenchmarkResult.create(benchmarkData);
        
        return {
            ...savedResult,
            passed: scores.passed_minimum_criteria,
            totalTime: Date.now() - startTime
        };
    };

    const runBenchmarkSuite = async () => {
        setIsRunning(true);
        setIsPaused(false);
        setResults([]);
        setCurrentIndex(0);
        
        const testResults = [];
        let passed = 0;
        let failed = 0;
        let totalImprovement = 0;

        for (let i = 0; i < questions.length; i++) {
            if (isPaused) break;
            
            setCurrentIndex(i);
            try {
                const result = await runSingleBenchmark(questions[i]);
                testResults.push(result);
                
                if (result.passed) passed++;
                else failed++;
                
                totalImprovement += result.performance_improvement;
                
                setResults([...testResults]);
                setOverallStats({
                    total: questions.length,
                    completed: i + 1,
                    passed,
                    failed,
                    avgImprovement: totalImprovement / (i + 1)
                });
            } catch (error) {
                console.error(`Failed benchmark for question ${i}:`, error);
                failed++;
            }
        }

        setIsRunning(false);
        setCurrentTest(null);
    };

    const pauseBenchmark = () => {
        setIsPaused(true);
        setIsRunning(false);
    };

    const resetBenchmark = () => {
        setIsRunning(false);
        setIsPaused(false);
        setCurrentIndex(0);
        setResults([]);
        setCurrentTest(null);
        setOverallStats({
            total: questions.length,
            completed: 0,
            passed: 0,
            failed: 0,
            avgImprovement: 0
        });
    };

    const exportResults = () => {
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `neuronas_benchmark_results_${new Date().toISOString()}.json`;
        link.click();
    };

    const progress = overallStats.total > 0 ? (overallStats.completed / overallStats.total) * 100 : 0;

    return (
        <div className="h-screen overflow-y-auto bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Brain className="w-8 h-8 text-purple-400" />
                        <h1 className="text-3xl font-bold text-green-300">Neuronas Benchmark Suite Runner</h1>
                    </div>
                    <p className="text-slate-400">
                        Automated testing and validation of Neuronas SMAS-ARS architecture across diverse benchmark questions
                    </p>
                </div>

                {/* Controls */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-300 flex items-center justify-between">
                            <span>Test Controls</span>
                            <Badge variant="outline" className="text-purple-400 border-purple-600">
                                {questions.length} Questions Loaded
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button
                                onClick={runBenchmarkSuite}
                                disabled={isRunning || questions.length === 0}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Run Full Suite
                            </Button>
                            <Button
                                onClick={pauseBenchmark}
                                disabled={!isRunning}
                                variant="outline"
                                className="border-orange-600 text-orange-400"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                            <Button
                                onClick={resetBenchmark}
                                variant="outline"
                                className="border-slate-600 text-slate-400"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                            <Button
                                onClick={exportResults}
                                disabled={results.length === 0}
                                variant="outline"
                                className="ml-auto border-green-600 text-green-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Results
                            </Button>
                        </div>

                        {isRunning && (
                            <div className="mt-4 space-y-2">
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">{currentTest}</span>
                                    <span className="text-purple-400 font-mono">
                                        {overallStats.completed} / {overallStats.total}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Overall Stats */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-sm text-slate-400">Passed</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">{overallStats.passed}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-sm text-slate-400">Failed</span>
                            </div>
                            <p className="text-3xl font-bold text-red-400">{overallStats.failed}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                <span className="text-sm text-slate-400">Avg Improvement</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-400">
                                {overallStats.avgImprovement > 0 ? '+' : ''}{overallStats.avgImprovement.toFixed(1)}%
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <span className="text-sm text-slate-400">Completion</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400">{progress.toFixed(0)}%</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Results List */}
                {results.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-300">Test Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-3">
                                    {results.map((result, index) => (
                                        <div
                                            key={index}
                                            className="p-4 bg-slate-900 rounded-lg border border-slate-700"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {result.passed ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-500" />
                                                    )}
                                                    <span className="font-semibold text-green-300">
                                                        {result.scenario_name}
                                                    </span>
                                                </div>
                                                <Badge className={result.passed ? 'bg-green-600' : 'bg-red-600'}>
                                                    {result.passed ? 'Passed' : 'Failed'}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                                <div>
                                                    <span className="text-slate-400">Improvement:</span>
                                                    <span className={`ml-2 font-mono ${result.performance_improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {result.performance_improvement > 0 ? '+' : ''}{result.performance_improvement.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Personas:</span>
                                                    <span className="ml-2 font-mono text-purple-400">
                                                        {result.mode_b_personas_used?.[0] || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Time:</span>
                                                    <span className="ml-2 font-mono text-blue-400">
                                                        {(result.totalTime / 1000).toFixed(1)}s
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
