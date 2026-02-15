import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
    Activity, 
    Zap, 
    Clock, 
    TrendingUp, 
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    X,
    Target,
    Cpu
} from 'lucide-react';

export default function LiveBenchmarkMonitor({ onClose, onInjectResult }) {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [latestResults, setLatestResults] = useState([]);
    const [liveMetrics, setLiveMetrics] = useState(null);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        if (isMonitoring) {
            const interval = setInterval(pollBenchmarkResults, 5000);
            return () => clearInterval(interval);
        }
    }, [isMonitoring]);

    const pollBenchmarkResults = async () => {
        try {
            const results = await base44.entities.BenchmarkResult.list('-created_date', 5);
            
            if (results.length > 0) {
                const newAlerts = [];
                const latest = results[0];
                
                // Check for performance issues
                if (latest.global_score_performance < 0.5) {
                    newAlerts.push({
                        type: 'warning',
                        message: `Low SPG: ${(latest.global_score_performance * 100).toFixed(1)}%`,
                        metric: 'spg'
                    });
                }
                
                if (latest.mode_b_time_ms > 30000) {
                    newAlerts.push({
                        type: 'warning',
                        message: `High latency: ${(latest.mode_b_time_ms / 1000).toFixed(1)}s`,
                        metric: 'latency'
                    });
                }
                
                if (latest.mode_b_token_count > 5000) {
                    newAlerts.push({
                        type: 'info',
                        message: `High token usage: ${latest.mode_b_token_count}`,
                        metric: 'tokens'
                    });
                }
                
                setAlerts(newAlerts);
                setLatestResults(results);
                
                // Calculate live metrics from recent results
                const avgSpg = results.reduce((sum, r) => sum + (r.global_score_performance || 0), 0) / results.length;
                const avgLatency = results.reduce((sum, r) => sum + (r.mode_b_time_ms || 0), 0) / results.length;
                const avgTokens = results.reduce((sum, r) => sum + (r.mode_b_token_count || 0), 0) / results.length;
                const winRate = results.filter(r => r.winner === 'mode_b').length / results.length;
                
                setLiveMetrics({
                    avgSpg,
                    avgLatency,
                    avgTokens,
                    winRate,
                    totalTests: results.length
                });
            }
        } catch (error) {
            console.error('Failed to poll benchmark results:', error);
        }
    };

    const getSpgColor = (spg) => {
        if (spg >= 0.8) return 'text-green-400';
        if (spg >= 0.6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const handleInjectToChat = (result) => {
        if (onInjectResult) {
            const context = `**LIVE BENCHMARK RESULT**
- Scenario: ${result.scenario_name}
- SPG: ${(result.global_score_performance * 100).toFixed(1)}%
- Winner: ${result.winner}
- Mode B Time: ${result.mode_b_time_ms}ms
- Tokens: ${result.mode_b_token_count}
- Passed: ${result.passed ? 'Yes' : 'No'}

You can ask follow-up questions about this benchmark result.`;
            onInjectResult(context);
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Live Benchmark Monitor
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant={isMonitoring ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setIsMonitoring(!isMonitoring);
                            if (!isMonitoring) pollBenchmarkResults();
                        }}
                        className={`h-6 px-2 text-xs ${isMonitoring ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600'}`}
                    >
                        {isMonitoring ? (
                            <>
                                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                                Monitoring
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Start
                            </>
                        )}
                    </Button>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                            <X className="w-3 h-3 text-slate-400" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="space-y-1">
                        {alerts.map((alert, idx) => (
                            <div 
                                key={idx}
                                className={`flex items-center gap-2 p-2 rounded text-xs ${
                                    alert.type === 'warning' 
                                        ? 'bg-orange-900/30 border border-orange-600/50 text-orange-400'
                                        : 'bg-blue-900/30 border border-blue-600/50 text-blue-400'
                                }`}
                            >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {alert.message}
                            </div>
                        ))}
                    </div>
                )}

                {/* Live Metrics */}
                {liveMetrics && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-900 rounded-lg p-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Avg SPG
                            </div>
                            <div className={`text-lg font-bold ${getSpgColor(liveMetrics.avgSpg)}`}>
                                {(liveMetrics.avgSpg * 100).toFixed(1)}%
                            </div>
                            <Progress 
                                value={liveMetrics.avgSpg * 100} 
                                className="h-1 mt-1"
                            />
                        </div>
                        
                        <div className="bg-slate-900 rounded-lg p-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Avg Latency
                            </div>
                            <div className={`text-lg font-bold ${liveMetrics.avgLatency > 20000 ? 'text-orange-400' : 'text-green-400'}`}>
                                {(liveMetrics.avgLatency / 1000).toFixed(1)}s
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 rounded-lg p-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Avg Tokens
                            </div>
                            <div className="text-lg font-bold text-purple-400">
                                {Math.round(liveMetrics.avgTokens)}
                            </div>
                        </div>
                        
                        <div className="bg-slate-900 rounded-lg p-2">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Win Rate
                            </div>
                            <div className={`text-lg font-bold ${liveMetrics.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                                {(liveMetrics.winRate * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Results */}
                {latestResults.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs text-slate-500 font-semibold">Recent Tests</div>
                        {latestResults.slice(0, 3).map((result, idx) => (
                            <button
                                key={result.id}
                                onClick={() => handleInjectToChat(result)}
                                className="w-full text-left p-2 bg-slate-900 rounded-lg border border-slate-700 hover:border-green-600/50 transition-colors text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 truncate max-w-[60%]">
                                        {result.scenario_name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={getSpgColor(result.global_score_performance)}>
                                            {(result.global_score_performance * 100).toFixed(0)}%
                                        </span>
                                        {result.passed ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                                        ) : (
                                            <XCircle className="w-3 h-3 text-red-400" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {!liveMetrics && !isMonitoring && (
                    <div className="text-center py-4 text-xs text-slate-500">
                        Click "Start" to monitor live benchmark results
                    </div>
                )}
            </CardContent>
        </Card>
    );
}