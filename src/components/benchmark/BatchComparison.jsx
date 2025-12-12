import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    GitCompare, 
    TrendingUp, 
    TrendingDown, 
    Minus,
    Loader2,
    Trophy,
    Clock,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function BatchComparison() {
    const [batches, setBatches] = useState([]);
    const [selectedBatch1, setSelectedBatch1] = useState(null);
    const [selectedBatch2, setSelectedBatch2] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [comparisonData, setComparisonData] = useState(null);

    useEffect(() => {
        loadBatches();
    }, []);

    useEffect(() => {
        if (selectedBatch1 && selectedBatch2) {
            compareSelected();
        }
    }, [selectedBatch1, selectedBatch2]);

    const loadBatches = async () => {
        setIsLoading(true);
        try {
            const allBatches = await base44.entities.BatchRunProgress.filter({
                status: 'completed'
            });
            
            const sorted = allBatches.sort((a, b) => 
                new Date(b.created_date) - new Date(a.created_date)
            );
            
            setBatches(sorted);
            
            if (sorted.length >= 2) {
                setSelectedBatch1(sorted[0].id);
                setSelectedBatch2(sorted[1].id);
            }
        } catch (error) {
            console.error('[BatchComparison] Load error:', error);
            toast.error('Erreur lors du chargement des batches');
        } finally {
            setIsLoading(false);
        }
    };

    const compareSelected = async () => {
        if (!selectedBatch1 || !selectedBatch2) return;

        try {
            const batch1 = batches.find(b => b.id === selectedBatch1);
            const batch2 = batches.find(b => b.id === selectedBatch2);

            if (!batch1 || !batch2) return;

            const s1 = batch1.summary_data || {};
            const s2 = batch2.summary_data || {};

            const comparison = {
                batch1: {
                    id: batch1.id,
                    date: new Date(batch1.created_date).toLocaleDateString('fr-FR'),
                    total: batch1.total_questions,
                    avgSPG: s1.average_spg || 0,
                    passRate: (s1.pass_rate || 0) * 100,
                    avgCPU: s1.average_cpu_savings || 0,
                    avgToken: s1.average_token_savings || 0,
                },
                batch2: {
                    id: batch2.id,
                    date: new Date(batch2.created_date).toLocaleDateString('fr-FR'),
                    total: batch2.total_questions,
                    avgSPG: s2.average_spg || 0,
                    passRate: (s2.pass_rate || 0) * 100,
                    avgCPU: s2.average_cpu_savings || 0,
                    avgToken: s2.average_token_savings || 0,
                },
                deltas: {
                    spg: ((s1.average_spg || 0) - (s2.average_spg || 0)),
                    passRate: ((s1.pass_rate || 0) - (s2.pass_rate || 0)) * 100,
                    cpu: ((s1.average_cpu_savings || 0) - (s2.average_cpu_savings || 0)),
                    token: ((s1.average_token_savings || 0) - (s2.average_token_savings || 0)),
                }
            };

            setComparisonData(comparison);
        } catch (error) {
            console.error('[BatchComparison] Compare error:', error);
            toast.error('Erreur lors de la comparaison');
        }
    };

    const getDeltaIcon = (value) => {
        if (value > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
        if (value < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-slate-400" />;
    };

    const getDeltaColor = (value) => {
        if (value > 0) return 'text-green-400';
        if (value < 0) return 'text-red-400';
        return 'text-slate-400';
    };

    const prepareChartData = () => {
        if (!comparisonData) return [];

        return [
            {
                metric: 'SPG',
                Batch1: comparisonData.batch1.avgSPG,
                Batch2: comparisonData.batch2.avgSPG,
            },
            {
                metric: 'Pass Rate',
                Batch1: comparisonData.batch1.passRate,
                Batch2: comparisonData.batch2.passRate,
            },
            {
                metric: 'CPU Save',
                Batch1: comparisonData.batch1.avgCPU,
                Batch2: comparisonData.batch2.avgCPU,
            },
            {
                metric: 'Token Save',
                Batch1: comparisonData.batch1.avgToken,
                Batch2: comparisonData.batch2.avgToken,
            }
        ];
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-400" />
                </CardContent>
            </Card>
        );
    }

    if (batches.length < 2) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-12 text-center">
                    <GitCompare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-400 mb-2">
                        Pas assez de batches
                    </h3>
                    <p className="text-sm text-slate-500">
                        Exécutez au moins 2 batches pour activer la comparaison
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Batch Selection */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-400 flex items-center gap-2">
                        <GitCompare className="w-5 h-5" />
                        Comparaison de Batches
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Batch 1</label>
                            <Select value={selectedBatch1} onValueChange={setSelectedBatch1}>
                                <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {batches.map(batch => (
                                        <SelectItem key={batch.id} value={batch.id}>
                                            {new Date(batch.created_date).toLocaleDateString('fr-FR')} - {batch.total_questions} tests
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 mb-2 block">Batch 2</label>
                            <Select value={selectedBatch2} onValueChange={setSelectedBatch2}>
                                <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {batches.map(batch => (
                                        <SelectItem key={batch.id} value={batch.id}>
                                            {new Date(batch.created_date).toLocaleDateString('fr-FR')} - {batch.total_questions} tests
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
                    {/* Delta Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-slate-400">SPG Δ</div>
                                    {getDeltaIcon(comparisonData.deltas.spg)}
                                </div>
                                <div className={`text-2xl font-bold ${getDeltaColor(comparisonData.deltas.spg)}`}>
                                    {comparisonData.deltas.spg > 0 ? '+' : ''}
                                    {comparisonData.deltas.spg.toFixed(3)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-slate-400">Pass Rate Δ</div>
                                    {getDeltaIcon(comparisonData.deltas.passRate)}
                                </div>
                                <div className={`text-2xl font-bold ${getDeltaColor(comparisonData.deltas.passRate)}`}>
                                    {comparisonData.deltas.passRate > 0 ? '+' : ''}
                                    {comparisonData.deltas.passRate.toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-slate-400">CPU Save Δ</div>
                                    {getDeltaIcon(comparisonData.deltas.cpu)}
                                </div>
                                <div className={`text-2xl font-bold ${getDeltaColor(comparisonData.deltas.cpu)}`}>
                                    {comparisonData.deltas.cpu > 0 ? '+' : ''}
                                    {comparisonData.deltas.cpu.toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-slate-400">Token Save Δ</div>
                                    {getDeltaIcon(comparisonData.deltas.token)}
                                </div>
                                <div className={`text-2xl font-bold ${getDeltaColor(comparisonData.deltas.token)}`}>
                                    {comparisonData.deltas.token > 0 ? '+' : ''}
                                    {comparisonData.deltas.token.toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 text-base">
                                Comparaison Visuelle
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={prepareChartData()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="metric" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Batch1" fill="#f97316" name={comparisonData.batch1.date} />
                                    <Bar dataKey="Batch2" fill="#22c55e" name={comparisonData.batch2.date} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Side by Side Stats */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 text-base">
                                Statistiques Détaillées
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-xs text-slate-500 font-semibold">Métrique</div>
                                <div className="text-xs text-orange-400 font-semibold text-center">
                                    Batch 1 ({comparisonData.batch1.date})
                                </div>
                                <div className="text-xs text-green-400 font-semibold text-center">
                                    Batch 2 ({comparisonData.batch2.date})
                                </div>

                                <div className="text-sm text-slate-300">SPG Moyen</div>
                                <div className="text-sm text-orange-400 text-center font-mono">
                                    {comparisonData.batch1.avgSPG.toFixed(3)}
                                </div>
                                <div className="text-sm text-green-400 text-center font-mono">
                                    {comparisonData.batch2.avgSPG.toFixed(3)}
                                </div>

                                <div className="text-sm text-slate-300">Taux Réussite</div>
                                <div className="text-sm text-orange-400 text-center font-mono">
                                    {comparisonData.batch1.passRate.toFixed(1)}%
                                </div>
                                <div className="text-sm text-green-400 text-center font-mono">
                                    {comparisonData.batch2.passRate.toFixed(1)}%
                                </div>

                                <div className="text-sm text-slate-300">Économie CPU</div>
                                <div className="text-sm text-orange-400 text-center font-mono">
                                    {comparisonData.batch1.avgCPU.toFixed(1)}%
                                </div>
                                <div className="text-sm text-green-400 text-center font-mono">
                                    {comparisonData.batch2.avgCPU.toFixed(1)}%
                                </div>

                                <div className="text-sm text-slate-300">Économie Tokens</div>
                                <div className="text-sm text-orange-400 text-center font-mono">
                                    {comparisonData.batch1.avgToken.toFixed(1)}%
                                </div>
                                <div className="text-sm text-green-400 text-center font-mono">
                                    {comparisonData.batch2.avgToken.toFixed(1)}%
                                </div>

                                <div className="text-sm text-slate-300">Total Tests</div>
                                <div className="text-sm text-orange-400 text-center font-mono">
                                    {comparisonData.batch1.total}
                                </div>
                                <div className="text-sm text-green-400 text-center font-mono">
                                    {comparisonData.batch2.total}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}