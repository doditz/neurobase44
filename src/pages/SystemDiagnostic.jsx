import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    Database,
    FileCode,
    GitBranch,
    Shield,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function SystemDiagnosticPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [report, setReport] = useState(null);

    const runDiagnostic = async () => {
        setIsRunning(true);
        setReport(null);

        try {
            toast.info('🔍 Running system diagnostic...');

            const { data } = await base44.functions.invoke('diagnosticReport', {});

            if (!data.success) {
                throw new Error(data.error || 'Diagnostic failed');
            }

            setReport(data.report);
            
            const status = data.report.health_metrics.status;
            if (status === 'HEALTHY') {
                toast.success('✅ System is healthy!');
            } else if (status === 'WARNING' || status === 'DEGRADED') {
                toast.warning(`⚠️ System status: ${status}`);
            } else {
                toast.error(`🔴 System status: ${status}`);
            }

        } catch (error) {
            console.error('[Diagnostic] Error:', error);
            toast.error(`Diagnostic failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'HEALTHY': return 'text-green-400';
            case 'WARNING': return 'text-yellow-400';
            case 'DEGRADED': return 'text-orange-400';
            case 'CRITICAL': return 'text-red-400';
            default: return 'text-slate-400';
        }
    };

    const getStatusBg = (status) => {
        switch(status) {
            case 'HEALTHY': return 'bg-green-900/20 border-green-600/30';
            case 'WARNING': return 'bg-yellow-900/20 border-yellow-600/30';
            case 'DEGRADED': return 'bg-orange-900/20 border-orange-600/30';
            case 'CRITICAL': return 'bg-red-900/20 border-red-600/30';
            default: return 'bg-slate-800 border-slate-700';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Activity className="w-8 h-8" />
                            System Diagnostic
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Comprehensive health check and issue detection
                        </p>
                    </div>
                    <Button
                        onClick={runDiagnostic}
                        disabled={isRunning}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 mr-2" />
                                Run Diagnostic
                            </>
                        )}
                    </Button>
                </div>

                {report && (
                    <div className="space-y-6">
                        {/* Overall Health */}
                        <Card className={`border-2 ${getStatusBg(report.health_metrics.status)}`}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className={`w-8 h-8 ${getStatusColor(report.health_metrics.status)}`} />
                                        <div>
                                            <h2 className="text-2xl font-bold text-green-400">
                                                System Status: {report.health_metrics.status}
                                            </h2>
                                            <p className="text-slate-400">
                                                Health Score: {report.health_metrics.overall_score}/100
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400">Issues</div>
                                        <div className={`text-3xl font-bold ${report.health_metrics.total_issues > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {report.health_metrics.total_issues}
                                        </div>
                                    </div>
                                </div>
                                <Progress value={report.health_metrics.overall_score} className="h-3" />
                            </CardContent>
                        </Card>

                        {/* Issues */}
                        {report.issues.length > 0 && (
                            <Card className="bg-red-900/20 border-red-600">
                                <CardHeader>
                                    <CardTitle className="text-red-400 flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        Critical Issues ({report.issues.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {report.issues.map((issue, idx) => (
                                            <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-red-600/30">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-red-300">
                                                            {issue.type.replace(/_/g, ' ').toUpperCase()}
                                                        </div>
                                                        <p className="text-sm text-slate-300 mt-1">
                                                            {issue.message || issue.error || JSON.stringify(issue)}
                                                        </p>
                                                        {issue.details && (
                                                            <pre className="text-xs text-slate-400 mt-2 bg-slate-900 p-2 rounded overflow-x-auto">
                                                                {JSON.stringify(issue.details, null, 2)}
                                                            </pre>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Warnings */}
                        {report.warnings.length > 0 && (
                            <Card className="bg-yellow-900/20 border-yellow-600">
                                <CardHeader>
                                    <CardTitle className="text-yellow-400 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Warnings ({report.warnings.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {report.warnings.map((warning, idx) => (
                                            <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-yellow-600/30">
                                                <div className="font-semibold text-yellow-300">
                                                    {warning.type.replace(/_/g, ' ').toUpperCase()}
                                                </div>
                                                <p className="text-sm text-slate-300 mt-1">
                                                    {warning.message || JSON.stringify(warning)}
                                                </p>
                                                {warning.ids && (
                                                    <details className="text-xs text-slate-400 mt-2">
                                                        <summary className="cursor-pointer hover:text-slate-300">
                                                            Show affected IDs ({warning.ids.length})
                                                        </summary>
                                                        <div className="mt-2 space-y-1">
                                                            {warning.ids.map((id, i) => (
                                                                <div key={i} className="font-mono">{id}</div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Entity Audit */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center gap-2">
                                    <Database className="w-5 h-5" />
                                    Entity Audit
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(report.entity_audits).map(([name, audit]) => (
                                        <div key={name} className={`p-3 rounded-lg border ${
                                            audit.status === 'OK' 
                                                ? 'bg-green-900/20 border-green-600/30'
                                                : 'bg-red-900/20 border-red-600/30'
                                        }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-green-300 text-sm">
                                                    {name}
                                                </span>
                                                {audit.status === 'OK' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                )}
                                            </div>
                                            {audit.status === 'OK' ? (
                                                <div className="text-xs text-slate-400">
                                                    {audit.record_count} records
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-400">
                                                    {audit.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Data Integrity */}
                        {report.data_integrity.test_results && (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-green-400 flex items-center gap-2">
                                        <FileCode className="w-5 h-5" />
                                        Data Integrity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-700 p-3 rounded-lg">
                                            <div className="text-xs text-slate-400 mb-1">Total Results</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                {report.data_integrity.test_results.total}
                                            </div>
                                        </div>
                                        <div className="bg-slate-700 p-3 rounded-lg">
                                            <div className="text-xs text-slate-400 mb-1">Complete</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                {report.data_integrity.test_results.complete}
                                            </div>
                                        </div>
                                        <div className="bg-slate-700 p-3 rounded-lg">
                                            <div className="text-xs text-slate-400 mb-1">Incomplete</div>
                                            <div className="text-2xl font-bold text-orange-400">
                                                {report.data_integrity.test_results.incomplete}
                                            </div>
                                        </div>
                                        <div className="bg-slate-700 p-3 rounded-lg">
                                            <div className="text-xs text-slate-400 mb-1">Completion Rate</div>
                                            <div className="text-2xl font-bold text-blue-400">
                                                {report.data_integrity.test_results.completion_rate}%
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recommendations */}
                        {report.issues.length === 0 && report.warnings.length === 0 && (
                            <Card className="bg-green-900/20 border-green-600">
                                <CardContent className="p-6 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-green-400 mb-2">
                                        All Systems Operational
                                    </h3>
                                    <p className="text-slate-400">
                                        No issues or warnings detected
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {!report && !isRunning && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-12 text-center">
                            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-400 mb-2">
                                Ready to Run Diagnostic
                            </h3>
                            <p className="text-slate-500 mb-6">
                                Click the button above to perform a comprehensive system health check
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}