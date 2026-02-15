import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Brain, 
    Loader2, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle2,
    Sparkles,
    BarChart3,
    Target,
    Zap,
    XCircle,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';

export default function DevTestAIAnalysis({ testIds, questionId, analysisType = 'single' }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [errorLogs, setErrorLogs] = useState([]);
    const [analysisLogs, setAnalysisLogs] = useState([]);

    const addLog = (level, message, details = null) => {
        setAnalysisLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            level,
            message,
            details
        }]);
    };

    const clearLogs = () => {
        setAnalysisLogs([]);
        setErrorLogs([]);
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysis(null);
        
        if (analysisLogs.length > 0) {
            addLog('SYSTEM', '────────────────────────────────────────');
        }
        addLog('SYSTEM', `🤖 AI ANALYSIS START: ${testIds?.length || 0} test(s), type: ${analysisType}`);

        try {
            toast.info('🤖 AI Analysis en cours...');
            addLog('INFO', `Invoking analyzeDevTestResults with ${testIds?.length || 0} test IDs`);

            const { data } = await base44.functions.invoke('analyzeDevTestResults', {
                test_ids: testIds,
                question_id: questionId,
                analysis_type: analysisType
            });

            addLog('DEBUG', 'Function response received', { success: data?.success, hasAnalysis: !!data?.analysis });

            if (!data.success) {
                const errorMsg = data.error || 'Analysis failed';
                addLog('ERROR', `Analysis failed: ${errorMsg}`, data);
                setErrorLogs([{
                    timestamp: new Date().toISOString(),
                    level: 'ERROR',
                    message: errorMsg,
                    fullResponse: data
                }]);
                throw new Error(errorMsg);
            }

            setAnalysis(data.analysis);
            setMetadata(data.metadata);
            addLog('SUCCESS', `✅ Analysis complete: ${data.metadata?.tests_analyzed || 0} tests analyzed`);
            toast.success('✨ Analyse terminée!');

        } catch (error) {
            console.error('[AIAnalysis] Error:', error);
            addLog('CRITICAL', `Exception caught: ${error.message}`, { 
                stack: error.stack,
                response: error.response?.data 
            });
            
            setErrorLogs(prev => [...prev, {
                timestamp: new Date().toISOString(),
                level: 'CRITICAL',
                message: error.message,
                stack: error.stack,
                response: error.response?.data
            }]);
            
            toast.error(`Erreur d'analyse: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getHealthColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthBg = (score) => {
        if (score >= 80) return 'bg-green-900/20 border-green-600/30';
        if (score >= 60) return 'bg-yellow-900/20 border-yellow-600/30';
        return 'bg-red-900/20 border-red-600/30';
    };

    return (
        <div className="space-y-4">
            {/* Trigger Button */}
            {!analysis && (
                <Card className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-purple-600/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-600/20 rounded-lg">
                                    <Brain className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-300">
                                        AI-Powered Analysis
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        Get deep insights, trends, and health scores
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={runAnalysis}
                                disabled={isAnalyzing}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Analyze with AI
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="space-y-4">
                    {/* Header */}
                    <Card className="bg-slate-800 border-purple-600/50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    <span className="text-green-400 font-semibold">
                                        AI Analysis Complete
                                    </span>
                                    <Badge className="bg-purple-900/50 text-purple-300">
                                        {metadata?.tests_analyzed} test(s)
                                    </Badge>
                                </div>
                                <Button
                                    onClick={runAnalysis}
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-600 text-purple-400"
                                >
                                    Re-analyze
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Health Scores */}
                    {analysis.health_scores && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {analysis.health_scores.mode_a !== undefined && (
                                <Card className={`${getHealthBg(analysis.health_scores.mode_a)} border`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="w-4 h-4 text-orange-400" />
                                            <span className="text-sm text-slate-400">Mode A Health</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${getHealthColor(analysis.health_scores.mode_a)}`}>
                                            {analysis.health_scores.mode_a}/100
                                        </div>
                                        <Progress 
                                            value={analysis.health_scores.mode_a} 
                                            className="h-2 mt-2"
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {analysis.health_scores.mode_b !== undefined && (
                                <Card className={`${getHealthBg(analysis.health_scores.mode_b)} border`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-green-400" />
                                            <span className="text-sm text-slate-400">Mode B Health</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${getHealthColor(analysis.health_scores.mode_b)}`}>
                                            {analysis.health_scores.mode_b}/100
                                        </div>
                                        <Progress 
                                            value={analysis.health_scores.mode_b} 
                                            className="h-2 mt-2"
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {analysis.health_scores.overall !== undefined && (
                                <Card className={`${getHealthBg(analysis.health_scores.overall)} border`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BarChart3 className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm text-slate-400">Overall Health</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${getHealthColor(analysis.health_scores.overall)}`}>
                                            {analysis.health_scores.overall}/100
                                        </div>
                                        <Progress 
                                            value={analysis.health_scores.overall} 
                                            className="h-2 mt-2"
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Comparative Summary */}
                    {analysis.comparative_summary && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Comparative Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.comparative_summary}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Key Insights */}
                    {analysis.key_insights && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Key Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.key_insights}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Trend Analysis */}
                    {analysis.trend_analysis && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Trend Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.trend_analysis}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Consistency Assessment */}
                    {analysis.consistency_assessment && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Consistency Assessment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.consistency_assessment}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recommendations */}
                    {analysis.recommendations && (
                        <Card className="bg-blue-900/20 border-blue-600/50">
                            <CardHeader>
                                <CardTitle className="text-blue-400 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.recommendations}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Improvement Areas */}
                    {analysis.improvement_areas && (
                        <Card className="bg-yellow-900/20 border-yellow-600/50">
                            <CardHeader>
                                <CardTitle className="text-yellow-400 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Areas for Improvement
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.improvement_areas}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Performance Bottlenecks */}
                    {analysis.performance_bottlenecks && (
                        <Card className="bg-orange-900/20 border-orange-600/50">
                            <CardHeader>
                                <CardTitle className="text-orange-400 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Performance Bottlenecks
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.performance_bottlenecks}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Parameter Tuning Recommendations */}
                    {analysis.parameter_tuning && (
                        <Card className="bg-purple-900/20 border-purple-600/50">
                            <CardHeader>
                                <CardTitle className="text-purple-400 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Parameter Tuning Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysis.parameter_tuning.spg_optimization && (
                                    <div className="bg-slate-800 p-3 rounded-lg border border-green-600/30">
                                        <div className="text-xs text-green-400 font-semibold mb-1">📈 SPG Optimization</div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                            {analysis.parameter_tuning.spg_optimization}
                                        </p>
                                    </div>
                                )}
                                {analysis.parameter_tuning.latency_reduction && (
                                    <div className="bg-slate-800 p-3 rounded-lg border border-blue-600/30">
                                        <div className="text-xs text-blue-400 font-semibold mb-1">⚡ Latency Reduction</div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                            {analysis.parameter_tuning.latency_reduction}
                                        </p>
                                    </div>
                                )}
                                {analysis.parameter_tuning.token_optimization && (
                                    <div className="bg-slate-800 p-3 rounded-lg border border-yellow-600/30">
                                        <div className="text-xs text-yellow-400 font-semibold mb-1">🔢 Token Optimization</div>
                                        <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                            {analysis.parameter_tuning.token_optimization}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Architecture Recommendations */}
                    {analysis.architecture_recommendations && (
                        <Card className="bg-indigo-900/20 border-indigo-600/50">
                            <CardHeader>
                                <CardTitle className="text-indigo-400 flex items-center gap-2">
                                    <Brain className="w-5 h-5" />
                                    Model Architecture Optimization
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.architecture_recommendations}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Priority Actions */}
                    {analysis.priority_actions && (
                        <Card className="bg-green-900/20 border-green-600/50">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Priority Action Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.priority_actions}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Anomalies */}
                    {analysis.anomalies && (
                        <Card className="bg-red-900/20 border-red-600/50">
                            <CardHeader>
                                <CardTitle className="text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Detected Anomalies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-300 whitespace-pre-wrap">
                                    {analysis.anomalies}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error Logs */}
                    {errorLogs.length > 0 && (
                        <Card className="bg-red-900/20 border-red-600">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-red-400 flex items-center gap-2">
                                    <XCircle className="w-5 h-5" />
                                    Error Details ({errorLogs.length})
                                </CardTitle>
                                <Button
                                    onClick={clearLogs}
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-600 text-slate-400 hover:text-red-400"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Clear
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {errorLogs.map((err, idx) => (
                                        <div key={idx} className="bg-slate-900 rounded-lg border border-red-600/50 p-4">
                                            <div className="flex items-start gap-3">
                                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="text-sm font-semibold text-red-300">{err.message}</div>
                                                    {err.fullResponse && (
                                                        <details className="text-xs">
                                                            <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                                                                Full Response
                                                            </summary>
                                                            <pre className="mt-2 bg-slate-800 p-3 rounded overflow-auto max-h-64 text-slate-300">
                                                                {JSON.stringify(err.fullResponse, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                    {err.stack && (
                                                        <details className="text-xs">
                                                            <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                                                                Stack Trace
                                                            </summary>
                                                            <pre className="mt-2 bg-slate-800 p-3 rounded overflow-auto max-h-64 text-red-400 font-mono">
                                                                {err.stack}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Analysis Logs */}
            {analysisLogs.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-green-400">Analysis Execution Logs ({analysisLogs.length})</CardTitle>
                        <Button
                            onClick={clearLogs}
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-400 hover:text-red-400"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <UnifiedLogViewer
                            logs={analysisLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}${l.details ? ' ' + JSON.stringify(l.details) : ''}`)}
                            title=""
                            showStats={true}
                            defaultExpanded={true}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}