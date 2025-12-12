import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Zap,
    RefreshCw,
    Loader2
} from 'lucide-react';

export default function PerformanceIndicator({ minimal = false }) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const { data } = await base44.functions.invoke('performanceMonitor', {
                operation: 'get_stats'
            });

            if (data?.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load performance stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!stats && !isLoading) return null;

    if (minimal) {
        return (
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 hover:border-green-500 transition-colors text-xs"
            >
                <Activity className="w-3 h-3 text-green-400" />
                <span className="text-slate-300">
                    Avg: {stats?.avg_processing_time ? (stats.avg_processing_time / 1000).toFixed(1) : '—'}s
                </span>
                {stats?.bottlenecks?.length > 0 && (
                    <Badge className="bg-orange-600 text-white px-1 py-0 text-xs">
                        {stats.bottlenecks.length}
                    </Badge>
                )}
            </button>
        );
    }

    const getHealthStatus = () => {
        if (!stats) return { icon: Activity, color: 'text-slate-400', label: 'Unknown' };
        
        if (stats.bottlenecks.some(b => b.severity === 'high')) {
            return { icon: AlertTriangle, color: 'text-red-400', label: 'Needs Attention' };
        }
        
        if (stats.bottlenecks.length > 0) {
            return { icon: AlertTriangle, color: 'text-orange-400', label: 'Fair' };
        }
        
        return { icon: CheckCircle, color: 'text-green-400', label: 'Good' };
    };

    const health = getHealthStatus();
    const HealthIcon = health.icon;

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <HealthIcon className={`w-4 h-4 ${health.color}`} />
                        <span className="text-green-400">Performance</span>
                        <Badge className={health.color.replace('text-', 'bg-').replace('400', '600')}>
                            {health.label}
                        </Badge>
                    </CardTitle>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={loadStats}
                        disabled={isLoading}
                        className="h-7 w-7 text-slate-400 hover:text-green-400"
                    >
                        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                    </div>
                ) : stats ? (
                    <>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-900 p-2 rounded">
                                <div className="text-slate-500 mb-1">Avg Time</div>
                                <div className="text-green-400 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {(stats.avg_processing_time / 1000).toFixed(1)}s
                                </div>
                            </div>
                            <div className="bg-slate-900 p-2 rounded">
                                <div className="text-slate-500 mb-1">Complexity</div>
                                <div className="text-blue-400 font-semibold">
                                    {(stats.avg_complexity * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="bg-slate-900 p-2 rounded">
                                <div className="text-slate-500 mb-1">D2 Avg</div>
                                <div className="text-orange-400 font-semibold flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {(stats.avg_d2_activation * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>

                        {stats.bottlenecks.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs text-orange-400 font-semibold">Bottlenecks:</div>
                                {stats.bottlenecks.map((bottleneck, idx) => (
                                    <div key={idx} className="text-xs bg-orange-900/20 border border-orange-600/30 rounded p-2">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <div className="text-orange-400 font-medium">
                                                    {bottleneck.type.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-slate-400 mt-0.5">
                                                    {bottleneck.description}
                                                </div>
                                            </div>
                                            <Badge className={
                                                bottleneck.severity === 'high' ? 'bg-red-600' :
                                                bottleneck.severity === 'medium' ? 'bg-orange-600' : 'bg-yellow-600'
                                            }>
                                                {bottleneck.severity}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {stats.recommendations.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs text-blue-400 font-semibold">Recommendations:</div>
                                {stats.recommendations.slice(0, 2).map((rec, idx) => (
                                    <div key={idx} className="text-xs bg-blue-900/20 border border-blue-600/30 rounded p-2">
                                        <div className="text-blue-400 font-medium">{rec.title}</div>
                                        <div className="text-slate-400 text-xs mt-0.5">{rec.description}</div>
                                    </div>
                                ))}
                                {stats.recommendations.length > 2 && (
                                    <div className="text-xs text-slate-500 text-center">
                                        +{stats.recommendations.length - 2} more
                                    </div>
                                )}
                            </div>
                        )}

                        {stats.slow_operations.length > 0 && (
                            <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700">
                                {stats.slow_operations.length} slow operations detected
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-xs text-slate-500 text-center py-4">
                        No data available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}