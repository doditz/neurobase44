
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    Wrench,
    TrendingUp,
    Database,
    Lock,
    Settings,
    Zap,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function SystemHealthPage() {
    const [user, setUser] = useState(null);
    const [healthReport, setHealthReport] = useState(null);
    const [isLoadingHealth, setIsLoadingHealth] = useState(false);
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairReport, setRepairReport] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [repairLogs, setRepairLogs] = useState([]);
    const [detailedLogs, setDetailedLogs] = useState([]); // NEW: Structured logs
    const [showDetailedLogs, setShowDetailedLogs] = useState(false);
    const [currentChunk, setCurrentChunk] = useState(0); // NEW: Track current chunk
    const [totalChunks, setTotalChunks] = useState(0); // NEW: Estimated total chunks

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            runHealthCheck();
        }
    }, [user]);

    useEffect(() => {
        let interval;
        if (autoRefresh && user) {
            interval = setInterval(() => {
                runHealthCheck();
            }, 30000); // Every 30 seconds
        }
        return () => clearInterval(interval);
    }, [autoRefresh, user]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const runHealthCheck = async () => {
        setIsLoadingHealth(true);
        try {
            toast.info('🔍 Running system health check...');
            
            const { data } = await base44.functions.invoke('systemHealthMonitor', {});
            
            if (data && data.success) {
                setHealthReport(data.health_report);
                
                if (data.health_report.status === 'healthy') {
                    toast.success('✅ System is healthy');
                } else if (data.health_report.status === 'degraded') {
                    toast.warning('⚠️ System degraded - issues detected');
                } else {
                    toast.error('❌ System unhealthy - critical issues');
                }
            } else {
                throw new Error(data?.error || 'Health check failed');
            }
        } catch (error) {
            console.error('Health check error:', error);
            toast.error(`Health check failed: ${error.message}`);
        } finally {
            setIsLoadingHealth(false);
        }
    };

    const runAutoRepair = async (issueType = 'all', issueIds = []) => {
        setIsRepairing(true);
        setRepairReport(null);
        setRepairLogs([]);
        setDetailedLogs([]); // NEW: Clear structured logs
        setShowDetailedLogs(false);
        setCurrentChunk(0); // NEW: Reset current chunk
        setTotalChunks(0); // NEW: Reset total chunks
        
        try {
            toast.info('🔧 Démarrage auto-repair avec feedback détaillé...');
            
            let allDetails = [];
            let allErrors = [];
            let allDetailedLogs = []; // NEW: Array for structured logs
            let totalAttempted = 0;
            let totalSuccessful = 0;
            let totalFailed = 0;
            let skipCount = 0;
            let hasMore = true;
            let iteration = 0;
            const maxIterations = 20; // Limite de sécurité
            
            // Boucle de traitement par chunks
            while (hasMore && iteration < maxIterations) {
                iteration++;
                setCurrentChunk(iteration); // NEW: Update current chunk
                
                toast.info(`🔄 Chunk ${iteration}... (${totalSuccessful} réussies, ${totalFailed} échecs)`, {
                    duration: 2000
                });
                
                try {
                    const { data } = await base44.functions.invoke('autoRepairService', {
                        issue_type: issueType,
                        issue_ids: issueIds,
                        max_repairs_per_call: 20,
                        skip_count: skipCount
                    });
                    
                    if (data && data.success) {
                        const report = data.repair_report;
                        
                        // Accumuler les résultats
                        totalAttempted += report.repairs_attempted;
                        totalSuccessful += report.repairs_successful;
                        totalFailed += report.repairs_failed;
                        allDetails.push(...(report.details || []));
                        allErrors.push(...(report.errors || []));
                        
                        // Accumuler les logs structurés
                        if (data.detailed_logs) {
                            allDetailedLogs.push(...data.detailed_logs);
                            setDetailedLogs(allDetailedLogs);
                        }
                        
                        // Accumuler les logs simples
                        setRepairLogs(prev => [...prev, ...(data.logs || [])]);
                        
                        // Estimer le nombre total de chunks
                        if (report.processing_stats?.benchmarks_inspected) {
                            const totalItemsToProcess = report.processing_stats.benchmarks_inspected;
                            setTotalChunks(Math.ceil(totalItemsToProcess / 20)); // Assuming max_repairs_per_call is 20
                        }
                        
                        // Vérifier s'il reste des réparations
                        hasMore = report.has_more;
                        skipCount = report.next_skip;
                        
                        // Real-time progress update
                        const chunkSuccessRate = report.repairs_attempted > 0
                            ? ((report.repairs_successful / report.repairs_attempted) * 100).toFixed(1)
                            : 0;
                        
                        if (!hasMore) {
                            toast.success(`✅ Chunk ${iteration} terminé - Plus de réparations nécessaires`, {
                                duration: 3000
                            });
                            break;
                        } else {
                            toast.success(`✅ Chunk ${iteration}: ${report.repairs_successful}✓ / ${report.repairs_failed}✗ (${chunkSuccessRate}%)`, {
                                duration: 2000
                            });
                            // Petit délai entre les chunks
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    } else {
                        throw new Error(data?.error || 'Auto-repair returned success=false');
                    }
                } catch (chunkError) {
                    console.error(`Chunk ${iteration} error:`, chunkError);
                    toast.error(`❌ Chunk ${iteration} échoué: ${chunkError.message}`, {
                        duration: 4000
                    });
                    
                    // Continuer avec le prochain chunk si erreur réseau
                    if (chunkError.message.includes('Network Error') && iteration < maxIterations) {
                        toast.warning(`⚠️ Timeout réseau, passage au chunk suivant...`);
                        skipCount += 20; // Passer au chunk suivant
                        hasMore = true;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        // Erreur critique, arrêter
                        hasMore = false;
                        allErrors.push({
                            error: chunkError.message,
                            iteration: iteration
                        });
                    }
                }
            }
            
            if (iteration >= maxIterations) {
                toast.warning(`⚠️ Limite de ${maxIterations} chunks atteinte`);
            }
            
            // Créer le rapport final consolidé
            const finalReport = {
                repairs_attempted: totalAttempted,
                repairs_successful: totalSuccessful,
                repairs_failed: totalFailed,
                details: allDetails,
                errors: allErrors,
                iterations: iteration,
                success_rate: totalAttempted > 0 ? (totalSuccessful / totalAttempted * 100).toFixed(1) : 0
            };
            
            setRepairReport(finalReport);
            
            if (totalSuccessful > 0 && totalFailed === 0) {
                toast.success(`🎉 Auto-repair complet: ${totalSuccessful} réparations en ${iteration} chunk(s)`, {
                    duration: 5000
                });
            } else if (totalSuccessful > 0) {
                toast.warning(`⚠️ Réparations partielles: ${totalSuccessful}✓ / ${totalFailed}✗ en ${iteration} chunk(s)`, {
                    duration: 5000
                });
                setShowDetailedLogs(true);
            } else {
                toast.error(`❌ Échec: ${totalFailed} erreurs en ${iteration} chunk(s)`, {
                    duration: 5000
                });
                setShowDetailedLogs(true);
            }
            
            // Refresh health check après toutes les réparations
            setTimeout(runHealthCheck, 2000);
            
        } catch (error) {
            console.error('Auto-repair error:', error);
            toast.error(`Erreur auto-repair: ${error.message}`);
            setRepairLogs([`[ERROR] ${error.message}`, `[STACK] ${error.stack}`]);
            setShowDetailedLogs(true);
        } finally {
            setIsRepairing(false);
            setCurrentChunk(0);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'healthy':
                return { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-900/20', borderColor: 'border-green-600' };
            case 'degraded':
                return { icon: AlertTriangle, color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', borderColor: 'border-yellow-600' };
            case 'unhealthy':
                return { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-900/20', borderColor: 'border-red-600' };
            default:
                return { icon: Activity, color: 'text-slate-400', bgColor: 'bg-slate-900/20', borderColor: 'border-slate-600' };
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-600';
            case 'high': return 'bg-orange-600';
            case 'medium': return 'bg-yellow-600';
            case 'low': return 'bg-blue-600';
            default: return 'bg-slate-600';
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <Card className="max-w-2xl mx-auto bg-orange-900/20 border-orange-600">
                    <CardHeader>
                        <CardTitle className="text-orange-400 flex items-center gap-2">
                            <Shield className="w-6 h-6" />
                            Admin Access Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">
                            System Health Dashboard is only accessible to administrators.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusConfig = healthReport ? getStatusConfig(healthReport.status) : getStatusConfig('unknown');
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Activity className="w-8 h-8" />
                            System Health Dashboard v2
                        </h1>
                        <p className="text-slate-400 mt-1">Monitoring & Auto-Repair (Full Processing)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="autoRefresh"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label htmlFor="autoRefresh" className="text-sm text-slate-400">
                                Auto-refresh (30s)
                            </label>
                        </div>
                        <Button
                            onClick={runHealthCheck}
                            disabled={isLoadingHealth}
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-900/30"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Overall Status */}
                {healthReport && (
                    <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <StatusIcon className={`w-12 h-12 ${statusConfig.color}`} />
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-50">
                                            System Status: {healthReport.status.toUpperCase()}
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Last check: {new Date(healthReport.timestamp).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                                {healthReport.status !== 'healthy' && (
                                    <Button
                                        onClick={() => runAutoRepair('all')}
                                        disabled={isRepairing}
                                        className="bg-orange-600 hover:bg-orange-700"
                                    >
                                        {isRepairing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Repairing (ALL)...
                                            </>
                                        ) : (
                                            <>
                                                <Wrench className="w-4 h-4 mr-2" />
                                                Auto-Repair ALL
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Repair Progress Indicator */}
                {isRepairing && (
                    <Card className="bg-blue-900/20 border-blue-600">
                        <CardHeader>
                            <CardTitle className="text-blue-400 flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Réparation en cours...
                                {totalChunks > 0 && (
                                    <Badge className="bg-blue-600 ml-2">
                                        Chunk {currentChunk}/{totalChunks}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="bg-slate-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                                    {repairLogs.slice(-10).map((log, idx) => (
                                        <div key={idx} className="text-xs text-slate-300 py-0.5 font-mono">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                                {repairLogs.length > 10 && (
                                    <p className="text-xs text-slate-500 text-center">
                                        Affichage des 10 derniers logs... ({repairLogs.length} total)
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Metrics Grid */}
                {healthReport?.metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Batch Runs */}
                        {healthReport.metrics.batch_runs && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Batch Runs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Total:</span>
                                            <span className="text-slate-300">{healthReport.metrics.batch_runs.total}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Running:</span>
                                            <span className="text-blue-400">{healthReport.metrics.batch_runs.running}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Completed:</span>
                                            <span className="text-green-400">{healthReport.metrics.batch_runs.completed}</span>
                                        </div>
                                        {healthReport.metrics.batch_runs.stuck > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Stuck:</span>
                                                <span className="text-red-400 font-bold">{healthReport.metrics.batch_runs.stuck}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Benchmarks */}
                        {healthReport.metrics.benchmarks && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Benchmarks
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Total:</span>
                                            <span className="text-slate-300">{healthReport.metrics.benchmarks.total}</span>
                                        </div>
                                        {healthReport.metrics.benchmarks.missing_spg > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Missing SPG:</span>
                                                <span className="text-orange-400 font-bold">{healthReport.metrics.benchmarks.missing_spg}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* System Locks */}
                        {healthReport.metrics.system_locks && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Lock className="w-4 h-4" />
                                        System Locks
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Active:</span>
                                            <span className="text-slate-300">{healthReport.metrics.system_locks.total_active}</span>
                                        </div>
                                        {healthReport.metrics.system_locks.stale > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Stale:</span>
                                                <span className="text-red-400 font-bold">{healthReport.metrics.system_locks.stale}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Configuration */}
                        {healthReport.metrics.configuration && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Configuration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Active SPG:</span>
                                            <span className={healthReport.metrics.configuration.active_spg_configs === 1 ? 'text-green-400' : 'text-orange-400'}>
                                                {healthReport.metrics.configuration.active_spg_configs}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Strategies:</span>
                                            <span className="text-slate-300">{healthReport.metrics.configuration.active_strategies}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Issues */}
                {healthReport?.issues && healthReport.issues.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Detected Issues ({healthReport.issues.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {healthReport.issues.map((issue, idx) => (
                                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={getSeverityColor(issue.severity)}>
                                                        {issue.severity}
                                                    </Badge>
                                                    <Badge variant="outline">{issue.category}</Badge>
                                                    {issue.auto_repair_available && (
                                                        <Badge className="bg-green-600">
                                                            <Wrench className="w-3 h-3 mr-1" />
                                                            Auto-repair available
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-300">{issue.message}</p>
                                            </div>
                                            {issue.auto_repair_available && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => runAutoRepair(issue.category, issue.affected_ids)}
                                                    disabled={isRepairing}
                                                    className="bg-orange-600 hover:bg-orange-700"
                                                >
                                                    <Wrench className="w-3 h-3 mr-1" />
                                                    Fix
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Repair Report */}
                {repairReport && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-green-400">Rapport de Réparation</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                                    className="border-slate-600 text-slate-300"
                                >
                                    {showDetailedLogs ? 'Masquer' : 'Voir'} Logs Détaillés
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Tentées</p>
                                    <p className="text-2xl font-bold text-blue-400">{repairReport.repairs_attempted}</p>
                                </div>
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Réussies</p>
                                    <p className="text-2xl font-bold text-green-400">{repairReport.repairs_successful}</p>
                                </div>
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Échecs</p>
                                    <p className="text-2xl font-bold text-red-400">{repairReport.repairs_failed}</p>
                                </div>
                                <div className="bg-slate-700 p-4 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Taux Succès</p>
                                    <p className="text-2xl font-bold text-orange-400">{repairReport.success_rate}%</p>
                                </div>
                            </div>

                            {showDetailedLogs && detailedLogs.length > 0 && (
                                <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                                    <h4 className="text-sm font-semibold text-green-400 mb-3">
                                        Logs Structurés ({detailedLogs.length})
                                    </h4>
                                    {detailedLogs.map((log, idx) => (
                                        <div key={idx} className={`mb-3 pb-3 border-b border-slate-700 ${
                                            log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-900/20 p-2 rounded' :
                                            log.level === 'SUCCESS' ? 'bg-green-900/20 p-2 rounded' :
                                            log.level === 'WARNING' ? 'bg-orange-900/20 p-2 rounded' :
                                            log.level === 'PROGRESS' ? 'bg-blue-900/20 p-2 rounded' : ''
                                        }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {new Date(log.timestamp).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                        fractionalSecondDigits: 3
                                                    })}
                                                </span>
                                                <Badge className={
                                                    log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-red-600' :
                                                    log.level === 'SUCCESS' ? 'bg-green-600' :
                                                    log.level === 'WARNING' ? 'bg-orange-600' :
                                                    log.level === 'PROGRESS' ? 'bg-blue-600' :
                                                    'bg-slate-600'
                                                }>
                                                    {log.level}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-300 mb-1">{log.message}</p>
                                            {log.details && (
                                                <details className="text-xs text-slate-400 mt-2">
                                                    <summary className="cursor-pointer hover:text-slate-300">
                                                        Détails techniques
                                                    </summary>
                                                    <pre className="bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showDetailedLogs && repairLogs.length > 0 && (
                                <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                                    <h4 className="text-sm font-semibold text-green-400 mb-3">
                                        Logs Simples ({repairLogs.length})
                                    </h4>
                                    {repairLogs.map((log, idx) => (
                                        <div key={idx} className="text-xs text-slate-400 py-0.5 font-mono">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Recommendations */}
                {healthReport?.recommendations && healthReport.recommendations.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Recommendations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {healthReport.recommendations.map((rec, idx) => (
                                    <div key={idx} className="bg-slate-900 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-blue-600">{rec.category}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-300 mb-1">{rec.message}</p>
                                        <p className="text-xs text-slate-500">→ {rec.action}</p>
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
