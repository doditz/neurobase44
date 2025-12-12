import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    Brain,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    Users,
    Target,
    Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DebateAnalysisDisplay({ analysis }) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    if (!analysis) return null;

    const qualityColor = analysis.debate_quality_score >= 0.8 ? 'text-green-400' 
        : analysis.debate_quality_score >= 0.6 ? 'text-yellow-400' 
        : 'text-red-400';

    return (
        <Card className="mt-3 bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Brain className="w-4 h-4" />
                        Analyse du Débat SMAS
                    </CardTitle>
                    <Badge className={cn("text-xs", qualityColor, "border", "border-current")}>
                        Qualité: {(analysis.debate_quality_score * 100).toFixed(0)}%
                    </Badge>
                </button>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-4">
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-slate-700">
                        {[
                            { id: 'overview', label: 'Vue d\'ensemble', icon: Target },
                            { id: 'arguments', label: 'Arguments', icon: Lightbulb },
                            { id: 'fallacies', label: 'Fallacies', icon: AlertTriangle },
                            { id: 'consensus', label: 'Consensus', icon: CheckCircle2 },
                            { id: 'personas', label: 'Personas', icon: Users }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                                        activeTab === tab.id
                                            ? "border-purple-500 text-purple-400"
                                            : "border-transparent text-slate-400 hover:text-slate-300"
                                    )}
                                >
                                    <Icon className="w-3 h-3" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-700 rounded p-3">
                                    <div className="text-xs text-slate-400 mb-1">Qualité Débat</div>
                                    <div className={cn("text-2xl font-bold", qualityColor)}>
                                        {(analysis.debate_quality_score * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="bg-slate-700 rounded p-3">
                                    <div className="text-xs text-slate-400 mb-1">Diversité Args</div>
                                    <div className="text-2xl font-bold text-blue-400">
                                        {(analysis.argument_diversity_score * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="bg-slate-700 rounded p-3">
                                    <div className="text-xs text-slate-400 mb-1">Profondeur</div>
                                    <div className="text-2xl font-bold text-indigo-400">
                                        {(analysis.reasoning_depth_score * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-700 rounded p-4">
                                <h4 className="text-sm font-semibold text-purple-400 mb-2">Résumé</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {analysis.overall_summary}
                                </p>
                            </div>

                            {analysis.recommendations && analysis.recommendations.length > 0 && (
                                <div className="bg-blue-900/20 border border-blue-600/30 rounded p-4">
                                    <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4" />
                                        Recommandations
                                    </h4>
                                    <ul className="space-y-1 text-sm text-blue-300">
                                        {analysis.recommendations.map((rec, idx) => (
                                            <li key={idx}>• {rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Arguments Tab */}
                    {activeTab === 'arguments' && (
                        <div className="space-y-3">
                            {analysis.key_arguments && analysis.key_arguments.length > 0 ? (
                                analysis.key_arguments.map((arg, idx) => (
                                    <div key={idx} className="bg-slate-700 rounded p-3">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                                                {arg.persona}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3 text-green-400" />
                                                <span className="text-xs text-green-400">
                                                    {(arg.strength_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-300 mb-2">{arg.argument}</p>
                                        {arg.supporting_evidence && (
                                            <p className="text-xs text-slate-400 italic">
                                                Support: {arg.supporting_evidence}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">
                                    Aucun argument clé identifié
                                </p>
                            )}
                        </div>
                    )}

                    {/* Fallacies Tab */}
                    {activeTab === 'fallacies' && (
                        <div className="space-y-3">
                            {analysis.logical_fallacies_detected && analysis.logical_fallacies_detected.length > 0 ? (
                                analysis.logical_fallacies_detected.map((fallacy, idx) => {
                                    const severityColor = fallacy.severity === 'major' ? 'text-red-400'
                                        : fallacy.severity === 'moderate' ? 'text-orange-400'
                                        : 'text-yellow-400';
                                    
                                    return (
                                        <div key={idx} className="bg-red-900/20 border border-red-600/30 rounded p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <Badge className="text-xs bg-red-600">
                                                    {fallacy.fallacy_type.replace(/_/g, ' ')}
                                                </Badge>
                                                <span className={cn("text-xs font-semibold", severityColor)}>
                                                    {fallacy.severity}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mb-1">
                                                Persona: <span className="text-slate-300">{fallacy.persona}</span>
                                            </p>
                                            <p className="text-sm text-red-300 mb-2 italic">
                                                "{fallacy.excerpt}"
                                            </p>
                                            <p className="text-xs text-slate-300">
                                                {fallacy.explanation}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="bg-green-900/20 border border-green-600/30 rounded p-4 text-center">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                    <p className="text-sm text-green-300">
                                        Aucune fallacy logique détectée ✓
                                    </p>
                                </div>
                            )}

                            {analysis.unsupported_claims && analysis.unsupported_claims.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-orange-400 mb-2">
                                        Affirmations Non Supportées ({analysis.unsupported_claims.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {analysis.unsupported_claims.map((claim, idx) => (
                                            <div key={idx} className="bg-orange-900/20 border border-orange-600/30 rounded p-2">
                                                <p className="text-xs text-slate-400 mb-1">
                                                    {claim.persona} - {claim.confidence_level}
                                                </p>
                                                <p className="text-sm text-orange-300">"{claim.claim}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Consensus Tab */}
                    {activeTab === 'consensus' && (
                        <div className="space-y-4">
                            {analysis.consensus_points && analysis.consensus_points.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Points de Consensus ({analysis.consensus_points.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {analysis.consensus_points.map((point, idx) => (
                                            <div key={idx} className="bg-green-900/20 border border-green-600/30 rounded p-3 flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-green-300">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.disagreement_points && analysis.disagreement_points.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Points de Désaccord ({analysis.disagreement_points.length})
                                    </h4>
                                    <div className="space-y-3">
                                        {analysis.disagreement_points.map((point, idx) => (
                                            <div key={idx} className="bg-orange-900/20 border border-orange-600/30 rounded p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="text-sm font-medium text-orange-300">
                                                        {point.topic}
                                                    </h5>
                                                    {point.resolution_achieved ? (
                                                        <Badge className="text-xs bg-green-600">Résolu</Badge>
                                                    ) : (
                                                        <Badge className="text-xs bg-red-600">Non résolu</Badge>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {point.positions && point.positions.map((pos, pIdx) => (
                                                        <div key={pIdx} className="text-xs text-slate-300">
                                                            <span className="text-purple-400">{pos.persona}:</span> {pos.position}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Personas Tab */}
                    {activeTab === 'personas' && (
                        <div className="space-y-3">
                            {analysis.persona_contributions && analysis.persona_contributions.length > 0 ? (
                                analysis.persona_contributions.map((contrib, idx) => (
                                    <div key={idx} className="bg-slate-700 rounded p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h5 className="text-sm font-semibold text-purple-400">
                                                {contrib.persona_name}
                                            </h5>
                                            <Badge variant="outline" className="text-xs border-purple-500">
                                                Qualité: {(contrib.contribution_quality * 100).toFixed(0)}%
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-400">Insights uniques:</span>{' '}
                                                <span className="text-blue-400 font-semibold">{contrib.unique_insights}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Interaction:</span>{' '}
                                                <span className="text-green-400 font-semibold">
                                                    {(contrib.interaction_quality * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">
                                    Aucune contribution de persona disponible
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}