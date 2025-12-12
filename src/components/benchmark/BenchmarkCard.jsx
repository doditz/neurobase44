
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Clock, Zap, Brain, TrendingUp, Trophy, 
    Download, Eye, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function BenchmarkCard({ 
    benchmark, 
    onView,
    onDownload,
    isSelected = false,
    showCategory = true 
}) {
    const spg = benchmark.global_score_performance || 0;
    const improvement = benchmark.performance_improvement || 0;
    const winner = benchmark.winner;
    const timeAgo = formatDistanceToNow(new Date(benchmark.created_date), {
        addSuffix: true,
        locale: fr
    });

    const getCategoryColor = (category) => {
        const colors = {
            creative: 'bg-purple-600',
            analytical: 'bg-blue-600',
            ethical: 'bg-green-600',
            technical: 'bg-orange-600',
            cultural: 'bg-pink-600',
            suno_music: 'bg-indigo-600',
            neuronas_specific: 'bg-cyan-600'
        };
        return colors[category] || 'bg-slate-600';
    };

    const getWinnerBadge = () => {
        if (winner === 'mode_b') {
            return <Badge className="bg-green-600"><Trophy className="w-3 h-3 mr-1" />Neuronas</Badge>;
        }
        if (winner === 'mode_a') {
            return <Badge className="bg-red-600"><AlertCircle className="w-3 h-3 mr-1" />Baseline</Badge>;
        }
        return <Badge variant="outline">Égalité</Badge>;
    };

    return (
        <div 
            className={`bg-slate-700/50 rounded-lg p-4 border transition-all hover:bg-slate-700 hover:border-slate-500 ${
                isSelected ? 'border-orange-600 bg-orange-900/20' : 'border-slate-600'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                {/* LEFT: Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-green-300 truncate">
                            {benchmark.scenario_name || benchmark.test_prompt?.substring(0, 50) + '...' || 'Sans nom'}
                        </h3>
                        
                        {showCategory && benchmark.scenario_category && (
                            <Badge className={`${getCategoryColor(benchmark.scenario_category)} text-xs`}>
                                {benchmark.scenario_category}
                            </Badge>
                        )}
                        
                        {getWinnerBadge()}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo}
                        </span>
                        
                        {benchmark.mode_b_time_ms && (
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {(benchmark.mode_b_time_ms / 1000).toFixed(1)}s
                            </span>
                        )}
                        
                        {benchmark.mode_b_debate_rounds && (
                            <span className="flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                {benchmark.mode_b_debate_rounds} rondes
                            </span>
                        )}

                        {improvement !== 0 && (
                            <span className={`flex items-center gap-1 font-medium ${
                                improvement > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                                <TrendingUp className="w-3 h-3" />
                                {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT: Metrics + Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* SPG Score */}
                    {spg > 0 && (
                        <div className="text-right">
                            <div className="text-xs text-slate-400">SPG</div>
                            <div className="text-lg font-bold text-orange-400">
                                {spg.toFixed(3)}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        {onView && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onView(benchmark)}
                                className="bg-slate-800 border-slate-600 text-green-300 hover:bg-slate-700"
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                Détails
                            </Button>
                        )}
                        
                        {onDownload && (
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDownload(benchmark, 'json')}
                                    className="bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700 px-2"
                                    title="JSON"
                                >
                                    <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDownload(benchmark, 'md')}
                                    className="bg-slate-800 border-slate-600 text-purple-300 hover:bg-slate-700 px-2"
                                    title="Markdown"
                                >
                                    MD
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDownload(benchmark, 'txt')}
                                    className="bg-slate-800 border-slate-600 text-yellow-300 hover:bg-slate-700 px-2"
                                    title="TXT"
                                >
                                    TXT
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
