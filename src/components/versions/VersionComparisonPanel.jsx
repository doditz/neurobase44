import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, TrendingUp, TrendingDown, Minus, CheckCircle2, FileText, Clock, Zap, Target, RefreshCw, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

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

        // Analyse d'impact des configurations
        const configImpactAnalysis = analyzeConfigImpact(configDiffs, metrics, configA, configB);

        return { versionA: vA, versionB: vB, metrics, changelog: { uniqueToA, uniqueToB, common: commonChanges }, configDiffs, configImpactAnalysis, descriptionDiff: vA.description !== vB.description, descriptions: { a: vA.description, b: vB.description } };
    }, [versionA, versionB, versions]);

    // Analyse de l'impact des changements de config sur les métriques
    const analyzeConfigImpact = (configDiffs, metrics, configA, configB) => {
        const impactAnalysis = [];
        
        const parameterImpactMap = {
            'temperature': { affects: ['avg_spg', 'avg_quality'], direction: 'inverse' },
            'maxpersonas': { affects: ['avg_latency', 'avg_quality'], direction: 'direct' },
            'd2modulation': { affects: ['avg_spg', 'avg_quality'], direction: 'direct' },
            'd2_stim': { affects: ['avg_spg', 'pass_rate'], direction: 'direct' },
            'd2_pin': { affects: ['avg_quality'], direction: 'direct' },
            'debaterounds': { affects: ['avg_latency', 'avg_quality'], direction: 'mixed' },
            'consensusthreshold': { affects: ['pass_rate', 'avg_spg'], direction: 'direct' },
            'ethicalconstraints': { affects: ['pass_rate'], direction: 'direct' },
            'hemisphericbias': { affects: ['avg_quality', 'avg_spg'], direction: 'context' },
            'complexity_threshold': { affects: ['avg_latency', 'pass_rate'], direction: 'inverse' },
            'max_tokens': { affects: ['avg_latency'], direction: 'direct' },
            'batch_size': { affects: ['avg_latency'], direction: 'inverse' }
        };

        configDiffs.forEach(diff => {
            const paramKey = diff.key.toLowerCase().replace(/[_-]/g, '');
            const matchedParam = Object.keys(parameterImpactMap).find(p => paramKey.includes(p));
            const impactInfo = matchedParam ? parameterImpactMap[matchedParam] : { affects: ['avg_spg'], direction: 'unknown' };
            
            let valueDelta = null;
            let valueDeltaPercent = null;
            
            if (typeof diff.valueA === 'number' && typeof diff.valueB === 'number') {
                valueDelta = diff.valueB - diff.valueA;
                valueDeltaPercent = diff.valueA !== 0 ? (valueDelta / diff.valueA) * 100 : null;
            }

            const affectedMetrics = impactInfo.affects.map(metricKey => {
                const metric = metrics.find(m => m.key === metricKey);
                if (!metric) return null;
                
                const metricDelta = metric.valueB - metric.valueA;
                const metricDeltaPercent = metric.valueA !== 0 ? (metricDelta / metric.valueA) * 100 : 0;
                
                let correlationScore = 0.5;
                if (valueDeltaPercent !== null && metricDeltaPercent !== 0) {
                    if (impactInfo.direction === 'direct') {
                        correlationScore = (valueDeltaPercent > 0 && metricDeltaPercent > 0) || (valueDeltaPercent < 0 && metricDeltaPercent < 0) ? 0.8 : 0.2;
                    } else if (impactInfo.direction === 'inverse') {
                        correlationScore = (valueDeltaPercent > 0 && metricDeltaPercent < 0) || (valueDeltaPercent < 0 && metricDeltaPercent > 0) ? 0.8 : 0.2;
                    }
                }

                return {
                    metricKey,
                    metricLabel: metric.label,
                    metricDelta,
                    metricDeltaPercent,
                    isImprovement: metric.higherIsBetter ? metricDelta > 0 : metricDelta < 0,
                    correlationScore
                };
            }).filter(Boolean);

            const impactScore = affectedMetrics.reduce((sum, m) => sum + Math.abs(m.metricDeltaPercent || 0) * m.correlationScore, 0) / Math.max(affectedMetrics.length, 1);

            impactAnalysis.push({
                parameter: diff.key,
                valueA: diff.valueA,
                valueB: diff.valueB,
                valueDelta,
                valueDeltaPercent,
                status: diff.status,
                impactDirection: impactInfo.direction,
                affectedMetrics,
                impactScore,
                severity: impactScore > 20 ? 'high' : impactScore > 5 ? 'medium' : 'low'
            });
        });

        return impactAnalysis.sort((a, b) => b.impactScore - a.impactScore);
    };

    const generatePDFReport = () => {
        if (!comparisonData) return;
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        // Title
        doc.setFontSize(20);
        doc.setTextColor(16, 185, 129);
        doc.text('Rapport de Comparaison de Versions', pageWidth / 2, y, { align: 'center' });
        y += 15;

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Généré le: ${format(new Date(), 'PPpp', { locale: fr })}`, 20, y);
        y += 8;
        doc.text(`Version A: ${comparisonData.versionA.version_tag} ${comparisonData.versionA.is_baseline ? '(baseline)' : ''}`, 20, y);
        y += 6;
        doc.text(`Version B: ${comparisonData.versionB.version_tag} ${comparisonData.versionB.is_active ? '(active)' : ''}`, 20, y);
        y += 15;

        // Metrics Section
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('1. Métriques de Performance', 20, y);
        y += 10;

        doc.setFontSize(10);
        comparisonData.metrics.forEach(metric => {
            const delta = metric.valueB - metric.valueA;
            const deltaPercent = metric.valueA !== 0 ? (delta / metric.valueA) * 100 : 0;
            const isImprovement = metric.higherIsBetter ? delta > 0 : delta < 0;
            
            doc.setTextColor(0, 0, 0);
            doc.text(`${metric.label}:`, 25, y);
            doc.text(`A: ${metric.format(metric.valueA)}`, 80, y);
            doc.text(`B: ${metric.format(metric.valueB)}`, 120, y);
            doc.setTextColor(isImprovement ? 34 : 239, isImprovement ? 197 : 68, isImprovement ? 94 : 68);
            doc.text(`${delta > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`, 160, y);
            y += 7;
        });
        y += 10;

        // Summary Stats
        const improvedCount = comparisonData.metrics.filter(m => m.higherIsBetter ? m.valueB > m.valueA : m.valueB < m.valueA).length;
        doc.setTextColor(0, 0, 0);
        doc.text(`Résumé: ${improvedCount}/${comparisonData.metrics.length} métriques améliorées`, 25, y);
        y += 15;

        // Description Changes
        if (comparisonData.descriptionDiff) {
            doc.setFontSize(14);
            doc.text('2. Changement de Description', 20, y);
            y += 10;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            
            const descA = comparisonData.descriptions.a || '(vide)';
            const descB = comparisonData.descriptions.b || '(vide)';
            
            doc.text('Version A:', 25, y);
            y += 5;
            const splitA = doc.splitTextToSize(descA, 160);
            doc.text(splitA, 30, y);
            y += splitA.length * 5 + 5;
            
            doc.text('Version B:', 25, y);
            y += 5;
            const splitB = doc.splitTextToSize(descB, 160);
            doc.text(splitB, 30, y);
            y += splitB.length * 5 + 10;
        }

        // New page if needed
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Changelog Section
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('3. Changelog', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Nouveaux dans B: ${comparisonData.changelog.uniqueToB.length}`, 25, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        comparisonData.changelog.uniqueToB.slice(0, 5).forEach(change => {
            const split = doc.splitTextToSize(`+ ${change}`, 160);
            doc.text(split, 30, y);
            y += split.length * 5;
        });
        if (comparisonData.changelog.uniqueToB.length > 5) {
            doc.text(`... et ${comparisonData.changelog.uniqueToB.length - 5} autres`, 30, y);
            y += 6;
        }
        y += 5;

        doc.setTextColor(239, 68, 68);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Retirés de A: ${comparisonData.changelog.uniqueToA.length}`, 25, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(239, 68, 68);
        comparisonData.changelog.uniqueToA.slice(0, 3).forEach(change => {
            const split = doc.splitTextToSize(`- ${change}`, 160);
            doc.text(split, 30, y);
            y += split.length * 5;
        });
        y += 10;

        // Config Changes
        if (comparisonData.configDiffs.length > 0) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('4. Modifications de Configuration', 20, y);
            y += 10;

            doc.setFontSize(9);
            comparisonData.configDiffs.slice(0, 10).forEach(diff => {
                doc.setTextColor(0, 0, 0);
                doc.text(`${diff.key}:`, 25, y);
                
                if (diff.status === 'added') {
                    doc.setTextColor(34, 197, 94);
                    doc.text('[AJOUTÉ]', 100, y);
                } else if (diff.status === 'removed') {
                    doc.setTextColor(239, 68, 68);
                    doc.text('[SUPPRIMÉ]', 100, y);
                } else {
                    doc.setTextColor(234, 179, 8);
                    doc.text('[MODIFIÉ]', 100, y);
                }
                y += 6;
            });
            
            if (comparisonData.configDiffs.length > 10) {
                doc.setTextColor(100, 100, 100);
                doc.text(`... et ${comparisonData.configDiffs.length - 10} autres modifications`, 25, y);
            }
        }

        // Section 5: Impact Configuration Analysis
        if (comparisonData.configImpactAnalysis && comparisonData.configImpactAnalysis.length > 0) {
            doc.addPage();
            y = 20;
            
            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text('5. Analyse d\'Impact des Configurations', 20, y);
            y += 12;
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Corrélation entre les changements de configuration et les variations de métriques', 20, y);
            y += 12;

            // High impact changes
            const highImpact = comparisonData.configImpactAnalysis.filter(i => i.severity === 'high');
            const mediumImpact = comparisonData.configImpactAnalysis.filter(i => i.severity === 'medium');
            
            if (highImpact.length > 0) {
                doc.setFontSize(12);
                doc.setTextColor(239, 68, 68);
                doc.text('⚠ Changements à Impact Élevé', 20, y);
                y += 8;
                
                doc.setFontSize(9);
                highImpact.forEach(impact => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${impact.parameter}`, 25, y);
                    
                    // Valeur avant/après
                    const valA = typeof impact.valueA === 'object' ? JSON.stringify(impact.valueA) : String(impact.valueA ?? 'N/A');
                    const valB = typeof impact.valueB === 'object' ? JSON.stringify(impact.valueB) : String(impact.valueB ?? 'N/A');
                    doc.setTextColor(100, 100, 100);
                    doc.text(`${valA.substring(0, 15)} → ${valB.substring(0, 15)}`, 80, y);
                    
                    // Score d'impact
                    doc.setTextColor(239, 68, 68);
                    doc.text(`Impact: ${impact.impactScore.toFixed(1)}%`, 150, y);
                    y += 6;
                    
                    // Métriques affectées
                    impact.affectedMetrics.forEach(metric => {
                        doc.setTextColor(metric.isImprovement ? 34 : 239, metric.isImprovement ? 197 : 68, metric.isImprovement ? 94 : 68);
                        doc.text(`  → ${metric.metricLabel}: ${metric.metricDeltaPercent > 0 ? '+' : ''}${metric.metricDeltaPercent.toFixed(1)}%`, 30, y);
                        y += 5;
                    });
                    y += 3;
                });
            }

            if (mediumImpact.length > 0) {
                y += 5;
                doc.setFontSize(12);
                doc.setTextColor(234, 179, 8);
                doc.text('⚡ Changements à Impact Modéré', 20, y);
                y += 8;
                
                doc.setFontSize(9);
                mediumImpact.slice(0, 5).forEach(impact => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    
                    doc.setTextColor(0, 0, 0);
                    doc.text(`${impact.parameter}`, 25, y);
                    
                    doc.setTextColor(234, 179, 8);
                    doc.text(`Impact: ${impact.impactScore.toFixed(1)}%`, 150, y);
                    y += 6;
                    
                    impact.affectedMetrics.slice(0, 2).forEach(metric => {
                        doc.setTextColor(metric.isImprovement ? 34 : 239, metric.isImprovement ? 197 : 68, metric.isImprovement ? 94 : 68);
                        doc.text(`  → ${metric.metricLabel}: ${metric.metricDeltaPercent > 0 ? '+' : ''}${metric.metricDeltaPercent.toFixed(1)}%`, 30, y);
                        y += 5;
                    });
                    y += 2;
                });
            }

            // Summary box
            y += 10;
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(20, y, 170, 25, 3, 3, 'F');
            y += 8;
            doc.setFontSize(10);
            doc.setTextColor(16, 185, 129);
            doc.text('Résumé d\'Impact', 25, y);
            y += 7;
            doc.setFontSize(9);
            doc.setTextColor(200, 200, 200);
            doc.text(`${highImpact.length} changements critiques | ${mediumImpact.length} modérés | ${comparisonData.configImpactAnalysis.length - highImpact.length - mediumImpact.length} faibles`, 25, y);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Rapport généré par Neuronas AI - Système d\'Optimisation', pageWidth / 2, 285, { align: 'center' });

        // Save
        doc.save(`version_comparison_${comparisonData.versionA.version_tag}_vs_${comparisonData.versionB.version_tag}.pdf`);
        toast.success('Rapport PDF généré');
    };

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
                        <div className="flex gap-2">
                            {comparisonData && (
                                <Button onClick={generatePDFReport} size="sm" variant="outline" className="border-blue-600 text-blue-400">
                                    <Download className="w-3 h-3 mr-1" />PDF
                                </Button>
                            )}
                            <Button onClick={loadVersions} size="sm" variant="outline" className="border-green-600 text-green-400"><RefreshCw className="w-3 h-3 mr-1" /></Button>
                        </div>
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

                    {/* Config Impact Analysis */}
                    {comparisonData.configImpactAnalysis && comparisonData.configImpactAnalysis.length > 0 && (
                        <Card className="bg-slate-800 border-orange-600/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-orange-400 text-sm flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Analyse d'Impact Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-3">
                                        {comparisonData.configImpactAnalysis.slice(0, 10).map((impact, i) => (
                                            <div key={i} className={`rounded-lg p-3 border ${
                                                impact.severity === 'high' ? 'bg-red-900/20 border-red-600/50' :
                                                impact.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-600/50' :
                                                'bg-slate-700 border-slate-600'
                                            }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-slate-200">{impact.parameter}</span>
                                                    <Badge className={
                                                        impact.severity === 'high' ? 'bg-red-600' :
                                                        impact.severity === 'medium' ? 'bg-yellow-600' : 'bg-slate-600'
                                                    }>
                                                        Impact: {impact.impactScore.toFixed(1)}%
                                                    </Badge>
                                                </div>
                                                
                                                {impact.valueDeltaPercent !== null && (
                                                    <div className="text-xs text-slate-400 mb-2">
                                                        {typeof impact.valueA === 'number' ? impact.valueA.toFixed(2) : String(impact.valueA).substring(0, 15)} 
                                                        <span className="mx-2">→</span>
                                                        {typeof impact.valueB === 'number' ? impact.valueB.toFixed(2) : String(impact.valueB).substring(0, 15)}
                                                        <span className={`ml-2 ${impact.valueDeltaPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            ({impact.valueDeltaPercent > 0 ? '+' : ''}{impact.valueDeltaPercent.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex flex-wrap gap-2">
                                                    {impact.affectedMetrics.map((metric, j) => (
                                                        <div key={j} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                                                            metric.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                                        }`}>
                                                            {metric.isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                            {metric.metricLabel}: {metric.metricDeltaPercent > 0 ? '+' : ''}{metric.metricDeltaPercent.toFixed(1)}%
                                                        </div>
                                                    ))}
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