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
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevTestAIAnalysis({ testIds, questionId, analysisType = 'single' }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [metadata, setMetadata] = useState(null);

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysis(null);

        try {
            toast.info('🤖 AI Analysis en cours...');

            const { data } = await base44.functions.invoke('analyzeDevTestResults', {
                test_ids: testIds,
                question_id: questionId,
                analysis_type: analysisType
            });

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            setAnalysis(data.analysis);
            setMetadata(data.metadata);
            toast.success('✨ Analyse terminée!');

        } catch (error) {
            console.error('[AIAnalysis] Error:', error);
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
                </div>
            )}
        </div>
    );
}