import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
    GitCompare, TrendingUp, TrendingDown, Minus, CheckCircle2,
    AlertCircle, FileText, Clock, Zap, Target, RefreshCw, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function VersionComparisonPanel() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [versionA, setVersionA] = useState(null);
    const [versionB, setVersionB] = useState(null);
    const [comparison, setComparison] = useState(null);

    useEffect(() => {
        loadVersions();
    }, []);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.ConfigVersion.list('-created_date', 50);
            setVersions(data);
            
            // Auto-select baseline and active
            const baseline = data.find(v => v.is_baseline);
            const active = data.find(v => v.is_active);
            
            if (baseline) setVersionA(baseline.id);
            if (active && active.id !== baseline?.id) setVersionB(active.id);
        } catch (error) {
            console.error('Failed to load versions:', error);
            toast.error('Échec du chargement des versions');
        } finally {
            setLoading(false);
        }
    };

    // Compute comparison when versions change
    const comparisonData = useMemo(() => {
        if (!versionA || !versionB) return null;

        const vA = versions.find(v => v.id === versionA);
        const vB = versions.find(v => v.id === versionB);

        if (!vA || !vB) return null;

        // Metric comparison
        const perfA = vA.performance_summary || {};
        const perfB = vB.performance_summary || {};

        const metrics = [
            { 
                key: 'avg_spg', 
                label: 'SPG Moyen', 
                valueA: perfA.avg_spg || 0, 
                valueB: perfB.avg_spg || 0,
                format: (v) => v.toFixed(3),
                higherIsBetter: true
            },
            { 
                key: 'avg_quality', 
                label: 'Qualité Moyenne', 
                valueA: perfA.avg_quality || 0, 
                valueB: perfB.avg_quality || 0,
                format: (v) => v.toFixed(3),
                higherIsBetter: true
            },
            { 
                key: 'avg_latency', 
                label: 'Latence Moyenne', 
                valueA: perfA.avg_latency || 0, 
                valueB: perfB.avg_latency || 0,
                format: (v) => `${v.toFixed(0)}ms`,
                higherIsBetter: false
            },
            { 
                key: 'pass_rate', 
                label: 'Pass Rate', 
                valueA: (perfA.pass_rate || 0) * 100, 
                valueB: (perfB.pass_rate || 0) * 100,
                format: (v) => `${v.toFixed(1)}%`,
                higherIsBetter: true
            },
            { 
                key: 'total_runs', 
                label: 'Tests Exécutés', 
                valueA: perfA.total_runs || 0, 
                valueB: perfB.total_runs || 0,
                format: (v) => v.toString(),
                higherIsBetter: true
            }
        ];

        // Changelog comparison
        const changelogA = vA.changelog || [];
        const changelogB = vB.changelog || [];
        
        // Find unique changes
        const uniqueToA = changelogA.filter(c => !changelogB.includes(c));
        const uniqueToB = changelogB.filter(c => !changelogA.includes(c));
        const commonChanges = changelogA.filter(c => changelogB.includes(c));

        // Config snapshot comparison
        const configA = vA.config_snapshot || {};
        const configB = vB.config_snapshot || {};
        
        const configDiffs = [];
        const allKeys = new Set([...Object.keys(configA), ...Object.keys(configB)]);
        
        allKeys.forEach(key => {
            const valA = JSON.stringify(configA[key]);
            const valB = JSON.stringify(configB[key]);
            if (valA !== valB) {
                configDiffs.push({
                    key,
                    valueA: configA[key],
                    valueB: configB[key],
                    status: !configA[key] ? 'added' : !configB[key] ? 'removed' : 'changed'
                });
            }
        });

        // Description comparison
        const descriptionDiff = vA.description !== vB.description;

        return {
            versionA: vA,
            versionB: vB,
            metrics,
            changelog: {
                uniqueToA,
                uniqueToB,
                common: commonChanges
            },
            configDiffs,
            descriptionDiff,
            descriptions: {
                a: vA.description,
                b: vB.description
            }
        };
    }, [versionA, versionB, versions]);

    const MetricDelta = ({ metric }) => {
        const delta = metric.valueB - metric.valueA;
        const deltaPercent = metric.valueA !== 0 ? (delta / metric.valueA) * 100 : 0;
        
        const isImprovement = metric.higherIsBetter ? delta > 0 : delta < 0;
        const isNeutral = Math.abs(delta) < 0.001;

        return (
            <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                <div>
                    <div className="text-sm text-slate-300">{metric.label}</div>
                    <div className="flex items-center gap-4 text-xs mt-1">
                        <span className="text-orange-400">A: {metric.format(metric.valueA)}</span>
                        <span className="text-green-400">B: {metric.format(metric.valueB)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isNeutral ? (
                        <Badge variant="outline" className="text-slate-400">
                            <Minus className="w-3 h-3 mr-1" />
                            0%
                        </Badge>
                    ) : isImprovement ? (
                        <Badge className="bg-green-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +{Math.abs(deltaPercent).toFixed(1)}%
                        </Badge>
                    ) : (
                        <Badge className="bg-red-600">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            -{Math.abs(deltaPercent).toFixed(1)}%
                        </Badge>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Version Selector */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-green-300 flex items-center gap-2">
                            <GitCompare className="w-5 h-5" />
                            Comparaison de Versions
                        </CardTitle>
                        <Button 
                            onClick={loadVersions}
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-400"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Actualiser
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 block mb-1">Version A (Base)</label>
                            <Select value={versionA || ''} onValueChange={setVersionA}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-orange-300">
                                    <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {versions.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.version_tag} {v.is_baseline && '(baseline)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <GitCompare className="w-6 h-6 text-slate-500 mt-4" />
                        
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 block mb-1">Version B (Comparée)</label>
                            <Select value={versionB || ''} onValueChange={setVersionB}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {versions.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.version_tag} {v.is_active && '(active)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comparison Results */}
            {comparisonData && (
                <>
                    {/* Metrics Comparison */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Métriques de Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-3">
                                {comparisonData.metrics.map(metric => (
                                    <MetricDelta key={metric.key} metric={metric} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Description Comparison */}
                    {comparisonData.descriptionDiff && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Changement de Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                                        <div className="text-xs text-red-400 mb-1">Version A</div>
                                        <p className="text-sm text-slate-300">
                                            {comparisonData.descriptions.a || '(pas de description)'}
                                        </p>
                                    </div>
                                    <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                                        <div className="text-xs text-green-400 mb-1">Version B</div>
                                        <p className="text-sm text-slate-300">
                                            {comparisonData.descriptions.b || '(pas de description)'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Changelog Comparison */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Changelog
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Unique to A */}
                                <div className="space-y-2">
                                    <div className="text-xs text-orange-400 font-medium">
                                        Uniquement dans A ({comparisonData.changelog.uniqueToA.length})
                                    </div>
                                    <ScrollArea className="h-32">
                                        {comparisonData.changelog.uniqueToA.length === 0 ? (
                                            <p className="text-xs text-slate-500">Aucun</p>
                                        ) : (
                                            comparisonData.changelog.uniqueToA.map((change, idx) => (
                                                <div key={idx} className="text-xs text-slate-300 bg-orange-900/20 rounded p-2 mb-1">
                                                    - {change}
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                </div>

                                {/* Common */}
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-400 font-medium">
                                        Communs ({comparisonData.changelog.common.length})
                                    </div>
                                    <ScrollArea className="h-32">
                                        {comparisonData.changelog.common.length === 0 ? (
                                            <p className="text-xs text-slate-500">Aucun</p>
                                        ) : (
                                            comparisonData.changelog.common.map((change, idx) => (
                                                <div key={idx} className="text-xs text-slate-400 bg-slate-700 rounded p-2 mb-1">
                                                    • {change}
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                </div>

                                {/* Unique to B */}
                                <div className="space-y-2">
                                    <div className="text-xs text-green-400 font-medium">
                                        Uniquement dans B ({comparisonData.changelog.uniqueToB.length})
                                    </div>
                                    <ScrollArea className="h-32">
                                        {comparisonData.changelog.uniqueToB.length === 0 ? (
                                            <p className="text-xs text-slate-500">Aucun</p>
                                        ) : (
                                            comparisonData.changelog.uniqueToB.map((change, idx) => (
                                                <div key={idx} className="text-xs text-slate-300 bg-green-900/20 rounded p-2 mb-1">
                                                    + {change}
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Config Differences */}
                    {comparisonData.configDiffs.length > 0 && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Différences de Configuration ({comparisonData.configDiffs.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {comparisonData.configDiffs.map((diff, idx) => (
                                            <div 
                                                key={idx}
                                                className={`rounded-lg p-3 border ${
                                                    diff.status === 'added' ? 'bg-green-900/20 border-green-600/30' :
                                                    diff.status === 'removed' ? 'bg-red-900/20 border-red-600/30' :
                                                    'bg-yellow-900/20 border-yellow-600/30'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-200">{diff.key}</span>
                                                    <Badge className={
                                                        diff.status === 'added' ? 'bg-green-600' :
                                                        diff.status === 'removed' ? 'bg-red-600' : 'bg-yellow-600'
                                                    }>
                                                        {diff.status === 'added' ? 'Ajouté' :
                                                         diff.status === 'removed' ? 'Supprimé' : 'Modifié'}
                                                    </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {diff.status !== 'added' && (
                                                        <div className="text-orange-400">
                                                            A: {JSON.stringify(diff.valueA)}
                                                        </div>
                                                    )}
                                                    {diff.status !== 'removed' && (
                                                        <div className="text-green-400">
                                                            B: {JSON.stringify(diff.valueB)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}

                    {/* Summary */}
                    <Card className="bg-gradient-to-r from-slate-800 to-slate-800/80 border-green-600/50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                    <div>
                                        <div className="text-sm text-green-300 font-medium">
                                            Résumé de Comparaison
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {comparisonData.versionA.version_tag} → {comparisonData.versionB.version_tag}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 text-center">
                                    <div>
                                        <div className="text-lg font-bold text-green-400">
                                            {comparisonData.configDiffs.length}
                                        </div>
                                        <div className="text-xs text-slate-400">Configs modifiées</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {comparisonData.changelog.uniqueToB.length}
                                        </div>
                                        <div className="text-xs text-slate-400">Nouveaux changements</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-orange-400">
                                            {comparisonData.metrics.filter(m => 
                                                m.higherIsBetter ? m.valueB > m.valueA : m.valueB < m.valueA
                                            ).length}/{comparisonData.metrics.length}
                                        </div>
                                        <div className="text-xs text-slate-400">Métriques améliorées</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {!comparisonData && versionA && versionB && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-8 text-center text-slate-500">
                        Sélectionnez deux versions différentes pour comparer
                    </CardContent>
                </Card>
            )}
        </div>
    );
}