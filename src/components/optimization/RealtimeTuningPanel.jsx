import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { 
    Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, 
    CheckCircle2, RefreshCw, Loader2, Settings, ArrowRight, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SENSITIVITY_OPTIONS = [
    { value: 'low', label: 'Faible', description: 'Moins de suggestions, seuils élevés' },
    { value: 'medium', label: 'Moyenne', description: 'Équilibré' },
    { value: 'high', label: 'Haute', description: 'Plus sensible aux changements' }
];

const SEVERITY_COLORS = {
    critical: 'bg-red-600 text-white',
    warning: 'bg-orange-600 text-white',
    info: 'bg-blue-600 text-white'
};

const PRIORITY_COLORS = {
    high: 'text-red-400',
    medium: 'text-orange-400',
    low: 'text-blue-400'
};

export default function RealtimeTuningPanel({ onAdjustmentApplied }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [sensitivity, setSensitivity] = useState('medium');
    const [autoApply, setAutoApply] = useState(false);
    const [adjustmentHistory, setAdjustmentHistory] = useState([]);
    const [pollingActive, setPollingActive] = useState(false);

    useEffect(() => {
        runAnalysis();
    }, []);

    useEffect(() => {
        let interval;
        if (pollingActive) {
            interval = setInterval(() => {
                runAnalysis(autoApply);
            }, 30000); // Poll every 30 seconds
        }
        return () => clearInterval(interval);
    }, [pollingActive, autoApply, sensitivity]);

    const runAnalysis = async (applyAuto = false) => {
        setLoading(true);
        try {
            const { data } = await base44.functions.invoke('realtimeParameterTuner', {
                action: 'analyze',
                apply_suggestions: applyAuto,
                lookback_count: 15,
                sensitivity
            });

            if (data.success) {
                setAnalysis(data);
                
                if (data.applied_adjustments?.length > 0) {
                    setAdjustmentHistory(prev => [
                        ...data.applied_adjustments,
                        ...prev
                    ].slice(0, 20));
                    
                    toast.success(`${data.applied_adjustments.length} ajustement(s) appliqué(s)`);
                    onAdjustmentApplied?.();
                }
            } else {
                toast.error(data.error || 'Erreur d\'analyse');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const applySelectedSuggestions = async () => {
        if (!analysis?.suggestions?.length) return;
        
        setApplying(true);
        try {
            const { data } = await base44.functions.invoke('realtimeParameterTuner', {
                action: 'analyze',
                apply_suggestions: true,
                lookback_count: 15,
                sensitivity
            });

            if (data.success && data.applied_adjustments?.length > 0) {
                setAdjustmentHistory(prev => [
                    ...data.applied_adjustments,
                    ...prev
                ].slice(0, 20));
                
                setAnalysis(data);
                toast.success(`${data.applied_adjustments.length} ajustement(s) appliqué(s)`);
                onAdjustmentApplied?.();
            } else {
                toast.info('Aucun ajustement applicable');
            }
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setApplying(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'optimal': return 'text-green-400';
            case 'adjustments_needed': return 'text-orange-400';
            case 'insufficient_data': return 'text-slate-400';
            default: return 'text-slate-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'optimal': return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'adjustments_needed': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
            default: return <Activity className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Tuning Temps Réel
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {analysis && (
                                <Badge className={getStatusColor(analysis.status)}>
                                    {analysis.status === 'optimal' ? 'Optimal' : 
                                     analysis.status === 'adjustments_needed' ? 'Ajustements suggérés' : 'En attente'}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Sensibilité:</span>
                            <Select value={sensitivity} onValueChange={setSensitivity}>
                                <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {SENSITIVITY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-400">Auto-Apply:</span>
                            <Switch
                                checked={autoApply}
                                onCheckedChange={setAutoApply}
                                className="data-[state=checked]:bg-orange-600"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-400">Monitoring:</span>
                            <Switch
                                checked={pollingActive}
                                onCheckedChange={setPollingActive}
                                className="data-[state=checked]:bg-green-600"
                            />
                            {pollingActive && <Clock className="w-3 h-3 text-green-400 animate-pulse" />}
                        </div>

                        <Button 
                            onClick={() => runAnalysis(false)} 
                            disabled={loading}
                            variant="outline"
                            size="sm"
                            className="border-green-600 text-green-400"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            Analyser
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && analysis.status !== 'insufficient_data' && (
                <>
                    {/* Metrics Comparison */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard 
                            label="SPG" 
                            baseline={analysis.analysis.baseline.spg}
                            current={analysis.analysis.current.spg}
                            delta={analysis.analysis.deltas.spg_percent}
                            higherIsBetter={true}
                        />
                        <MetricCard 
                            label="Latence" 
                            baseline={analysis.analysis.baseline.latency}
                            current={analysis.analysis.current.latency}
                            delta={analysis.analysis.deltas.latency_percent}
                            unit="ms"
                            higherIsBetter={false}
                        />
                        <MetricCard 
                            label="Tokens" 
                            baseline={analysis.analysis.baseline.tokens}
                            current={analysis.analysis.current.tokens}
                            delta={analysis.analysis.deltas.tokens_percent}
                            higherIsBetter={false}
                        />
                        <MetricCard 
                            label="Qualité" 
                            baseline={analysis.analysis.baseline.quality}
                            current={analysis.analysis.current.quality}
                            delta={((analysis.analysis.current.quality - analysis.analysis.baseline.quality) / analysis.analysis.baseline.quality) * 100}
                            higherIsBetter={true}
                        />
                    </div>

                    {/* Trend Chart */}
                    {analysis.trend_data?.length > 0 && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-green-300 text-sm">Tendance des Métriques</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={analysis.trend_data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="index" stroke="#64748b" fontSize={10} />
                                        <YAxis yAxisId="left" stroke="#64748b" fontSize={10} domain={[0, 1]} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                        <Legend />
                                        <ReferenceLine yAxisId="left" y={0.7} stroke="#f59e0b" strokeDasharray="5 5" />
                                        <Line yAxisId="left" type="monotone" dataKey="spg" name="SPG" stroke="#10b981" strokeWidth={2} dot={false} />
                                        <Line yAxisId="left" type="monotone" dataKey="quality" name="Qualité" stroke="#ec4899" strokeWidth={2} dot={false} />
                                        <Line yAxisId="right" type="monotone" dataKey="latency" name="Latence (s)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Anomalies & Suggestions */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Anomalies */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-orange-300 text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Anomalies Détectées ({analysis.anomalies?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-40">
                                    {analysis.anomalies?.length > 0 ? (
                                        <div className="space-y-2">
                                            {analysis.anomalies.map((anomaly, idx) => (
                                                <div key={idx} className="bg-slate-700 rounded p-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-300 capitalize">{anomaly.type.replace('_', ' ')}</span>
                                                        <Badge className={SEVERITY_COLORS[anomaly.severity]}>{anomaly.severity}</Badge>
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        Baseline: {typeof anomaly.baseline === 'number' ? anomaly.baseline.toFixed(2) : anomaly.baseline} → 
                                                        Current: {typeof anomaly.current === 'number' ? anomaly.current.toFixed(2) : anomaly.current}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-500">
                                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                            <p className="text-xs">Aucune anomalie détectée</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Suggestions */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-blue-300 text-sm flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Suggestions ({analysis.suggestions?.length || 0})
                                    </CardTitle>
                                    {analysis.suggestions?.length > 0 && (
                                        <Button 
                                            onClick={applySelectedSuggestions}
                                            disabled={applying}
                                            size="sm"
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            {applying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                                            Appliquer
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-40">
                                    {analysis.suggestions?.length > 0 ? (
                                        <div className="space-y-2">
                                            {analysis.suggestions.map((suggestion, idx) => (
                                                <div key={idx} className="bg-slate-700 rounded p-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-green-300">{suggestion.parameter}</span>
                                                        <ArrowRight className="w-3 h-3 text-slate-500" />
                                                        <Badge variant="outline" className={PRIORITY_COLORS[suggestion.priority]}>
                                                            {suggestion.action} {suggestion.adjustment > 0 ? '+' : ''}{suggestion.adjustment}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400">{suggestion.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-500">
                                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                            <p className="text-xs">Configuration optimale</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Adjustment History */}
            {adjustmentHistory.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-purple-300 text-sm flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Historique des Ajustements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-32">
                            <div className="space-y-2">
                                {adjustmentHistory.map((adj, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-700 rounded p-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{adj.parameter}</Badge>
                                            <span className="text-xs text-slate-400">
                                                {adj.old_value?.toFixed(2)} → {adj.new_value?.toFixed(2)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {format(new Date(adj.timestamp), 'HH:mm:ss')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Insufficient Data Message */}
            {analysis?.status === 'insufficient_data' && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-8 text-center">
                        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">{analysis.message}</p>
                        <p className="text-xs text-slate-500 mt-2">Lancez quelques tests pour activer l'analyse</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function MetricCard({ label, baseline, current, delta, unit = '', higherIsBetter }) {
    const isPositive = higherIsBetter ? delta > 0 : delta < 0;
    const isNeutral = Math.abs(delta) < 2;

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">{label}</span>
                    {!isNeutral && (
                        isPositive 
                            ? <TrendingUp className="w-3 h-3 text-green-400" />
                            : <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                </div>
                <p className="text-lg font-bold text-white">
                    {typeof current === 'number' ? current.toFixed(current < 10 ? 3 : 0) : current}{unit}
                </p>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">Base: {typeof baseline === 'number' ? baseline.toFixed(baseline < 10 ? 3 : 0) : baseline}</span>
                    <span className={`text-xs font-medium ${isNeutral ? 'text-slate-400' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}