
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Search,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    Zap,
    Activity,
    FileText,
    ChevronDown,
    ChevronRight,
    Play,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function RootCauseAnalysisPage() {
    const [user, setUser] = useState(null);
    const [rcaList, setRcaList] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [ensembleResults, setEnsembleResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRunningDetection, setIsRunningDetection] = useState(false);
    const [isRunningPrediction, setIsRunningPrediction] = useState(false);
    const [isRunningEnsemble, setIsRunningEnsemble] = useState(false);
    const [expandedRca, setExpandedRca] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user && user.role === 'admin') {
            loadData();
        }
    }, [user]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load RCA records
            const rcas = await base44.entities.RootCauseAnalysis.list('-detected_at', 20);
            setRcaList(rcas);

            // Load anomalies
            try {
                const anomalyData = await base44.entities.AnomalyDetection.list('-detected_at', 50);
                setAnomalies(anomalyData);
            } catch (error) {
                console.log('Anomaly entity not available yet');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const runAnomalyDetection = async () => {
        setIsRunningDetection(true);
        try {
            toast.info('🔍 Running anomaly detection...');
            
            const { data } = await base44.functions.invoke('anomalyDetector', {
                metrics_to_check: ['all'],
                lookback_days: 7,
                sensitivity: 'medium',
                create_baseline: true
            });

            if (data && data.success) {
                toast.success(`✅ Found ${data.anomalies_detected} anomaly(ies)`);
                await loadData();
            } else {
                throw new Error(data?.error || 'Detection failed');
            }
        } catch (error) {
            console.error('Anomaly detection error:', error);
            toast.error(`Detection failed: ${error.message}`);
        } finally {
            setIsRunningDetection(false);
        }
    };

    const runPrediction = async () => {
        setIsRunningPrediction(true);
        try {
            toast.info('🔮 Running predictive analysis...');
            
            const { data } = await base44.functions.invoke('performancePredictor', {
                prediction_horizon_hours: 24,
                confidence_threshold: 0.7,
                use_ensemble: true
            });

            if (data && data.success) {
                setPredictions(data.predictions || []);
                toast.success(`✅ Generated ${data.predictions_count} prediction(s)`);
                
                if (data.high_severity_count > 0) {
                    toast.warning(`⚠️ ${data.high_severity_count} high-severity prediction(s) detected!`);
                }
            } else {
                throw new Error(data?.error || 'Prediction failed');
            }
        } catch (error) {
            console.error('Prediction error:', error);
            toast.error(`Prediction failed: ${error.message}`);
        } finally {
            setIsRunningPrediction(false);
        }
    };

    const runEnsemblePrediction = async () => {
        setIsRunningEnsemble(true);
        try {
            toast.info('🔮 Running ensemble prediction engine...');
            
            const { data } = await base44.functions.invoke('ensemblePredictionEngine', {
                metric_name: 'spg',
                lookback_window: 100,
                prediction_horizon: 1,
                ensemble_methods: ['statistical', 'exponential_smoothing', 'pattern_matching', 'autoregressive']
            });

            if (data && data.success) {
                setEnsembleResults(data);
                toast.success(`✅ Ensemble prediction complete (${data.ensemble_results.individual_predictions.length} methods used)`);
            } else {
                throw new Error(data?.error || 'Ensemble prediction failed');
            }
        } catch (error) {
            console.error('Ensemble prediction error:', error);
            toast.error(`Ensemble prediction failed: ${error.message}`);
        } finally {
            setIsRunningEnsemble(false);
        }
    };

    const runRCA = async (incidentId, incidentType, severity) => {
        try {
            toast.info('🔬 Running root cause analysis...');
            
            const { data } = await base44.functions.invoke('rootCauseAnalyzer', {
                incident_id: incidentId,
                incident_type: incidentType,
                severity: severity || 'medium',
                lookback_hours: 24,
                auto_remediate: false
            });

            if (data && data.success) {
                toast.success('✅ RCA completed');
                await loadData();
            } else {
                throw new Error(data?.error || 'RCA failed');
            }
        } catch (error) {
            console.error('RCA error:', error);
            toast.error(`RCA failed: ${error.message}`);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Activity className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    if (user.role !== 'admin') {
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
                        <p className="text-slate-300">Root Cause Analysis Dashboard is only accessible to administrators.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-600';
            case 'high': return 'bg-orange-600';
            case 'medium': return 'bg-yellow-600';
            case 'low': return 'bg-blue-600';
            case 'info': return 'bg-slate-600';
            default: return 'bg-slate-600';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Search className="w-8 h-8" />
                            AI Root Cause Analysis & ML Prediction
                        </h1>
                        <p className="text-slate-400 mt-1">Intelligent incident analysis, anomaly detection & ensemble forecasting</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={loadData}
                            disabled={isLoading}
                            variant="outline"
                            className="border-green-600 text-green-400"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button
                        onClick={runAnomalyDetection}
                        disabled={isRunningDetection}
                        className="bg-purple-600 hover:bg-purple-700 h-auto py-4"
                    >
                        {isRunningDetection ? (
                            <Activity className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 mr-2" />
                        )}
                        <div className="text-left">
                            <div className="font-semibold">Anomaly Detection</div>
                            <div className="text-xs opacity-80">ML-powered analysis</div>
                        </div>
                    </Button>

                    <Button
                        onClick={runPrediction}
                        disabled={isRunningPrediction}
                        className="bg-blue-600 hover:bg-blue-700 h-auto py-4"
                    >
                        {isRunningPrediction ? (
                            <Activity className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <TrendingUp className="w-5 h-5 mr-2" />
                        )}
                        <div className="text-left">
                            <div className="font-semibold">Run Prediction</div>
                            <div className="text-xs opacity-80">Forecast future issues</div>
                        </div>
                    </Button>

                    <Button
                        onClick={runEnsemblePrediction}
                        disabled={isRunningEnsemble}
                        className="bg-indigo-600 hover:bg-indigo-700 h-auto py-4"
                    >
                        {isRunningEnsemble ? (
                            <Activity className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Zap className="w-5 h-5 mr-2" />
                        )}
                        <div className="text-left">
                            <div className="font-semibold">Ensemble ML</div>
                            <div className="text-xs opacity-80">Multi-model forecast</div>
                        </div>
                    </Button>

                    <Button
                        onClick={() => runRCA(`incident-${Date.now()}`, 'system_health_degraded', 'medium')}
                        className="bg-orange-600 hover:bg-orange-700 h-auto py-4"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        <div className="text-left">
                            <div className="font-semibold">Analyze Now</div>
                            <div className="text-xs opacity-80">Immediate RCA</div>
                        </div>
                    </Button>
                </div>

                {/* Ensemble Results */}
                {ensembleResults && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-indigo-400 flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Ensemble Prediction Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Ensemble Summary */}
                                <div className="bg-slate-900 p-4 rounded-lg border border-indigo-600">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-xs text-slate-400">Predicted Value</div>
                                            <div className="text-2xl font-bold text-indigo-400">
                                                {ensembleResults.ensemble_results.ensemble_prediction.value.toFixed(4)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Confidence</div>
                                            <div className="text-2xl font-bold text-green-400">
                                                {(ensembleResults.ensemble_results.ensemble_prediction.confidence * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Risk Level</div>
                                            <Badge className={getSeverityColor(
                                                ensembleResults.risk_assessment.risk_level === 'high' ? 'high' :
                                                ensembleResults.risk_assessment.risk_level === 'medium' ? 'medium' : 'low'
                                            )}>
                                                {ensembleResults.risk_assessment.risk_level.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400">Change</div>
                                            <div className={`text-2xl font-bold ${
                                                ensembleResults.risk_assessment.percentage_change > 0 ? 'text-red-400' : 'text-green-400'
                                            }`}>
                                                {ensembleResults.risk_assessment.percentage_change > 0 ? '+' : ''}
                                                {ensembleResults.risk_assessment.percentage_change.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Model Predictions */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Individual Model Predictions:</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ensembleResults.ensemble_results.individual_predictions.map((pred, idx) => (
                                            <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-700">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="text-xs">{pred.method}</Badge>
                                                    <span className="text-xs text-slate-400">
                                                        Weight: {(ensembleResults.ensemble_results.method_weights[pred.method] * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="text-lg font-semibold text-slate-300">
                                                    {pred.prediction.toFixed(4)}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Confidence: {(pred.confidence * 100).toFixed(0)}% • {pred.details}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {ensembleResults.recommendation && ensembleResults.recommendation.length > 0 && (
                                    <div className="bg-blue-900/20 border border-blue-600 p-3 rounded">
                                        <h4 className="text-sm font-semibold text-blue-400 mb-2">Recommendations:</h4>
                                        <ul className="text-sm text-slate-300 space-y-1">
                                            {ensembleResults.recommendation.map((rec, i) => (
                                                <li key={i}>• {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Predictions */}
                {predictions.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-blue-400 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Predictive Alerts ({predictions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {predictions.map((pred, idx) => (
                                    <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={getSeverityColor(pred.severity)}>
                                                        {pred.severity}
                                                    </Badge>
                                                    <Badge variant="outline">{pred.metric}</Badge>
                                                    <Badge className="bg-blue-600">{pred.prediction_type}</Badge>
                                                    {pred.confidence && (
                                                        <span className="text-xs text-slate-400">
                                                            Confidence: {(pred.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    )}
                                                    {pred.ensemble_methods_used && (
                                                        <Badge className="bg-indigo-600">Ensemble</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-300 mb-2">{pred.message}</p>
                                                {pred.estimated_time_to_breach && (
                                                    <p className="text-xs text-orange-400">
                                                        ⏰ Estimated: {Math.round(pred.estimated_time_to_breach)}h
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {pred.recommended_actions && (
                                            <div className="mt-3 p-2 bg-slate-800 rounded">
                                                <div className="text-xs font-semibold text-green-400 mb-1">Recommended Actions:</div>
                                                <ul className="text-xs text-slate-400 space-y-1">
                                                    {pred.recommended_actions.map((action, i) => (
                                                        <li key={i}>• {action}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Anomalies */}
                {anomalies.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-purple-400 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Detected Anomalies ({anomalies.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {anomalies.slice(0, 10).map((anomaly, idx) => (
                                    <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={getSeverityColor(anomaly.severity)}>
                                                    {anomaly.severity}
                                                </Badge>
                                                <Badge variant="outline">{anomaly.metric_name}</Badge>
                                                <Badge className="bg-purple-600">{anomaly.anomaly_type}</Badge>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(anomaly.detected_at).toLocaleString('fr-FR')}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-300">
                                                Value: {anomaly.current_value.toFixed(2)} (Expected: {anomaly.expected_value?.toFixed(2) || 'N/A'})
                                                {anomaly.z_score && (
                                                    <span className="ml-2 text-xs text-slate-500">
                                                        z-score: {anomaly.z_score.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => runRCA(anomaly.id, 'anomaly_detected', anomaly.severity)}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            <Play className="w-3 h-3 mr-1" />
                                            Analyze
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* RCA List */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Root Cause Analyses ({rcaList.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Loading...
                            </div>
                        ) : rcaList.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                No RCA records found. Run anomaly detection or analysis to create one.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rcaList.map((rca) => (
                                    <div key={rca.id} className="border border-slate-700 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedRca(expandedRca === rca.id ? null : rca.id)}
                                            className="w-full px-4 py-3 flex items-center justify-between bg-slate-900 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 text-left">
                                                {expandedRca === rca.id ? (
                                                    <ChevronDown className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge className={getSeverityColor(rca.severity)}>
                                                            {rca.severity}
                                                        </Badge>
                                                        <Badge variant="outline">{rca.incident_type}</Badge>
                                                        <Badge className={rca.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}>
                                                            {rca.status}
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(rca.detected_at).toLocaleString('fr-FR')}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-300 truncate">
                                                        {rca.root_cause_summary || 'Analysis in progress...'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Confidence: {(rca.confidence_score * 100).toFixed(0)}% | Category: {rca.root_cause_category}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {expandedRca === rca.id && (
                                            <div className="p-4 bg-slate-900 border-t border-slate-700">
                                                {/* Evidence Chain */}
                                                {rca.evidence_chain && rca.evidence_chain.length > 0 && (
                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-semibold text-green-400 mb-2">Evidence Chain:</h4>
                                                        <div className="space-y-2">
                                                            {rca.evidence_chain.map((evidence, i) => (
                                                                <div key={i} className="text-xs bg-slate-800 p-2 rounded">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge variant="outline" className="text-xs">{evidence.event_type}</Badge>
                                                                        <span className="text-slate-500">{new Date(evidence.timestamp).toLocaleString('fr-FR')}</span>
                                                                    </div>
                                                                    <p className="text-slate-300">{evidence.description}</p>
                                                                    <p className="text-slate-500 mt-1">Relevance: {(evidence.relevance_score * 100).toFixed(0)}%</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Remediation Steps */}
                                                {rca.remediation_steps && rca.remediation_steps.length > 0 && (
                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-semibold text-orange-400 mb-2">Remediation Steps:</h4>
                                                        <div className="space-y-2">
                                                            {rca.remediation_steps.map((step, i) => (
                                                                <div key={i} className="text-xs bg-slate-800 p-2 rounded flex items-start gap-2">
                                                                    <span className="font-semibold text-orange-400">{step.step_number}.</span>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge className={getSeverityColor(step.priority)}>{step.priority}</Badge>
                                                                            {step.requires_manual_intervention && (
                                                                                <Badge variant="outline">Manual</Badge>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-slate-300">{step.action}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Full Report */}
                                                {rca.full_analysis_report && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-green-400 mb-2">Full Analysis Report:</h4>
                                                        <pre className="text-xs bg-slate-800 p-3 rounded overflow-auto max-h-96 text-slate-300 whitespace-pre-wrap">
                                                            {rca.full_analysis_report}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
