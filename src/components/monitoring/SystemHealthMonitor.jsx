import React, { useState, useEffect, useRef } from 'react';
import { SystemState } from '@/entities/SystemState';
import { ResourceUsage } from '@/entities/ResourceUsage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Activity, Zap, Clock } from 'lucide-react';

export default function SystemHealthMonitor() {
    const [systemStates, setSystemStates] = useState([]);
    const [recentUsage, setRecentUsage] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastLoadTime, setLastLoadTime] = useState(0);
    const pollingIntervalRef = useRef(null);

    // Load with rate limit protection - wrapped in useCallback
    const loadHealth = React.useCallback(async () => {
        const now = Date.now();
        
        // Prevent loading more than once every 10 seconds
        if (now - lastLoadTime < 10000) {
            return;
        }

        setLastLoadTime(now);

        try {
            const [states, usage] = await Promise.all([
                SystemState.list(),
                ResourceUsage.list('-created_date', 5)
            ]);

            setSystemStates(states);
            setRecentUsage(usage);
            setIsLoading(false);
        } catch (error) {
            if (error.response?.status === 429) {
                console.warn('[HealthMonitor] Rate limit, skipping update');
            } else {
                console.error('[HealthMonitor] Health check failed:', error);
            }
            setIsLoading(false);
        }
    }, [lastLoadTime]);

    useEffect(() => {
        loadHealth();
        
        // Poll every 15 seconds (increased from 10s to reduce rate limits)
        pollingIntervalRef.current = setInterval(loadHealth, 15000);
        
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [loadHealth]);

    if (isLoading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 text-center text-slate-400">
                    <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                    Chargement...
                </CardContent>
            </Card>
        );
    }

    const activeStates = systemStates.filter(s => s.is_active);
    const totalTokensUsed = recentUsage.reduce((sum, u) => sum + (u.tokens_used_estimated || 0), 0);
    const avgProcessingTime = recentUsage.length > 0
        ? recentUsage.reduce((sum, u) => sum + (u.processing_time_ms || 0), 0) / recentUsage.length
        : 0;

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    État du Système
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            {activeStates.length > 0 ? (
                                <AlertCircle className="w-4 h-4 text-orange-400" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            <span className="text-xs text-slate-400">États Actifs</span>
                        </div>
                        <div className="text-xl font-bold text-green-300">{activeStates.length}</div>
                    </div>

                    <div className="bg-slate-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-slate-400">Tokens (5 derniers)</span>
                        </div>
                        <div className="text-xl font-bold text-green-300">{totalTokensUsed.toLocaleString()}</div>
                    </div>

                    <div className="bg-slate-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-slate-400">Temps Moy.</span>
                        </div>
                        <div className="text-xl font-bold text-green-300">{(avgProcessingTime / 1000).toFixed(1)}s</div>
                    </div>

                    <div className="bg-slate-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-slate-400">Opérations</span>
                        </div>
                        <div className="text-xl font-bold text-green-300">{recentUsage.length}</div>
                    </div>
                </div>

                {activeStates.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-orange-400">Opérations en cours:</h4>
                        {activeStates.map(state => (
                            <div key={state.id} className="bg-slate-700 p-2 rounded text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-green-300">{state.state_key}</span>
                                    <Badge className="bg-orange-600">{state.progress_percentage}%</Badge>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{state.current_operation}</div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}