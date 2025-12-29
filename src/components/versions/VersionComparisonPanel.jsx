import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, TrendingUp, TrendingDown, Minus, CheckCircle2, FileText, Clock, Zap, Target, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VersionComparisonPanel() {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [versionA, setVersionA] = useState(null);
    const [versionB, setVersionB] = useState(null);

    useEffect(() => { loadVersions(); }, []);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.ConfigVersion.list('-created_date', 50);
            setVersions(data);
            const baseline = data.find(v => v.is_baseline);
            const active = data.find(v => v.is_active);
            if (baseline) setVersionA(baseline.id);
            if (active && active.id !== baseline?.id) setVersionB(active.id);
        } catch (error) {
            toast.error('Échec du chargement des versions');
        } finally {
            setLoading(false);
        }
    };

    const comparisonData = useMemo(() => {
        if (!versionA || !versionB) return null;
        const vA = versions.find(v => v.id === versionA);
        const vB = versions.find(v => v.id === versionB);
        if (!vA || !vB) return null;

        const perfA = vA.performance_summary || {};
        const perfB = vB.performance_summary || {};

        const metrics = [
            { key: 'avg_spg', label: 'SPG Moyen', valueA: perfA.avg_spg || 0, valueB: perfB.avg_spg || 0, format: (v) => v.toFixed(3), higherIsBetter: true },
            { key: 'avg_quality', label: 'Qualité', valueA: perfA.avg_quality || 0, valueB: perfB.avg_quality || 0, format: (v) => v.toFixed(3), higherIsBetter: true },
            { key: 'avg_latency', label: 'Latence', valueA: perfA.avg_latency || 0, valueB: perfB.avg_latency || 0, format: (v) => `${v.toFixed(0)}ms`, higherIsBetter: false },
            { key: 'pass_rate', label: 'Pass Rate', valueA: (perfA.pass_rate || 0) * 100, valueB: (perfB.pass_rate || 0) * 100, format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true }
        ];

        const changelogA = vA.changelog || [];
        const changelogB = vB.changelog || [];
        const uniqueToA = changelogA.filter(c => !changelogB.includes(c));
        const uniqueToB = changelogB.filter(c => !changelogA.includes(c));
        const commonChanges = changelogA.filter(c => changelogB.includes(c));

        const configA = vA.config_snapshot || {};
        const configB = vB.config_snapshot || {};
        const configDiffs = [];
        const allKeys = new Set([...Object.keys(configA), ...Object.keys(configB)]);
        allKeys.forEach(key => {
            const valA = JSON.stringify(configA[key]);
            const valB = JSON.stringify(configB[key]);
            if (valA !== valB) {
                configDiffs.push({ key, valueA: configA[key], valueB: configB[key], status: !configA[key] ? 'added' : !configB[key] ? 'removed' : 'changed' });
            }
        });

        return { versionA: vA, versionB: vB, metrics, changelog: { uniqueToA, uniqueToB, common: commonChanges }, configDiffs, descriptionDiff: vA.description !== vB.description, descriptions: { a: vA.description, b: vB.description } };
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
                <Badge className={isNeutral ? 'bg-slate-600' : isImprovement ? 'bg-green-600' : 'bg-red-600'}>
                    {isNeutral ? <Minus className="w-3 h-3 mr-1" /> : isImprovement ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {isNeutral ? '0%' : `${delta > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`}
                </Badge>
            </div>
        );
    };

    if (loading) return <Card className="bg-slate-800 border-slate-700"><CardContent className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto" /></CardContent></Card>;

    return (
        <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-green-300 flex items-center gap-2"><GitCompare className="w-5 h-5" />Comparaison de Versions</CardTitle>
                        <Button onClick={loadVersions} size="sm" variant="outline" className="border-green-600 text-green-400"><RefreshCw className="w-3 h-3 mr-1" /></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 block mb-1">Version A (Base)</label>
                            <Select value={versionA || ''} onValueChange={setVersionA}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-orange-300"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">{versions.map(v => (<SelectItem key={v.id} value={v.id}>{v.version_tag} {v.is_baseline && '(baseline)'}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <GitCompare className="w-6 h-6 text-slate-500 mt-4" />
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 block mb-1">Version B</label>
                            <Select value={versionB || ''} onValueChange={setVersionB}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">{versions.map(v => (<SelectItem key={v.id} value={v.id}>{v.version_tag} {v.is_active && '(active)'}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {comparisonData && (
                <>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3"><CardTitle className="text-green-300 text-sm flex items-center gap-2"><Target className="w-4 h-4" />Métriques</CardTitle></CardHeader>
                        <CardContent><div className="grid md:grid-cols-2 gap-3">{comparisonData.metrics.map(m => (<MetricDelta key={m.key} metric={m} />))}</div></CardContent>
                    </Card>

                    {comparisonData.descriptionDiff && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3"><CardTitle className="text-green-300 text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Description</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3"><div className="text-xs text-red-400 mb-1">Version A</div><p className="text-sm text-slate-300">{comparisonData.descriptions.a || '(vide)'}</p></div>
                                    <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3"><div className="text-xs text-green-400 mb-1">Version B</div><p className="text-sm text-slate-300">{comparisonData.descriptions.b || '(vide)'}</p></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3"><CardTitle className="text-green-300 text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Changelog</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div><div className="text-xs text-orange-400 font-medium mb-2">Dans A uniquement ({comparisonData.changelog.uniqueToA.length})</div><ScrollArea className="h-32">{comparisonData.changelog.uniqueToA.length === 0 ? <p className="text-xs text-slate-500">Aucun</p> : comparisonData.changelog.uniqueToA.map((c, i) => (<div key={i} className="text-xs text-slate-300 bg-orange-900/20 rounded p-2 mb-1">- {c}</div>))}</ScrollArea></div>
                                <div><div className="text-xs text-slate-400 font-medium mb-2">Communs ({comparisonData.changelog.common.length})</div><ScrollArea className="h-32">{comparisonData.changelog.common.length === 0 ? <p className="text-xs text-slate-500">Aucun</p> : comparisonData.changelog.common.map((c, i) => (<div key={i} className="text-xs text-slate-400 bg-slate-700 rounded p-2 mb-1">• {c}</div>))}</ScrollArea></div>
                                <div><div className="text-xs text-green-400 font-medium mb-2">Dans B uniquement ({comparisonData.changelog.uniqueToB.length})</div><ScrollArea className="h-32">{comparisonData.changelog.uniqueToB.length === 0 ? <p className="text-xs text-slate-500">Aucun</p> : comparisonData.changelog.uniqueToB.map((c, i) => (<div key={i} className="text-xs text-slate-300 bg-green-900/20 rounded p-2 mb-1">+ {c}</div>))}</ScrollArea></div>
                            </div>
                        </CardContent>
                    </Card>

                    {comparisonData.configDiffs.length > 0 && (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3"><CardTitle className="text-green-300 text-sm flex items-center gap-2"><Zap className="w-4 h-4" />Config Diffs ({comparisonData.configDiffs.length})</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {comparisonData.configDiffs.map((diff, i) => (
                                            <div key={i} className={`rounded-lg p-3 border ${diff.status === 'added' ? 'bg-green-900/20 border-green-600/30' : diff.status === 'removed' ? 'bg-red-900/20 border-red-600/30' : 'bg-yellow-900/20 border-yellow-600/30'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-200">{diff.key}</span>
                                                    <Badge className={diff.status === 'added' ? 'bg-green-600' : diff.status === 'removed' ? 'bg-red-600' : 'bg-yellow-600'}>{diff.status === 'added' ? 'Ajouté' : diff.status === 'removed' ? 'Supprimé' : 'Modifié'}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {diff.status !== 'added' && <div className="text-orange-400">A: {JSON.stringify(diff.valueA)}</div>}
                                                    {diff.status !== 'removed' && <div className="text-green-400">B: {JSON.stringify(diff.valueB)}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-gradient-to-r from-slate-800 to-slate-800/80 border-green-600/50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                    <div><div className="text-sm text-green-300 font-medium">Résumé</div><div className="text-xs text-slate-400">{comparisonData.versionA.version_tag} → {comparisonData.versionB.version_tag}</div></div>
                                </div>
                                <div className="flex gap-4 text-center">
                                    <div><div className="text-lg font-bold text-green-400">{comparisonData.configDiffs.length}</div><div className="text-xs text-slate-400">Configs</div></div>
                                    <div><div className="text-lg font-bold text-blue-400">{comparisonData.changelog.uniqueToB.length}</div><div className="text-xs text-slate-400">Nouveaux</div></div>
                                    <div><div className="text-lg font-bold text-orange-400">{comparisonData.metrics.filter(m => m.higherIsBetter ? m.valueB > m.valueA : m.valueB < m.valueA).length}/{comparisonData.metrics.length}</div><div className="text-xs text-slate-400">Améliorés</div></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}