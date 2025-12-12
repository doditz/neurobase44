import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Activity,
    TrendingUp,
    Clock,
    Zap,
    Database,
    RefreshCw,
    BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

export default function SystemMetricsPage() {
    const [user, setUser] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadMetrics();
        }
    }, [user, timeRange]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadMetrics = async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timeRange.replace('d', ''));
            
            const { data } = await base44.functions.invoke('performanceOptimizer', {
                analysis_window_days: days,
                min_samples: 5
            });

            if (data && data.success) {
                setMetrics(data.optimization_report);
            } else {
                throw new Error(data?.error || 'Failed to load metrics');
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            toast.error('Failed to load metrics');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Activity className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <Card className="max-w-2xl mx-auto bg-orange-900/20 border-orange-600">
                    <CardHeader>
                        <CardTitle className="text-orange-400">Admin Access Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">System Metrics Dashboard is only accessible to administrators.</p>
                    </CardContent>
                </Card>
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
                            <BarChart3 className="w-8 h-8" />
                            System Metrics Dashboard
                        </h1>
                        <p className="text-slate-400 mt-1">Performance Analytics & Trends</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-3 py-2"
                        >
                            <option value="1d">Last 24h</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                        </select>
                        <Button
                            onClick={loadMetrics}
                            disabled={isLoading}
                            variant="outline"
                            className="border-green-600 text-green-400"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Activity className="w-8 h-8 animate-spin text-green-400" />
                    </div>
                ) : metrics ? (
                    <>
                        {/* Health Score */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Overall Health Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-6xl font-bold text-green-400">
                                            {metrics.overall_health_score || 0}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-2">
                                            Status: <Badge className={
                                                metrics.health_status === 'excellent' ? 'bg-green-600' :
                                                metrics.health_status === 'good' ? 'bg-blue-600' :
                                                metrics.health_status === 'fair' ? 'bg-yellow-600' :
                                                'bg-red-600'
                                            }>
                                                {metrics.health_status?.toUpperCase() || 'UNKNOWN'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400 mb-2">Score Breakdown</div>
                                        <div className="space-y-1 text-sm">
                                            <div>Base: 100</div>
                                            {metrics.bottlenecks?.filter(b => b.severity === 'high').length > 0 && (
                                                <div className="text-red-400">
                                                    - {metrics.bottlenecks.filter(b => b.severity === 'high').length * 20} (High severity)
                                                </div>
                                            )}
                                            {metrics.bottlenecks?.filter(b => b.severity === 'medium').length > 0 && (
                                                <div className="text-yellow-400">
                                                    - {metrics.bottlenecks.filter(b => b.severity === 'medium').length * 10} (Medium severity)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Metrics */}
                        {metrics.metrics?.performance && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <div className="text-xs text-slate-400">Avg SPG</div>
                                        </div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {metrics.metrics.performance.avg_spg.toFixed(3)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {metrics.metrics.performance.total_samples} samples
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <div className="text-xs text-slate-400">Avg Time (Mode B)</div>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-400">
                                            {Math.round(metrics.metrics.performance.avg_mode_b_time_ms)}ms
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-yellow-400" />
                                            <div className="text-xs text-slate-400">Token Reduction</div>
                                        </div>
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {metrics.metrics.performance.avg_token_reduction_percent.toFixed(1)}%
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Database className="w-4 h-4 text-purple-400" />
                                            <div className="text-xs text-slate-400">Avg Tokens</div>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-400">
                                            {metrics.metrics.resource_usage?.avg_tokens_per_operation || 0}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Bottlenecks */}
                        {metrics.bottlenecks && metrics.bottlenecks.length > 0 && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-orange-400">Performance Bottlenecks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {metrics.bottlenecks.map((bottleneck, idx) => (
                                            <div key={idx} className="bg-slate-900 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge className={
                                                        bottleneck.severity === 'high' ? 'bg-red-600' :
                                                        bottleneck.severity === 'medium' ? 'bg-yellow-600' :
                                                        'bg-blue-600'
                                                    }>
                                                        {bottleneck.severity}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500">{bottleneck.type}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 mb-2">{bottleneck.message}</p>
                                                <p className="text-xs text-slate-400">→ {bottleneck.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recommendations */}
                        {metrics.recommendations && metrics.recommendations.length > 0 && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-400">Optimization Recommendations</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {metrics.recommendations.map((rec, idx) => (
                                            <div key={idx} className="bg-slate-900 p-3 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-blue-600">{rec.category}</Badge>
                                                    <Badge variant="outline">{rec.priority}</Badge>
                                                </div>
                                                <p className="text-sm text-slate-300 mb-2">{rec.message}</p>
                                                <p className="text-xs text-slate-400">Action: {rec.action}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-12 text-center">
                            <p className="text-slate-400">No metrics available. Run some benchmarks first.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}