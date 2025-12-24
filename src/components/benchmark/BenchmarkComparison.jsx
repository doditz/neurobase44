import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Clock, Zap, Brain, TrendingUp, ChevronDown, ChevronRight,
    FileText, CheckCircle2, AlertCircle, Users, Download, MessageSquare, Highlighter
} from 'lucide-react';
import CommentThread from '@/components/collaboration/CommentThread';
import AnnotationPanel from '@/components/collaboration/AnnotationPanel';

import UnifiedLogViewer from '../debug/UnifiedLogViewer';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import TextDiffView from './TextDiffView';
import QualitativeSummary from './QualitativeSummary';

// Helper function to safely format numbers
const safeFixed = (value, decimals = 3) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return Number(value).toFixed(decimals);
};

const safeNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || isNaN(value)) return fallback;
    return Number(value);
};

export default function BenchmarkComparison({ benchmark, onClose = null }) {
    const [expandedSections, setExpandedSections] = useState({
        modeA: false,
        modeB: false,
        quality: true,
        comparison: true,
        qualitative: true,
        collaboration: false
    });
    const [isExporting, setIsExporting] = React.useState(false);

    if (!benchmark) return null;

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleExport = async (format) => {
        setIsExporting(true);
        try {
            toast.info(`Génération de l'export ${format.toUpperCase()}...`);

            const response = await base44.functions.invoke('exportBenchmarkData', {
                benchmark_id: benchmark.id,
                format
            });

            if (!response.data) {
                throw new Error('No data received');
            }

            const blob = new Blob([response.data], {
                type: format === 'json' ? 'application/json' :
                      format === 'md' ? 'text/markdown' :
                      format === 'pdf' ? 'text/html' : 'text/plain'
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `benchmark_${benchmark.id}.${format === 'pdf' ? 'html' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success(`✅ Export ${format.toUpperCase()} téléchargé !`);
        } catch (error) {
            console.error('[Export] Error:', error);
            toast.error(`Erreur lors de l'export: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const quality = benchmark.quality_scores || {};
    const summary = benchmark.mode_b_dynamic_settings || {};
    const spg = safeNumber(benchmark.global_score_performance, 0);
    const spgBreakdown = benchmark.spg_breakdown || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-green-400">{benchmark.scenario_name}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {new Date(benchmark.created_date).toLocaleString('fr-FR')}
                    </p>
                    {benchmark.scenario_category && (
                        <Badge className="mt-2 bg-indigo-600">
                            {benchmark.scenario_category}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isExporting}
                                className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exporter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                            <DropdownMenuLabel className="text-green-400">Format</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                                onClick={() => handleExport('json')}
                                className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                                JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('md')}
                                className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                                Markdown
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('txt')}
                                className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                                TXT
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleExport('pdf')}
                                className="text-slate-200 hover:bg-slate-700 cursor-pointer"
                            >
                                PDF (HTML)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {onClose && (
                        <Button onClick={onClose} variant="ghost" size="sm" className="text-slate-400">
                            Fermer
                        </Button>
                    )}
                </div>
            </div>

            {/* NEW: Complexity & SMAS Activation Info */}
            {benchmark.mode_b_complexity_score !== undefined && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Analyse de Complexité & Activation SMAS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1">Score Complexité</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {(benchmark.mode_b_complexity_score * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1">SMAS Activé</div>
                                <div className="text-2xl font-bold text-orange-400">
                                    {(benchmark.mode_b_personas_used?.length || 0) >= 3 ? '✅ Oui' : '❌ Non'}
                                </div>
                            </div>
                            <div className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1">Personas Utilisées</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {benchmark.mode_b_personas_used?.length || 0}
                                </div>
                                {(benchmark.mode_b_personas_used?.length || 0) < 3 && (
                                    <div className="text-xs text-yellow-400 mt-1">⚠️ Min: 3</div>
                                )}
                            </div>
                            <div className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-xs text-slate-400 mb-1">Rondes Débat</div>
                                <div className="text-2xl font-bold text-green-400">
                                    {benchmark.mode_b_debate_rounds || 0}
                                </div>
                            </div>
                        </div>

                        {benchmark.mode_b_personas_used && benchmark.mode_b_personas_used.length > 0 && (
                            <div className="mt-4">
                                <div className="text-xs text-slate-400 mb-2">Personas Actives:</div>
                                <div className="flex flex-wrap gap-2">
                                    {benchmark.mode_b_personas_used.map((persona, idx) => (
                                        <Badge key={idx} variant="outline" className="border-slate-600">
                                            {persona}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {benchmark.mode_b_dominant_hemisphere && (
                            <div className="mt-3 text-xs text-slate-400">
                                Hémisphère dominant: <span className="text-green-400">{benchmark.mode_b_dominant_hemisphere}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* SPG Score */}
            {spg > 0 && (
                <Card className="bg-gradient-to-r from-orange-900/30 to-green-900/30 border-orange-600">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-slate-400">Score de Performance Global</div>
                                <div className="text-4xl font-bold text-orange-400 mt-2">
                                    {safeFixed(spg, 3)}
                                </div>
                                {spgBreakdown.quality !== undefined && (
                                    <div className="flex gap-4 mt-3 text-xs">
                                        <div>
                                            <span className="text-slate-500">Quality:</span>
                                            <span className="text-green-400 ml-1">{safeFixed(spgBreakdown.quality, 3)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Efficiency:</span>
                                            <span className="text-blue-400 ml-1">{safeFixed(spgBreakdown.efficiency, 3)}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Complexity:</span>
                                            <span className="text-purple-400 ml-1">{safeFixed(spgBreakdown.complexity, 3)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <TrendingUp className="w-12 h-12 text-orange-400" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-blue-400" />
                            <div>
                                <div className="text-xs text-slate-400">Temps Mode B</div>
                                <div className="text-xl font-bold text-green-400">
                                    {safeFixed(safeNumber(benchmark.mode_b_time_ms, 0) / 1000, 1)}s
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Zap className="w-8 h-8 text-yellow-400" />
                            <div>
                                <div className="text-xs text-slate-400">Tokens Mode B</div>
                                <div className="text-xl font-bold text-green-400">
                                    {safeNumber(benchmark.mode_b_token_count, 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8 text-purple-400" />
                            <div>
                                <div className="text-xs text-slate-400">Rondes Débat</div>
                                <div className="text-xl font-bold text-green-400">
                                    {safeNumber(benchmark.mode_b_debate_rounds, 0)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Test Prompt */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-400 text-base">Prompt de Test</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                        {benchmark.test_prompt}
                    </p>
                </CardContent>
            </Card>

            {/* NEW: Qualitative Summary */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('qualitative')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            {expandedSections.qualitative ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Analyse Qualitative des Différences
                        </CardTitle>
                    </button>
                </CardHeader>
                {expandedSections.qualitative && (
                    <CardContent>
                        <QualitativeSummary benchmark={benchmark} />
                    </CardContent>
                )}
            </Card>

            {/* NEW: Enhanced Text Comparison with Diff View */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('comparison')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            {expandedSections.comparison ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Comparaison Détaillée des Réponses
                        </CardTitle>
                    </button>
                </CardHeader>
                {expandedSections.comparison && (
                    <CardContent>
                        <TextDiffView
                            textA={benchmark.mode_a_response || 'N/A'}
                            textB={benchmark.mode_b_response || 'N/A'}
                            labelA="Mode A - LLM Baseline"
                            labelB="Mode B - Neuronas Enhanced"
                        />
                    </CardContent>
                )}
            </Card>

            {/* Mode A Response */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('modeA')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-orange-400 text-base flex items-center gap-2">
                            {expandedSections.modeA ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Mode A - LLM Baseline
                        </CardTitle>
                        <Badge variant="outline" className="text-orange-400">
                            {safeFixed(safeNumber(benchmark.mode_a_time_ms, 0) / 1000, 1)}s
                        </Badge>
                    </button>
                </CardHeader>
                {expandedSections.modeA && (
                    <CardContent>
                        <ScrollArea className="h-48">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                {benchmark.mode_a_response || 'N/A'}
                            </p>
                        </ScrollArea>
                    </CardContent>
                )}
            </Card>

            {/* Mode B Response */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('modeB')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            {expandedSections.modeB ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Mode B - Neuronas Enhanced
                        </CardTitle>
                        <Badge variant="outline" className="text-green-400">
                            {safeFixed(safeNumber(benchmark.mode_b_time_ms, 0) / 1000, 1)}s
                        </Badge>
                    </button>
                </CardHeader>
                {expandedSections.modeB && (
                    <CardContent>
                        <ScrollArea className="h-48">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                {benchmark.mode_b_response || 'N/A'}
                            </p>
                        </ScrollArea>

                        {benchmark.mode_b_personas_used && benchmark.mode_b_personas_used.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-green-400" />
                                    <span className="text-sm font-medium text-green-400">Personas Utilisées</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {benchmark.mode_b_personas_used.map((persona, idx) => (
                                        <Badge key={idx} variant="outline" className="text-slate-300">
                                            {persona}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Quality Scores */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('quality')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            {expandedSections.quality ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            Scores de Qualité
                        </CardTitle>
                    </button>
                </CardHeader>
                {expandedSections.quality && (
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-orange-400 mb-2">Mode A</h4>
                                <div className="space-y-2">
                                    {quality.mode_a_ars_score !== undefined && quality.mode_a_ars_score !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">ARS Score:</span>
                                            <span className="text-orange-400 font-mono">{safeFixed(quality.mode_a_ars_score, 3)}</span>
                                        </div>
                                    )}
                                    {quality.semantic_fidelity_a !== undefined && quality.semantic_fidelity_a !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Semantic Fidelity:</span>
                                            <span className="text-orange-400 font-mono">{safeFixed(quality.semantic_fidelity_a, 3)}</span>
                                        </div>
                                    )}
                                    {quality.creativity_score_a !== undefined && quality.creativity_score_a !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Creativity:</span>
                                            <span className="text-orange-400 font-mono">{safeFixed(quality.creativity_score_a, 3)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-green-400 mb-2">Mode B</h4>
                                <div className="space-y-2">
                                    {quality.mode_b_ars_score !== undefined && quality.mode_b_ars_score !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">ARS Score:</span>
                                            <span className="text-green-400 font-mono">{safeFixed(quality.mode_b_ars_score, 3)}</span>
                                        </div>
                                    )}
                                    {quality.semantic_fidelity_b !== undefined && quality.semantic_fidelity_b !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Semantic Fidelity:</span>
                                            <span className="text-green-400 font-mono">{safeFixed(quality.semantic_fidelity_b, 3)}</span>
                                        </div>
                                    )}
                                    {quality.creativity_score_b !== undefined && quality.creativity_score_b !== null && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Creativity:</span>
                                            <span className="text-green-400 font-mono">{safeFixed(quality.creativity_score_b, 3)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Debug Logs - ALWAYS show if present */}
            {benchmark.full_debug_log && benchmark.full_debug_log.length > 0 && (
                <UnifiedLogViewer
                    logs={benchmark.full_debug_log}
                    title={`Logs Pipeline (${benchmark.full_debug_log.length} entrées)`}
                    showStats={true}
                    defaultExpanded={true}
                />
            )}

            {/* Notes */}
            {benchmark.notes && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                            {benchmark.notes}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Collaboration Tools */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <button
                        onClick={() => toggleSection('collaboration')}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <CardTitle className="text-green-400 text-base flex items-center gap-2">
                            {expandedSections.collaboration ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Users className="w-4 h-4" />
                            Collaboration & Discussion
                        </CardTitle>
                    </button>
                </CardHeader>
                {expandedSections.collaboration && (
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <CommentThread
                                    targetType="benchmark"
                                    targetId={benchmark.id}
                                    autoRefresh={true}
                                />
                            </div>
                            <div>
                                <AnnotationPanel
                                    targetType="benchmark"
                                    targetId={benchmark.id}
                                />
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}