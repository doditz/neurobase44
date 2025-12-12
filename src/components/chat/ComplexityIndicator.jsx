import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Zap, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Affiche les informations de complexité et d'activation du débat SMAS
 */
export default function ComplexityIndicator({ metadata }) {
    if (!metadata) return null;

    const complexity = metadata.complexity_score || metadata.smrce_scores?.complexity_score;
    const personasUsed = metadata.personas_used || metadata.personas_activated || [];
    const debateRounds = metadata.debate_rounds_executed || metadata.debate_rounds || 0;
    const smasActivated = metadata.smas_activated || debateRounds > 0;
    const d2Activation = metadata.d2_activation;

    // Déterminer le niveau de complexité
    const getComplexityLevel = (score) => {
        if (!score) return null;
        if (score < 0.3) return { level: 'simple', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-600' };
        if (score < 0.6) return { level: 'modéré', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-600' };
        if (score < 0.8) return { level: 'complexe', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-600' };
        return { level: 'très complexe', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-600' };
    };

    const complexityInfo = getComplexityLevel(complexity);

    if (!complexity && !smasActivated) return null;

    return (
        <Card className={cn(
            "border-2 mt-3",
            complexityInfo ? `${complexityInfo.bg} ${complexityInfo.border}` : "bg-slate-800 border-slate-600"
        )}>
            <CardContent className="p-3">
                <div className="flex items-start gap-3">
                    <Brain className={cn("w-5 h-5 mt-0.5", complexityInfo?.color || "text-slate-400")} />
                    
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-300">Analyse de Complexité</span>
                            
                            {complexity && (
                                <Badge className={cn(complexityInfo.bg, complexityInfo.color, "border", complexityInfo.border)}>
                                    Score: {(complexity * 100).toFixed(0)}%
                                </Badge>
                            )}
                            
                            {complexityInfo && (
                                <Badge variant="outline" className="border-slate-600 text-slate-300">
                                    Niveau: {complexityInfo.level}
                                </Badge>
                            )}
                        </div>

                        {/* SMAS Activation Status */}
                        {smasActivated ? (
                            <div className="flex items-center gap-2 text-sm">
                                <Zap className="w-4 h-4 text-orange-400" />
                                <span className="text-orange-400 font-medium">Débat SMAS activé</span>
                                
                                {personasUsed.length > 0 && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <Users className="w-3 h-3 text-blue-400" />
                                        <span className="text-blue-400">{personasUsed.length} personas</span>
                                        {personasUsed.length < 3 && (
                                            <AlertCircle className="w-3 h-3 text-yellow-400 ml-1" title="Minimum recommandé: 3 personas" />
                                        )}
                                    </div>
                                )}
                                
                                {debateRounds > 0 && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <TrendingUp className="w-3 h-3 text-green-400" />
                                        <span className="text-green-400">{debateRounds} rondes</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>Réponse directe (seuil de complexité non atteint)</span>
                            </div>
                        )}

                        {/* D2 Activation */}
                        {d2Activation !== undefined && (
                            <div className="text-xs text-slate-400">
                                D2 Activation: {(d2Activation * 100).toFixed(0)}%
                                {d2Activation > 0.7 && <span className="text-orange-400 ml-1">(Haute intensité)</span>}
                            </div>
                        )}

                        {/* Personas List */}
                        {personasUsed.length > 0 && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                                    Voir les personas ({personasUsed.length})
                                </summary>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {personasUsed.map((persona, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs border-slate-600">
                                            {persona}
                                        </Badge>
                                    ))}
                                </div>
                            </details>
                        )}

                        {/* Complexity Threshold Info */}
                        {complexity && complexity < 0.3 && !smasActivated && (
                            <div className="text-xs text-slate-500 italic">
                                💡 Question simple détectée - réponse optimisée sans débat multi-personas
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}