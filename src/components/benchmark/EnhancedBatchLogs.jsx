import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    Download,
    RefreshCw
} from 'lucide-react';

export default function EnhancedBatchLogs({ results = [], onRefresh }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('created');
    const [expandedLogs, setExpandedLogs] = useState({});

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(results.map(r => r.scenario_category).filter(Boolean));
        return ['all', ...Array.from(cats)];
    }, [results]);

    // Filter and search logs
    const filteredResults = useMemo(() => {
        let filtered = [...results];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.scenario_name?.toLowerCase().includes(query) ||
                r.test_prompt?.toLowerCase().includes(query) ||
                r.mode_a_response?.toLowerCase().includes(query) ||
                r.mode_b_response?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => {
                if (statusFilter === 'passed') return r.passed === true;
                if (statusFilter === 'failed') return r.passed === false;
                if (statusFilter === 'mode_b_wins') return r.winner === 'mode_b';
                if (statusFilter === 'mode_a_wins') return r.winner === 'mode_a';
                return true;
            });
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(r => r.scenario_category === categoryFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'spg_desc':
                    return (b.global_score_performance || 0) - (a.global_score_performance || 0);
                case 'spg_asc':
                    return (a.global_score_performance || 0) - (b.global_score_performance || 0);
                case 'time_desc':
                    return (b.mode_b_time_ms || 0) - (a.mode_b_time_ms || 0);
                case 'time_asc':
                    return (a.mode_b_time_ms || 0) - (b.mode_b_time_ms || 0);
                case 'created':
                default:
                    return new Date(b.created_date) - new Date(a.created_date);
            }
        });

        return filtered;
    }, [results, searchQuery, statusFilter, categoryFilter, sortBy]);

    const toggleLog = (id) => {
        setExpandedLogs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const exportLogs = () => {
        const data = JSON.stringify(filteredResults, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch_logs_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                        📋 Logs Détaillés ({filteredResults.length}/{results.length})
                    </CardTitle>
                    <div className="flex gap-2">
                        {onRefresh && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRefresh}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={exportLogs}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-slate-700 border-slate-600 text-slate-200"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="passed">✅ Réussis</SelectItem>
                            <SelectItem value="failed">❌ Échoués</SelectItem>
                            <SelectItem value="mode_b_wins">🏆 Mode B gagne</SelectItem>
                            <SelectItem value="mode_a_wins">Mode A gagne</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                    {cat === 'all' ? 'Toutes catégories' : cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Trier par" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="created">Plus récents</SelectItem>
                            <SelectItem value="spg_desc">SPG ↓</SelectItem>
                            <SelectItem value="spg_asc">SPG ↑</SelectItem>
                            <SelectItem value="time_desc">Temps ↓</SelectItem>
                            <SelectItem value="time_asc">Temps ↑</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                        {filteredResults.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                Aucun résultat trouvé
                            </div>
                        ) : (
                            filteredResults.map((result) => {
                                const isExpanded = expandedLogs[result.id];
                                const isSuccess = result.passed === true;
                                const modeBWins = result.winner === 'mode_b';

                                return (
                                    <div
                                        key={result.id}
                                        className={`border rounded-lg overflow-hidden ${
                                            isSuccess
                                                ? 'border-green-600/30 bg-green-900/10'
                                                : 'border-red-600/30 bg-red-900/10'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleLog(result.id)}
                                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}

                                                {isSuccess ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                )}

                                                <div className="flex-1 text-left">
                                                    <div className="text-sm text-slate-300 truncate">
                                                        {result.scenario_name}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 text-xs flex-wrap">
                                                        <Badge
                                                            className={
                                                                isSuccess ? 'bg-green-600' : 'bg-red-600'
                                                            }
                                                        >
                                                            {isSuccess ? 'PASS' : 'FAIL'}
                                                        </Badge>
                                                        {result.global_score_performance != null && (
                                                            <Badge variant="outline" className="text-green-400">
                                                                SPG: {result.global_score_performance.toFixed(3)}
                                                            </Badge>
                                                        )}
                                                        {result.mode_b_time_ms !== undefined && (
                                                            <Badge variant="outline" className="text-blue-400">
                                                                {result.mode_b_time_ms}ms
                                                            </Badge>
                                                        )}
                                                        <Badge
                                                            className={
                                                                modeBWins ? 'bg-green-900/50 text-green-400' : 'bg-orange-900/50 text-orange-400'
                                                            }
                                                        >
                                                            {modeBWins ? '🏆 B' : 'A'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-3 pb-3 pt-2 border-t border-slate-700 space-y-3">
                                                {result.scenario_category && (
                                                    <div className="text-xs">
                                                        <span className="text-slate-500">Catégorie: </span>
                                                        <Badge variant="outline">{result.scenario_category}</Badge>
                                                    </div>
                                                )}

                                                {result.test_prompt && (
                                                    <div className="text-xs">
                                                        <div className="text-slate-500 mb-1">Prompt:</div>
                                                        <div className="bg-slate-900/50 p-2 rounded text-slate-300">
                                                            {result.test_prompt}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3">
                                                    {result.mode_b_personas_used && result.mode_b_personas_used.length > 0 && (
                                                        <div className="text-xs">
                                                            <span className="text-slate-500">Personas: </span>
                                                            <span className="text-slate-300">{result.mode_b_personas_used.length}</span>
                                                        </div>
                                                    )}

                                                    {result.mode_b_debate_rounds !== undefined && (
                                                        <div className="text-xs">
                                                            <span className="text-slate-500">Rondes: </span>
                                                            <span className="text-slate-300">{result.mode_b_debate_rounds}</span>
                                                        </div>
                                                    )}

                                                    {result.mode_b_complexity_score != null && (
                                                        <div className="text-xs">
                                                            <span className="text-slate-500">Complexité: </span>
                                                            <span className="text-slate-300">
                                                                {(result.mode_b_complexity_score * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    )}

                                                    {result.cpu_savings_percentage != null && (
                                                        <div className="text-xs">
                                                            <span className="text-slate-500">CPU Save: </span>
                                                            <span className="text-green-400">
                                                                {result.cpu_savings_percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {result.quality_scores && (
                                                    <div className="text-xs">
                                                        <div className="text-slate-500 mb-2">Scores Qualité:</div>
                                                        <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-2 rounded">
                                                            <div>
                                                                <span className="text-orange-400">Mode A ARS: </span>
                                                                <span className="text-slate-300">
                                                                    {result.quality_scores.mode_a_ars_score?.toFixed(3) || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-green-400">Mode B ARS: </span>
                                                                <span className="text-slate-300">
                                                                    {result.quality_scores.mode_b_ars_score?.toFixed(3) || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {result.grader_rationale && (
                                                    <div className="text-xs">
                                                        <div className="text-slate-500 mb-1">Raisonnement Grader:</div>
                                                        <div className="bg-slate-900/50 p-2 rounded text-slate-300">
                                                            {result.grader_rationale}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-xs text-slate-500">
                                                    Créé: {new Date(result.created_date).toLocaleString('fr-FR')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}