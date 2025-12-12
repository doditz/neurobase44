import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Download, 
    CheckCircle2, 
    XCircle, 
    TrendingUp,
    Zap,
    Cpu,
    HardDrive,
    ChevronDown,
    ChevronRight,
    Eye,
    AlertTriangle,
    Trophy,
    ThumbsDown,
    FileJson,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BenchmarkComparison from './BenchmarkComparison';

export default function BatchSummaryModal({ isOpen, onClose, progressData }) {
    const [results, setResults] = useState([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);
    const [expandedResultId, setExpandedResultId] = useState(null);
    const [loadErrors, setLoadErrors] = useState([]);

    useEffect(() => {
        if (isOpen && progressData?.benchmark_results_ids) {
            loadResults();
        }
    }, [isOpen, progressData]);

    const loadResults = async (retryCount = 0) => {
        setIsLoadingResults(true);
        setLoadErrors([]);
        const loadedResults = [];
        const errors = [];
        
        try {
            // Wait for DB propagation on first load
            if (retryCount === 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('[BatchSummary] Loading results (attempt', retryCount + 1, '):', progressData.benchmark_results_ids.length, 'IDs');
            
            for (const id of progressData.benchmark_results_ids) {
                try {
                    const result = await base44.entities.DevTestResult.get(id);
                    loadedResults.push(result);
                } catch (error) {
                    console.warn(`[BatchSummary] Result ${id.substring(0, 12)}... not found:`, error.message);
                    errors.push({ id, error: error.message });
                }
            }
            
            setResults(loadedResults);
            setLoadErrors(errors);
            
            // Auto-retry once if too many errors and this is first attempt
            if (errors.length > 0 && retryCount === 0 && errors.length > loadedResults.length * 0.3) {
                console.log('[BatchSummary] Many results missing, will auto-retry in 3s...');
                setTimeout(() => loadResults(1), 3000);
            } else if (errors.length > 0) {
                toast.warning(`${errors.length} résultat(s) non disponible(s) (propagation DB en cours)`, {
                    duration: 5000
                });
            }
            
            console.log(`[BatchSummary] Loaded ${loadedResults.length}/${progressData.benchmark_results_ids.length} results`);
        } catch (error) {
            console.error('[BatchSummary] Critical error:', error);
            toast.error('Erreur critique lors du chargement');
        } finally {
            setIsLoadingResults(false);
        }
    };

    const handleExportBatch = async (format) => {
        try {
            toast.info(`Génération de l'export ${format.toUpperCase()}...`);
            
            const { data } = await base44.functions.invoke('exportBatchReport', {
                batch_id: progressData.id,
                format
            });

            const blob = new Blob([data], { 
                type: format === 'json' ? 'application/json' : 
                      format === 'md' ? 'text/markdown' : 'text/plain'
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch_${progressData.id}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success(`✅ Rapport batch exporté en ${format.toUpperCase()}`);
        } catch (error) {
            console.error('[BatchSummary] Export error:', error);
            toast.error(`Erreur export: ${error.message}`);
        }
    };

    if (!progressData) return null;

    const {
        summary_data = {},
        total_questions = 0,
        completed_questions = 0,
        start_time,
        end_time
    } = progressData;

    const {
        average_spg = 0,
        pass_rate = 0,
        average_cpu_savings = 0,
        average_ram_savings = 0,
        average_token_savings = 0,
        total_passed = 0,
        total_failed = 0
    } = summary_data || {};

    const totalTime = start_time && end_time 
        ? (new Date(end_time) - new Date(start_time)) / 1000 
        : 0;

    // Calculate Mode A vs Mode B stats
    const modeAWins = results.filter(r => r.winner === 'mode_a').length;
    const modeBWins = results.filter(r => r.winner === 'mode_b').length;
    const ties = results.filter(r => r.winner === 'tie').length;

    const avgModeAARS = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.quality_scores?.mode_a_ars_score || 0), 0) / results.length 
        : 0;
    const avgModeBARS = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.quality_scores?.mode_b_ars_score || 0), 0) / results.length 
        : 0;

    // Best & worst performers
    const sortedBySPG = [...results].sort((a, b) => (b.global_score_performance || 0) - (a.global_score_performance || 0));
    const topPerformers = sortedBySPG.slice(0, 3);
    const worstPerformers = sortedBySPG.slice(-3).reverse();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6" />
                        🔥 Rapport de Batch Complet - BOSS MODE
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {completed_questions} / {total_questions} questions traitées en {totalTime.toFixed(1)}s
                        {loadErrors.length > 0 && (
                            <span className="ml-2 text-orange-400">
                                ({loadErrors.length} erreur(s) de chargement)
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Error Warning */}
                    {loadErrors.length > 0 && (
                        <Card className="bg-orange-900/20 border-orange-600">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-orange-400 mb-2">
                                            Avertissement: {loadErrors.length} résultat(s) non chargé(s)
                                        </h4>
                                        <p className="text-sm text-slate-300 mb-2">
                                            Certains résultats n'ont pas pu être chargés. Cela peut être dû à un délai de propagation de la base de données ou à des IDs invalides.
                                        </p>
                                        <details className="text-xs text-slate-400">
                                            <summary className="cursor-pointer hover:text-slate-300">Voir les détails</summary>
                                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                                {loadErrors.map((err, idx) => (
                                                    <li key={idx}>
                                                        ID: {err.id.substring(0, 12)}... - {err.error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => loadResults(0)}
                                            className="mt-3 border-orange-600 text-orange-400 hover:bg-orange-900/20"
                                            disabled={isLoadingResults}
                                        >
                                            {isLoadingResults ? 'Chargement...' : 'Réessayer le chargement'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <Card className="bg-green-900/20 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                    <div className="text-xs text-slate-400">SPG Moyen</div>
                                </div>
                                <div className="text-2xl font-bold text-green-400">
                                    {(average_spg || 0).toFixed(3)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-900/20 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    <div className="text-xs text-slate-400">Taux Réussite</div>
                                </div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {((pass_rate || 0) * 100).toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-purple-900/20 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Cpu className="w-4 h-4 text-purple-400" />
                                    <div className="text-xs text-slate-400">Économie CPU</div>
                                </div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {(average_cpu_savings || 0).toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-orange-900/20 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <HardDrive className="w-4 h-4 text-orange-400" />
                                    <div className="text-xs text-slate-400">Économie RAM</div>
                                </div>
                                <div className="text-2xl font-bold text-orange-400">
                                    {(average_ram_savings || 0).toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-yellow-900/20 border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-yellow-400" />
                                    <div className="text-xs text-slate-400">Économie Tokens</div>
                                </div>
                                <div className="text-2xl font-bold text-yellow-400">
                                    {(average_token_savings || 0).toFixed(1)}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mode A vs Mode B Comparison */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="p-4">
                            <h3 className="text-lg font-semibold text-green-400 mb-4">🥊 Mode A vs Mode B - Combat Results</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 mb-1">Mode A Wins</div>
                                    <div className="text-2xl font-bold text-orange-400">{modeAWins}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 mb-1">Mode B Wins</div>
                                    <div className="text-2xl font-bold text-green-400">{modeBWins}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 mb-1">Ties</div>
                                    <div className="text-2xl font-bold text-slate-400">{ties}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 mb-1">Mode A ARS Avg</div>
                                    <div className="text-xl font-bold text-orange-400">{(avgModeAARS || 0).toFixed(3)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-slate-400 mb-1">Mode B ARS Avg</div>
                                    <div className="text-xl font-bold text-green-400">{(avgModeBARS || 0).toFixed(3)}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top & Worst Performers */}
                    {results.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-green-900/20 border-green-600/50">
                                <CardContent className="p-4">
                                    <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-3">
                                        <Trophy className="w-4 h-4" />
                                        🏆 Top 3 Performances
                                    </h4>
                                    <div className="space-y-2">
                                        {topPerformers.map((r, idx) => (
                                            <div key={idx} className="bg-slate-800/50 p-2 rounded flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-green-600">{idx + 1}</Badge>
                                                    <span className="text-sm text-slate-300 truncate">{r.scenario_name}</span>
                                                </div>
                                                <span className="text-green-400 font-mono font-bold">
                                                    {(r.global_score_performance || 0).toFixed(3)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-red-900/20 border-red-600/50">
                                <CardContent className="p-4">
                                    <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                                        <ThumbsDown className="w-4 h-4" />
                                        ⚠️ Pires Performances
                                    </h4>
                                    <div className="space-y-2">
                                        {worstPerformers.map((r, idx) => (
                                            <div key={idx} className="bg-slate-800/50 p-2 rounded flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-red-600">{idx + 1}</Badge>
                                                    <span className="text-sm text-slate-300 truncate">{r.scenario_name}</span>
                                                </div>
                                                <span className="text-red-400 font-mono font-bold">
                                                    {(r.global_score_performance || 0).toFixed(3)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Pass/Fail Summary */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <span className="text-slate-300">Réussis: <span className="font-bold text-green-400">{total_passed}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-red-400" />
                                        <span className="text-slate-300">Échecs: <span className="font-bold text-red-400">{total_failed}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-slate-400" />
                                        <span className="text-slate-300">Chargés: <span className="font-bold text-slate-400">{results.length}</span></span>
                                        </div>
                                        </div>
                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button
                                           disabled={!progressData?.id}
                                           className="bg-indigo-600 hover:bg-indigo-700"
                                        >
                                           <Download className="w-4 h-4 mr-2" />
                                           Exporter Rapport
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                        <DropdownMenuLabel className="text-green-400">Format</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-700" />
                                        <DropdownMenuItem
                                           onClick={() => handleExportBatch('json')}
                                           className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                                        >
                                           <FileJson className="w-4 h-4 mr-2" />
                                           JSON (Complet)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                           onClick={() => handleExportBatch('md')}
                                           className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                                        >
                                           <FileText className="w-4 h-4 mr-2" />
                                           Markdown
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                           onClick={() => handleExportBatch('txt')}
                                           className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                                        >
                                           <FileText className="w-4 h-4 mr-2" />
                                           Texte Simple
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Results Table */}
                    <Card className="bg-slate-900/50 border-slate-700">
                        <CardContent className="p-4">
                            <h3 className="text-lg font-semibold text-green-400 mb-4">📊 Résultats Détaillés (Cliquez pour voir A/B)</h3>
                            
                            {isLoadingResults ? (
                                <div className="text-center py-8 text-slate-400">
                                    Chargement des résultats...
                                </div>
                            ) : results.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    Aucun résultat à afficher
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {results.map((result, idx) => (
                                        <div key={idx} className="border border-slate-700 rounded-lg overflow-hidden">
                                            {/* Summary Row */}
                                            <div className="bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                                <button
                                                    onClick={() => setExpandedResultId(expandedResultId === result.id ? null : result.id)}
                                                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        {expandedResultId === result.id ? (
                                                            <ChevronDown className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        )}
                                                        
                                                        <div className="flex-1 grid grid-cols-8 gap-2 items-center text-sm">
                                                            <div className="col-span-2">
                                                                <div className="font-medium text-slate-300 truncate">{result.scenario_name}</div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={result.passed ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}>
                                                                    {result.passed ? 'PASS' : 'FAIL'}
                                                                </Badge>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">SPG</div>
                                                                <div className="text-green-400 font-mono font-semibold">
                                                                    {result.global_score_performance?.toFixed(3) || 'N/A'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">ARS A</div>
                                                                <div className="text-orange-400 font-mono">
                                                                    {result.quality_scores?.mode_a_ars_score?.toFixed(3) || 'N/A'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">ARS B</div>
                                                                <div className="text-green-400 font-mono">
                                                                    {result.quality_scores?.mode_b_ars_score?.toFixed(3) || 'N/A'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">Time B</div>
                                                                <div className="text-blue-400 font-mono">
                                                                    {result.mode_b_time_ms || 0}ms
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <Badge className={
                                                                    result.winner === 'mode_b' ? 'bg-green-900/50 text-green-400' :
                                                                    result.winner === 'mode_a' ? 'bg-orange-900/50 text-orange-400' :
                                                                    'bg-slate-700 text-slate-400'
                                                                }>
                                                                    {result.winner === 'mode_b' ? '🏆 B' : result.winner === 'mode_a' ? 'A' : 'TIE'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        
                                                        <Eye className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    </div>
                                                </button>
                                            </div>
                                            
                                            {/* Expanded Details */}
                                            {expandedResultId === result.id && (
                                                <div className="bg-slate-900 p-4 border-t border-slate-700">
                                                    <BenchmarkComparison benchmark={result} onClose={null} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Fermer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}