import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Brain, 
    TestTube, 
    AlertTriangle, 
    ChevronRight, 
    Loader2,
    MessageSquare,
    X,
    RefreshCw,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function AnalysisContextPanel({ onInjectContext, onClose }) {
    const [isLoading, setIsLoading] = useState(false);
    const [devTestResults, setDevTestResults] = useState([]);
    const [rootCauseAnalyses, setRootCauseAnalyses] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    useEffect(() => {
        loadAnalysisData();
    }, []);

    const loadAnalysisData = async () => {
        setIsLoading(true);
        try {
            // Load recent benchmark/test results
            const [benchmarks, rcaResults] = await Promise.all([
                base44.entities.BenchmarkResult.list('-created_date', 10).catch(() => []),
                base44.entities.RootCauseAnalysis.list('-created_date', 5).catch(() => [])
            ]);

            setDevTestResults(benchmarks);
            setRootCauseAnalyses(rcaResults);
        } catch (error) {
            console.error('Failed to load analysis data:', error);
            toast.error('Failed to load analysis data');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (type, item) => {
        const key = `${type}-${item.id}`;
        setSelectedItems(prev => {
            const exists = prev.find(i => i.key === key);
            if (exists) {
                return prev.filter(i => i.key !== key);
            }
            return [...prev, { key, type, item }];
        });
    };

    const isSelected = (type, id) => {
        return selectedItems.some(i => i.key === `${type}-${id}`);
    };

    const buildContextPrompt = () => {
        if (selectedItems.length === 0) return null;

        let context = "**ANALYSIS CONTEXT (for follow-up questions)**\n\n";

        selectedItems.forEach(({ type, item }) => {
            if (type === 'benchmark') {
                context += `### Test Result: ${item.scenario_name}\n`;
                context += `- Winner: ${item.winner}\n`;
                context += `- SPG: ${item.global_score_performance?.toFixed(3) || 'N/A'}\n`;
                context += `- Mode A Time: ${item.mode_a_time_ms}ms, Tokens: ${item.mode_a_token_count}\n`;
                context += `- Mode B Time: ${item.mode_b_time_ms}ms, Tokens: ${item.mode_b_token_count}\n`;
                context += `- Passed: ${item.passed}\n`;
                if (item.grader_rationale) {
                    context += `- Grader Rationale: ${item.grader_rationale.substring(0, 200)}...\n`;
                }
                context += '\n';
            } else if (type === 'rca') {
                context += `### Root Cause Analysis: ${item.issue_title || 'Untitled'}\n`;
                context += `- Severity: ${item.severity}\n`;
                context += `- Status: ${item.status}\n`;
                context += `- Root Cause: ${item.root_cause?.substring(0, 200) || 'N/A'}...\n`;
                context += `- Recommended Fix: ${item.recommended_fix?.substring(0, 200) || 'N/A'}...\n`;
                context += '\n';
            }
        });

        context += "---\nYou can now ask follow-up questions about these specific results.\n";
        return context;
    };

    const handleInject = () => {
        const context = buildContextPrompt();
        if (context && onInjectContext) {
            onInjectContext(context);
            toast.success(`Injected ${selectedItems.length} analysis item(s) as context`);
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Analysis Context
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={loadAnalysisData}
                        className="h-6 w-6"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-3 h-3 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                            <X className="w-4 h-4 text-slate-400" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                    Select test results or analyses to ask follow-up questions about them.
                </p>

                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                    </div>
                ) : (
                    <ScrollArea className="h-48">
                        <div className="space-y-2">
                            {/* Dev Test Results */}
                            {devTestResults.length > 0 && (
                                <div>
                                    <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1">
                                        <TestTube className="w-3 h-3" />
                                        Recent Test Results
                                    </div>
                                    {devTestResults.map(test => (
                                        <button
                                            key={test.id}
                                            onClick={() => toggleSelection('benchmark', test)}
                                            className={`w-full text-left p-2 rounded-lg border transition-colors text-xs ${
                                                isSelected('benchmark', test.id)
                                                    ? 'bg-green-900/30 border-green-600'
                                                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-300 truncate max-w-[70%]">
                                                    {test.scenario_name}
                                                </span>
                                                <Badge 
                                                    className={test.winner === 'mode_b' ? 'bg-green-600' : 'bg-orange-600'}
                                                >
                                                    {test.winner}
                                                </Badge>
                                            </div>
                                            <div className="text-slate-500 mt-1">
                                                SPG: {test.global_score_performance?.toFixed(3) || 'N/A'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Root Cause Analyses */}
                            {rootCauseAnalyses.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Root Cause Analyses
                                    </div>
                                    {rootCauseAnalyses.map(rca => (
                                        <button
                                            key={rca.id}
                                            onClick={() => toggleSelection('rca', rca)}
                                            className={`w-full text-left p-2 rounded-lg border transition-colors text-xs ${
                                                isSelected('rca', rca.id)
                                                    ? 'bg-orange-900/30 border-orange-600'
                                                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-300 truncate max-w-[70%]">
                                                    {rca.issue_title || 'Untitled Issue'}
                                                </span>
                                                <Badge 
                                                    className={
                                                        rca.severity === 'critical' ? 'bg-red-600' :
                                                        rca.severity === 'high' ? 'bg-orange-600' :
                                                        'bg-yellow-600'
                                                    }
                                                >
                                                    {rca.severity}
                                                </Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {devTestResults.length === 0 && rootCauseAnalyses.length === 0 && (
                                <div className="text-center py-4 text-slate-500 text-xs">
                                    No analysis data available
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}

                {selectedItems.length > 0 && (
                    <Button
                        onClick={handleInject}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                    >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Ask about {selectedItems.length} selected item(s)
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}