import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    GitCompare, TrendingUp, TrendingDown, Minus, 
    Loader2, AlertCircle, CheckCircle2, Zap
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    Legend, ResponsiveContainer, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { toast } from 'sonner';

export default function ModelComparisonView() {
    const [models, setModels] = useState([]);
    const [modelA, setModelA] = useState(null);
    const [modelB, setModelB] = useState(null);
    const [recordsA, setRecordsA] = useState([]);
    const [recordsB, setRecordsB] = useState([]);
    const [loading, setLoading] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = async () => {
        try {
            const modelList = await base44.entities.AIModel.filter({ is_active: true });
            setModels(modelList);
            
            // Si pas de modèles, créer les modèles par défaut
            if (modelList.length === 0) {
                await createDefaultModels();
            }
        } catch (error) {
            console.error('Error loading models:', error);
        }
    };

    const createDefaultModels = async () => {
        const defaults = [
            { model_name: 'NEURONAS v13.1', model_type: 'neuronas', model_version: 'v13.1', color: '#10b981', description: 'Architecture tri-hémisphérique complète' },
            { model_name: 'Baseline LLM (Mode A)', model_type: 'baseline_llm', model_version: '1.0', color: '#f59e0b', description: 'LLM sans stack NEURONAS' },
            { model_name: 'NEURONAS Lite', model_type: 'neuronas', model_version: 'lite', color: '#3b82f6', description: 'Version optimisée ressources' }
        ];
        
        for (const model of defaults) {
            await base44.entities.AIModel.create(model);
        }
        
        const newModels = await base44.entities.AIModel.filter({ is_active: true });
        setModels(newModels);
        toast.success('Modèles par défaut créés');
    };

    const loadComparison = async () => {
        if (!modelA || !modelB) {
            toast.error('Sélectionnez deux modèles à comparer');
            return;
        }

        setLoading(true);
        try {
            // Charger les enregistrements de performance pour chaque modèle
            const [recA, recB] = await Promise.all([
                base44.entities.ModelPerformanceRecord.filter({ model_id: modelA.id }, '-created_date', 500),
                base44.entities.ModelPerformanceRecord.filter({ model_id: modelB.id }, '-created_date', 500)
            ]);

            setRecordsA(recA);
            setRecordsB(recB);

            // Si pas assez de données ModelPerformanceRecord, utiliser BenchmarkResult
            if (recA.length < 5 || recB.length < 5) {
                await loadFromBenchmarkResults();
            } else {
                computeComparison(recA, recB);
            }
        } catch (error) {
            console.error('Comparison error:', error);
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const loadFromBenchmarkResults = async () => {
        // Fallback: utiliser BenchmarkResult et DevTestResult existants
        // Mode A = baseline, Mode B = NEURONAS
        const [benchmarks, devtests] = await Promise.all([
            base44.entities.BenchmarkResult.list('-created_date', 200),
            base44.entities.DevTestResult.list('-created_date', 200)
        ]);

        const allResults = [...benchmarks, ...devtests];

        // Extraire les données Mode A vs Mode B
        const modeAData = allResults.map(r => ({
            domain: r.scenario_category || 'General',
            spg: r.quality_scores?.A?.overall || 0.5,
            time: r.mode_a_time_ms || 0,
            tokens: r.mode_a_token_count || 0
        }));

        const modeBData = allResults.map(r => ({
            domain: r.scenario_category || 'General',
            spg: r.global_score_performance || 0,
            time: r.mode_b_time_ms || 0,
            tokens: r.mode_b_token_count || 0,
            winner: r.winner
        }));

        computeComparisonFromRaw(modeAData, modeBData, allResults);
    };

    const computeComparisonFromRaw = (dataA, dataB, allResults) => {
        // KPIs globaux
        const avgSpgA = dataA.length > 0 ? dataA.reduce((s, d) => s + d.spg, 0) / dataA.length : 0;
        const avgSpgB = dataB.length > 0 ? dataB.reduce((s, d) => s + d.spg, 0) / dataB.length : 0;
        const avgTimeA = dataA.length > 0 ? dataA.reduce((s, d) => s + d.time, 0) / dataA.length : 0;
        const avgTimeB = dataB.length > 0 ? dataB.reduce((s, d) => s + d.time, 0) / dataB.length : 0;
        const winRateB = dataB.length > 0 ? dataB.filter(d => d.winner === 'mode_b').length / dataB.length * 100 : 0;

        // Par domaine
        const domainMap = {};
        allResults.forEach((r, idx) => {
            const domain = r.scenario_category || 'General';
            if (!domainMap[domain]) {
                domainMap[domain] = { domain, spgA: [], spgB: [], countA: 0, countB: 0 };
            }
            domainMap[domain].spgA.push(dataA[idx]?.spg || 0);
            domainMap[domain].spgB.push(dataB[idx]?.spg || 0);
            domainMap[domain].countA++;
            domainMap[domain].countB++;
        });

        const domainComparison = Object.values(domainMap).map(d => ({
            domain: d.domain,
            modelA: d.spgA.length > 0 ? d.spgA.reduce((a, b) => a + b, 0) / d.spgA.length : 0,
            modelB: d.spgB.length > 0 ? d.spgB.reduce((a, b) => a + b, 0) / d.spgB.length : 0,
            diff: 0
        }));
        domainComparison.forEach(d => d.diff = ((d.modelB - d.modelA) / Math.max(d.modelA, 0.01)) * 100);

        // Par composant (basé sur hemisphere)
        const componentMap = {
            D3STIB: { spgA: [], spgB: [] },
            QRONAS: { spgA: [], spgB: [] },
            BRONAS: { spgA: [], spgB: [] },
            SMAS: { spgA: [], spgB: [] },
            GC_HARMONIZER: { spgA: [], spgB: [] }
        };

        allResults.forEach((r, idx) => {
            const spgA = dataA[idx]?.spg || 0;
            const spgB = dataB[idx]?.spg || 0;

            if (r.mode_b_dominant_hemisphere === 'left') {
                componentMap.D3STIB.spgA.push(spgA);
                componentMap.D3STIB.spgB.push(spgB);
            } else if (r.mode_b_dominant_hemisphere === 'right') {
                componentMap.QRONAS.spgA.push(spgA);
                componentMap.QRONAS.spgB.push(spgB);
            } else if (r.mode_b_dominant_hemisphere === 'central') {
                componentMap.GC_HARMONIZER.spgA.push(spgA);
                componentMap.GC_HARMONIZER.spgB.push(spgB);
            }
            if (r.mode_b_debate_rounds > 0) {
                componentMap.SMAS.spgA.push(spgA);
                componentMap.SMAS.spgB.push(spgB);
            }
            if (r.bronas_post_val_status === 'passed') {
                componentMap.BRONAS.spgA.push(spgA);
                componentMap.BRONAS.spgB.push(spgB);
            }
        });

        const componentComparison = Object.entries(componentMap).map(([comp, data]) => ({
            component: comp,
            modelA: data.spgA.length > 0 ? data.spgA.reduce((a, b) => a + b, 0) / data.spgA.length : 0,
            modelB: data.spgB.length > 0 ? data.spgB.reduce((a, b) => a + b, 0) / data.spgB.length : 0,
            fullMark: 1
        }));

        setComparisonData({
            kpis: {
                modelA: { name: modelA?.model_name || 'Baseline (Mode A)', spg: avgSpgA, time: avgTimeA, tests: dataA.length },
                modelB: { name: modelB?.model_name || 'NEURONAS (Mode B)', spg: avgSpgB, time: avgTimeB, tests: dataB.length, winRate: winRateB }
            },
            domainComparison,
            componentComparison,
            spgDiff: ((avgSpgB - avgSpgA) / Math.max(avgSpgA, 0.01)) * 100,
            timeDiff: ((avgTimeB - avgTimeA) / Math.max(avgTimeA, 1)) * 100
        });
    };

    const computeComparison = (recA, recB) => {
        // Calcul basé sur ModelPerformanceRecord
        const avgSpgA = recA.length > 0 ? recA.reduce((s, r) => s + (r.spg_score || 0), 0) / recA.length : 0;
        const avgSpgB = recB.length > 0 ? recB.reduce((s, r) => s + (r.spg_score || 0), 0) / recB.length : 0;
        const avgTimeA = recA.length > 0 ? recA.reduce((s, r) => s + (r.response_time_ms || 0), 0) / recA.length : 0;
        const avgTimeB = recB.length > 0 ? recB.reduce((s, r) => s + (r.response_time_ms || 0), 0) / recB.length : 0;

        // Grouper par domaine
        const domainMapA = {};
        const domainMapB = {};
        recA.forEach(r => {
            const d = r.domain || 'General';
            if (!domainMapA[d]) domainMapA[d] = [];
            domainMapA[d].push(r.spg_score || 0);
        });
        recB.forEach(r => {
            const d = r.domain || 'General';
            if (!domainMapB[d]) domainMapB[d] = [];
            domainMapB[d].push(r.spg_score || 0);
        });

        const allDomains = new Set([...Object.keys(domainMapA), ...Object.keys(domainMapB)]);
        const domainComparison = Array.from(allDomains).map(domain => {
            const aScores = domainMapA[domain] || [];
            const bScores = domainMapB[domain] || [];
            const avgA = aScores.length > 0 ? aScores.reduce((a, b) => a + b, 0) / aScores.length : 0;
            const avgB = bScores.length > 0 ? bScores.reduce((a, b) => a + b, 0) / bScores.length : 0;
            return { domain, modelA: avgA, modelB: avgB, diff: avgA > 0 ? ((avgB - avgA) / avgA) * 100 : 0 };
        });

        // Grouper par composant
        const compMapA = { D3STIB: [], QRONAS: [], BRONAS: [], SMAS: [], GC_HARMONIZER: [] };
        const compMapB = { D3STIB: [], QRONAS: [], BRONAS: [], SMAS: [], GC_HARMONIZER: [] };
        recA.forEach(r => {
            if (r.component_tested && compMapA[r.component_tested]) {
                compMapA[r.component_tested].push(r.spg_score || 0);
            }
        });
        recB.forEach(r => {
            if (r.component_tested && compMapB[r.component_tested]) {
                compMapB[r.component_tested].push(r.spg_score || 0);
            }
        });

        const componentComparison = Object.keys(compMapA).map(comp => {
            const aArr = compMapA[comp];
            const bArr = compMapB[comp];
            return {
                component: comp,
                modelA: aArr.length > 0 ? aArr.reduce((a, b) => a + b, 0) / aArr.length : 0,
                modelB: bArr.length > 0 ? bArr.reduce((a, b) => a + b, 0) / bArr.length : 0,
                fullMark: 1
            };
        });

        setComparisonData({
            kpis: {
                modelA: { name: modelA.model_name, spg: avgSpgA, time: avgTimeA, tests: recA.length },
                modelB: { name: modelB.model_name, spg: avgSpgB, time: avgTimeB, tests: recB.length }
            },
            domainComparison,
            componentComparison,
            spgDiff: avgSpgA > 0 ? ((avgSpgB - avgSpgA) / avgSpgA) * 100 : 0,
            timeDiff: avgTimeA > 0 ? ((avgTimeB - avgTimeA) / avgTimeA) * 100 : 0
        });
    };

    const DiffIndicator = ({ value, inverse = false }) => {
        const isPositive = inverse ? value < 0 : value > 0;
        const isNeutral = Math.abs(value) < 1;
        
        if (isNeutral) return <Minus className="w-4 h-4 text-slate-400" />;
        if (isPositive) return <TrendingUp className="w-4 h-4 text-green-400" />;
        return <TrendingDown className="w-4 h-4 text-red-400" />;
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-300 flex items-center gap-2">
                    <GitCompare className="w-5 h-5" />
                    Comparaison de Modèles
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Model Selection */}
                <div className="grid md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">Modèle A</label>
                        <Select 
                            value={modelA?.id || ''} 
                            onValueChange={(id) => setModelA(models.find(m => m.id === id))}
                        >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {models.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                                            {m.model_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">Modèle B</label>
                        <Select 
                            value={modelB?.id || ''} 
                            onValueChange={(id) => setModelB(models.find(m => m.id === id))}
                        >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {models.filter(m => m.id !== modelA?.id).map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                                            {m.model_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={loadComparison} 
                        disabled={!modelA || !modelB || loading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                        Comparer
                    </Button>
                </div>

                {/* Comparison Results */}
                {comparisonData && (
                    <div className="space-y-6">
                        {/* KPI Comparison Cards */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Model A Card */}
                            <div className="bg-slate-900 rounded-lg p-4 border-2" style={{ borderColor: modelA?.color || '#f59e0b' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: modelA?.color || '#f59e0b' }} />
                                    <span className="font-semibold text-white">{comparisonData.kpis.modelA.name}</span>
                                    <Badge variant="outline" className="text-xs">{comparisonData.kpis.modelA.tests} tests</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-xs text-slate-500">SPG Moyen</span>
                                        <p className="text-2xl font-bold" style={{ color: modelA?.color || '#f59e0b' }}>
                                            {comparisonData.kpis.modelA.spg.toFixed(3)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500">Temps Moyen</span>
                                        <p className="text-xl font-bold text-slate-300">
                                            {Math.round(comparisonData.kpis.modelA.time)}ms
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Model B Card */}
                            <div className="bg-slate-900 rounded-lg p-4 border-2" style={{ borderColor: modelB?.color || '#10b981' }}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: modelB?.color || '#10b981' }} />
                                    <span className="font-semibold text-white">{comparisonData.kpis.modelB.name}</span>
                                    <Badge variant="outline" className="text-xs">{comparisonData.kpis.modelB.tests} tests</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-xs text-slate-500">SPG Moyen</span>
                                        <p className="text-2xl font-bold" style={{ color: modelB?.color || '#10b981' }}>
                                            {comparisonData.kpis.modelB.spg.toFixed(3)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500">Temps Moyen</span>
                                        <p className="text-xl font-bold text-slate-300">
                                            {Math.round(comparisonData.kpis.modelB.time)}ms
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Diff Summary */}
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <h4 className="text-sm font-semibold text-green-300 mb-3">Différences Clés</h4>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3">
                                    <DiffIndicator value={comparisonData.spgDiff} />
                                    <div>
                                        <span className="text-xs text-slate-500">Différence SPG</span>
                                        <p className={`font-bold ${comparisonData.spgDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {comparisonData.spgDiff >= 0 ? '+' : ''}{comparisonData.spgDiff.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DiffIndicator value={comparisonData.timeDiff} inverse />
                                    <div>
                                        <span className="text-xs text-slate-500">Différence Temps</span>
                                        <p className={`font-bold ${comparisonData.timeDiff <= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                                            {comparisonData.timeDiff >= 0 ? '+' : ''}{comparisonData.timeDiff.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                {comparisonData.kpis.modelB.winRate !== undefined && (
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-4 h-4 text-purple-400" />
                                        <div>
                                            <span className="text-xs text-slate-500">Win Rate B</span>
                                            <p className="font-bold text-purple-400">
                                                {comparisonData.kpis.modelB.winRate.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Domain Bar Chart */}
                            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                                <h4 className="text-sm font-semibold text-green-300 mb-3">Comparaison par Domaine</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={comparisonData.domainComparison} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" domain={[0, 1]} stroke="#9ca3af" />
                                        <YAxis dataKey="domain" type="category" stroke="#9ca3af" width={80} fontSize={10} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                            formatter={(value) => value.toFixed(3)}
                                        />
                                        <Legend />
                                        <Bar dataKey="modelA" name={modelA?.model_name || 'Model A'} fill={modelA?.color || '#f59e0b'} />
                                        <Bar dataKey="modelB" name={modelB?.model_name || 'Model B'} fill={modelB?.color || '#10b981'} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Component Radar Chart */}
                            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                                <h4 className="text-sm font-semibold text-green-300 mb-3">Comparaison par Composant</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RadarChart data={comparisonData.componentComparison}>
                                        <PolarGrid stroke="#374151" />
                                        <PolarAngleAxis dataKey="component" stroke="#9ca3af" fontSize={10} />
                                        <PolarRadiusAxis domain={[0, 1]} stroke="#9ca3af" />
                                        <Radar 
                                            name={modelA?.model_name || 'Model A'} 
                                            dataKey="modelA" 
                                            stroke={modelA?.color || '#f59e0b'} 
                                            fill={modelA?.color || '#f59e0b'} 
                                            fillOpacity={0.3} 
                                        />
                                        <Radar 
                                            name={modelB?.model_name || 'Model B'} 
                                            dataKey="modelB" 
                                            stroke={modelB?.color || '#10b981'} 
                                            fill={modelB?.color || '#10b981'} 
                                            fillOpacity={0.3} 
                                        />
                                        <Legend />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                                            formatter={(value) => value.toFixed(3)}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Detailed Domain Table */}
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            <h4 className="text-sm font-semibold text-green-300 mb-3">Détail par Domaine</h4>
                            <ScrollArea className="h-48">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-2 text-slate-400">Domaine</th>
                                            <th className="text-right py-2 text-slate-400">{modelA?.model_name || 'A'}</th>
                                            <th className="text-right py-2 text-slate-400">{modelB?.model_name || 'B'}</th>
                                            <th className="text-right py-2 text-slate-400">Diff</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonData.domainComparison.map(d => (
                                            <tr key={d.domain} className="border-b border-slate-800">
                                                <td className="py-2 text-slate-300 capitalize">{d.domain}</td>
                                                <td className="py-2 text-right font-mono" style={{ color: modelA?.color || '#f59e0b' }}>
                                                    {d.modelA.toFixed(3)}
                                                </td>
                                                <td className="py-2 text-right font-mono" style={{ color: modelB?.color || '#10b981' }}>
                                                    {d.modelB.toFixed(3)}
                                                </td>
                                                <td className={`py-2 text-right font-mono ${d.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {d.diff >= 0 ? '+' : ''}{d.diff.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    </div>
                )}

                {!comparisonData && !loading && (
                    <div className="text-center py-12 text-slate-500">
                        <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Sélectionnez deux modèles et cliquez sur Comparer</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}