import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { contentToVisualProps } from '@/components/utils/DeterministicHash';

export default function DebateFlowVisualization({ debateHistory = [], personas = [], currentRound = 0 }) {
    const visualData = useMemo(() => {
        if (!debateHistory.length) return [];

        return debateHistory.map((entry, index) => {
            const personaName = entry.persona || 'Unknown';
            const response = entry.response || '';
            
            // Generate deterministic visual properties
            const props = contentToVisualProps(personaName + response.substring(0, 100), index, debateHistory.length);
            
            // Calculate sentiment score (simple heuristic)
            const positiveWords = (response.match(/excellent|bon|bien|oui|correct|d'accord|parfait|bravo/gi) || []).length;
            const negativeWords = (response.match(/non|incorrect|erreur|mauvais|faux|problème|attention|cependant/gi) || []).length;
            const sentiment = positiveWords > negativeWords ? 'positive' : negativeWords > positiveWords ? 'critical' : 'neutral';
            
            // Calculate confidence (based on word count and assertive language)
            const wordCount = response.split(/\s+/).length;
            const assertiveWords = (response.match(/certainement|clairement|évidemment|absolument|définitivement|sans doute/gi) || []).length;
            const confidence = Math.min(1, (wordCount / 200) + (assertiveWords * 0.1));
            
            return {
                ...entry,
                color: props.color,
                size: Math.max(40, Math.min(80, 40 + (confidence * 40))),
                sentiment,
                confidence,
                wordCount
            };
        });
    }, [debateHistory]);

    const groupedByRound = useMemo(() => {
        const groups = {};
        visualData.forEach(entry => {
            const round = entry.round || 1;
            if (!groups[round]) groups[round] = [];
            groups[round].push(entry);
        });
        return groups;
    }, [visualData]);

    const sentimentColors = {
        positive: 'bg-green-900/30 border-green-600/50 text-green-400',
        critical: 'bg-orange-900/30 border-orange-600/50 text-orange-400',
        neutral: 'bg-slate-700 border-slate-600 text-slate-300'
    };

    if (!debateHistory.length) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                    <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Le débat des personas s'affichera ici en temps réel</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700 overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-green-400 flex items-center gap-2 text-base">
                    <MessageSquare className="w-4 h-4" />
                    Flux de Débat en Temps Réel
                    <Badge variant="outline" className="ml-auto text-xs">
                        {debateHistory.length} interventions
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(groupedByRound).map(([round, entries]) => (
                    <div key={round} className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-900/30 text-blue-400 border-blue-600/50">
                                Ronde {round}
                            </Badge>
                            {parseInt(round) === currentRound && (
                                <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            {entries.map((entry, idx) => (
                                <div 
                                    key={idx}
                                    className={`relative p-3 rounded-lg border ${sentimentColors[entry.sentiment]} transition-all hover:scale-[1.02]`}
                                    style={{
                                        borderLeftWidth: `${Math.max(2, entry.confidence * 6)}px`,
                                        borderLeftColor: entry.color
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div 
                                                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-slate-800"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="font-semibold text-sm truncate" style={{ color: entry.color }}>
                                                {entry.persona}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {entry.sentiment === 'positive' && (
                                                <Badge variant="outline" className="bg-green-900/30 border-green-600/50 text-green-400 text-xs">
                                                    ✓ Accord
                                                </Badge>
                                            )}
                                            {entry.sentiment === 'critical' && (
                                                <Badge variant="outline" className="bg-orange-900/30 border-orange-600/50 text-orange-400 text-xs">
                                                    ⚠ Critique
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs">
                                                {entry.wordCount} mots
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                        {entry.response?.substring(0, 150)}...
                                    </p>
                                    
                                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            Confiance: {(entry.confidence * 100).toFixed(0)}%
                                        </div>
                                        {entry.time_ms && (
                                            <div>
                                                {(entry.time_ms / 1000).toFixed(1)}s
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}