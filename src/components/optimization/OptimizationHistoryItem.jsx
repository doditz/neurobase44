import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    ChevronDown, ChevronUp, 
    TrendingUp, Clock, Zap, Target, 
    CheckCircle2, AlertCircle, Brain,
    BarChart3, Activity
} from 'lucide-react';
import UnifiedLogViewer from '@/components/debug/UnifiedLogViewer';

export default function OptimizationHistoryItem({ benchmark, index }) {
    const [expanded, setExpanded] = useState(false);

    const spg = benchmark.global_score_performance ?? 0;
    const improvement = benchmark.performance_improvement ?? 0;
    const winner = benchmark.winner;
    const passed = benchmark.passed ?? false;

    const qualityA = benchmark.quality_scores?.A || {};
    const qualityB = benchmark.quality_scores?.B || {};

    return (
        <Card className={`bg-slate-800 border ${
            passed ? 'border-green-600/30' : 'border-slate-700'
        } ${expanded ? 'shadow-lg' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl font-bold text-slate-500">#{index + 1}</div>
                        <div className="flex-1">
                            <CardTitle className="text-green-300 text-base">
                                {benchmark.scenario_name || 'Test sans nom'}
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-1">
                                {new Date(benchmark.created_date).toLocaleString('fr-FR')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge className={
                            spg >= 0.9 ? 'bg-green-600' :
                            spg >= 0.7 ? 'bg-yellow-600' :
                            'bg-red-600'
                        }>
                            SPG: {spg.toFixed(3)}
                        </Badge>

                        <Badge className={
                            winner === 'mode_b' ? 'bg-green-600' :
                            winner === 'mode_a' ? 'bg-orange-600' : 'bg-gray-600'
                        }>
                            {winner || 'N/A'}
                        </Badge>

                        {passed !== undefined && (
                            <div className="flex items-center gap-1">
                                {passed ? 
                                    <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                                    <AlertCircle className="w-4 h-4 text-red-400" />
                                }
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-slate-400 hover:text-green-400"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-slate-900 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Amélioration</div>
                        <div className={`text-sm font-bold ${improvement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Temps B</div>
                        <div className="text-sm font-bold text-blue-400">
                            {(benchmark.mode_b_time_ms ?? 0).toLocaleString()}ms
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Tokens B</div>
                        <div className="text-sm font-bold text-purple-400">
                            {(benchmark.mode_b_token_count ?? 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Personas</div>
                        <div className="text-sm font-bold text-orange-400">
                            {benchmark.mode_b_personas_used?.length ?? 0}
                        </div>
                    </div>
                </div>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-4">
                    {/* Test Prompt */}
                    <div>
                        <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            Prompt de Test
                        </h4>
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                {benchmark.test_prompt}
                            </p>
                        </div>
                    </div>

                    {/* Performance Metrics Grid */}
                    <div>
                        <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            Métriques de Performance
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="bg-slate-900 rounded p-3 border border-slate-700">
                                <div className="text-[10px] text-slate-500 mb-1">CPU Savings</div>
                                <div className="text-lg font-bold text-blue-400">
                                    {benchmark.cpu_savings_percentage?.toFixed(1) ?? '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded p-3 border border-slate-700">
                                <div className="text-[10px] text-slate-500 mb-1">Token Savings</div>
                                <div className="text-lg font-bold text-yellow-400">
                                    {benchmark.token_savings_percentage?.toFixed(1) ?? '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded p-3 border border-slate-700">
                                <div className="text-[10px] text-slate-500 mb-1">RAM Savings</div>
                                <div className="text-lg font-bold text-purple-400">
                                    {benchmark.ram_savings_percentage?.toFixed(1) ?? '0'}%
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded p-3 border border-slate-700">
                                <div className="text-[10px] text-slate-500 mb-1">Rondes Débat</div>
                                <div className="text-lg font-bold text-pink-400">
                                    {benchmark.mode_b_debate_rounds ?? 3}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SPG Breakdown */}
                    {benchmark.spg_breakdown && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <BarChart3 className="w-3 h-3" />
                                Décomposition SPG
                            </h4>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 space-y-2">
                                {Object.entries(benchmark.spg_breakdown).map(([key, value]) => (
                                    <div key={key}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-slate-400 capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs font-mono text-green-400">
                                                {typeof value === 'number' ? value.toFixed(3) : value}
                                            </span>
                                        </div>
                                        {typeof value === 'number' && (
                                            <Progress value={value * 100} className="h-1.5 bg-slate-700" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quality Scores Comparison */}
                    {(Object.keys(qualityA).length > 0 || Object.keys(qualityB).length > 0) && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <Brain className="w-3 h-3" />
                                Scores de Qualité (Mode A vs Mode B)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Mode A */}
                                <div className="bg-slate-900 rounded-lg p-3 border border-orange-600/30">
                                    <h5 className="text-xs font-semibold text-orange-400 mb-2">Mode A (Baseline)</h5>
                                    <div className="space-y-2">
                                        {Object.entries(qualityA).map(([key, value]) => (
                                            <div key={key}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] text-slate-500 capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-xs font-mono text-orange-400">
                                                        {typeof value === 'number' ? value.toFixed(2) : value}
                                                    </span>
                                                </div>
                                                {typeof value === 'number' && (
                                                    <Progress value={value * 100} className="h-1 bg-slate-700" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Mode B */}
                                <div className="bg-slate-900 rounded-lg p-3 border border-green-600/30">
                                    <h5 className="text-xs font-semibold text-green-400 mb-2">Mode B (Neuronas)</h5>
                                    <div className="space-y-2">
                                        {Object.entries(qualityB).map(([key, value]) => (
                                            <div key={key}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] text-slate-500 capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-xs font-mono text-green-400">
                                                        {typeof value === 'number' ? value.toFixed(2) : value}
                                                    </span>
                                                </div>
                                                {typeof value === 'number' && (
                                                    <Progress value={value * 100} className="h-1 bg-slate-700" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Personas Used */}
                    {benchmark.mode_b_personas_used && benchmark.mode_b_personas_used.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <Brain className="w-3 h-3" />
                                Personas Activées ({benchmark.mode_b_personas_used.length})
                            </h4>
                            <div className="flex flex-wrap gap-1">
                                {benchmark.mode_b_personas_used.map((persona, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                        {persona}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Responses Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <h4 className="text-xs font-semibold text-orange-400 mb-2">Réponse Mode A</h4>
                            <ScrollArea className="h-48 bg-slate-900 rounded-lg p-3 border border-orange-600/30">
                                <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                    {benchmark.mode_a_response || 'Aucune réponse'}
                                </p>
                            </ScrollArea>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2">Réponse Mode B</h4>
                            <ScrollArea className="h-48 bg-slate-900 rounded-lg p-3 border border-green-600/30">
                                <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                    {benchmark.mode_b_response || 'Aucune réponse'}
                                </p>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* SMAS Dynamics */}
                    {benchmark.mode_b_smas_dynamics && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                Dynamiques SMAS
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                                    <div className="text-[10px] text-slate-500">État Global G(t)</div>
                                    <div className="text-sm font-mono text-green-400">
                                        {benchmark.mode_b_smas_dynamics.final_G_t?.toFixed(3) ?? 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                                    <div className="text-[10px] text-slate-500">Dopamine D(t)</div>
                                    <div className="text-sm font-mono text-blue-400">
                                        {benchmark.mode_b_smas_dynamics.final_D_t?.toFixed(3) ?? 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                                    <div className="text-[10px] text-slate-500">Équilibre ω(t)</div>
                                    <div className="text-sm font-mono text-purple-400">
                                        {benchmark.mode_b_smas_dynamics.final_omega_t?.toFixed(3) ?? 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-slate-900 rounded p-2 border border-slate-700">
                                    <div className="text-[10px] text-slate-500">Φ(t) Grounded</div>
                                    <div className="text-sm font-mono text-pink-400">
                                        {benchmark.mode_b_smas_dynamics.final_Phi_t?.toFixed(3) ?? 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grader Rationale */}
                    {benchmark.grader_rationale && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2">Raisonnement du Grader</h4>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                                    {benchmark.grader_rationale}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {benchmark.notes && (
                        <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2">Notes</h4>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                    {benchmark.notes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Debug Logs */}
                    {benchmark.full_debug_log && benchmark.full_debug_log.length > 0 && (
                        <UnifiedLogViewer
                            logs={benchmark.full_debug_log}
                            title={`Logs Complets (${benchmark.full_debug_log.length} entrées)`}
                            showStats={true}
                            defaultExpanded={false}
                        />
                    )}

                    {/* BRONAS Status */}
                    {(benchmark.bronas_pre_val_status || benchmark.bronas_post_val_status) && (
                        <div className="grid grid-cols-2 gap-2">
                            {benchmark.bronas_pre_val_status && (
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                    <div className="text-xs text-slate-500 mb-1">BRONAS Pré-Validation</div>
                                    <Badge className={
                                        benchmark.bronas_pre_val_status === 'passed' ? 'bg-green-600' :
                                        benchmark.bronas_pre_val_status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                                    }>
                                        {benchmark.bronas_pre_val_status}
                                    </Badge>
                                </div>
                            )}
                            {benchmark.bronas_post_val_status && (
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                                    <div className="text-xs text-slate-500 mb-1">BRONAS Post-Validation</div>
                                    <Badge className={
                                        benchmark.bronas_post_val_status === 'passed' ? 'bg-green-600' :
                                        benchmark.bronas_post_val_status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                                    }>
                                        {benchmark.bronas_post_val_status}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}