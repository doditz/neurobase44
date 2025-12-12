
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Shield, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle,
    ChevronDown,
    ChevronRight,
    Search,
    FileCheck,
    Database, // New import
    Globe // New import
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SourcingConfidenceIndicator({ metadata }) {
    const [expanded, setExpanded] = useState(false);

    if (!metadata || metadata.sourcing_confidence === undefined) return null;

    const confidence = metadata.sourcing_confidence;
    const citations = metadata.citations || [];
    const unverifiedClaims = metadata.unverified_claims || [];
    const verificationResults = metadata.verification_results || [];
    
    // NEW: External sources
    const externalSources = citations.filter(c => c.external);
    const internalSources = citations.filter(c => !c.external);

    const getConfidenceLevel = () => {
        if (confidence >= 0.8) return {
            level: 'Haute',
            color: 'text-green-400',
            bg: 'bg-green-900/20',
            border: 'border-green-600',
            icon: CheckCircle2
        };
        if (confidence >= 0.5) return {
            level: 'Modérée',
            color: 'text-yellow-400',
            bg: 'bg-yellow-900/20',
            border: 'border-yellow-600',
            icon: AlertTriangle
        };
        return {
            level: 'Faible',
            color: 'text-red-400',
            bg: 'bg-red-900/20',
            border: 'border-red-600',
            icon: XCircle
        };
    };

    const confidenceInfo = getConfidenceLevel();
    const Icon = confidenceInfo.icon;

    return (
        <Card className={cn("mt-3 border-2", confidenceInfo.bg, confidenceInfo.border)}>
            <CardHeader className="pb-3">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <CardTitle className={cn("text-sm flex items-center gap-2", confidenceInfo.color)}>
                        <Shield className="w-4 h-4" />
                        Confiance des Sources
                        <Badge className={cn("ml-2", confidenceInfo.bg, confidenceInfo.color, "border", confidenceInfo.border)}>
                            {(confidence * 100).toFixed(0)}% - {confidenceInfo.level}
                        </Badge>
                    </CardTitle>
                    {expanded ? (
                        <ChevronDown className={cn("w-4 h-4", confidenceInfo.color)} />
                    ) : (
                        <ChevronRight className={cn("w-4 h-4", confidenceInfo.color)} />
                    )}
                </button>
            </CardHeader>

            {expanded && (
                <CardContent className="space-y-3 text-sm">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-700 rounded p-2">
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                <Search className="w-3 h-3" />
                                Recherche Web
                            </div>
                            <div className={cn("font-semibold", metadata.web_search_executed ? "text-green-400" : "text-red-400")}>
                                {metadata.web_search_executed ? 'Effectuée' : 'Non effectuée'}
                            </div>
                        </div>

                        <div className="bg-slate-700 rounded p-2">
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                <FileCheck className="w-3 h-3" />
                                Citations
                            </div>
                            <div className="font-semibold text-blue-400">
                                {citations.length} sources
                            </div>
                        </div>
                        
                        {/* NEW: External sources stats */}
                        {externalSources.length > 0 && (
                            <>
                                <div className="bg-slate-700 rounded p-2">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                        <Database className="w-3 h-3" />
                                        Sources Externes
                                    </div>
                                    <div className="font-semibold text-purple-400">
                                        {externalSources.length} bases
                                    </div>
                                </div>
                                
                                <div className="bg-slate-700 rounded p-2">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                        <Globe className="w-3 h-3" />
                                        Types de Sources
                                    </div>
                                    <div className="font-semibold text-cyan-400">
                                        {[...new Set(externalSources.map(s => s.source))].length} types
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* NEW: External Sources Breakdown */}
                    {externalSources.length > 0 && (
                        <div className="bg-purple-900/20 border border-purple-600/30 rounded p-3">
                            <h4 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                Bases de Connaissances Externes ({externalSources.length})
                            </h4>
                            <div className="space-y-1">
                                {[...new Set(externalSources.map(s => s.source))].map((sourceType, idx) => {
                                    const count = externalSources.filter(s => s.source === sourceType).length;
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="text-purple-300">{sourceType}</span>
                                            <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                                                {count} résultat{count > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Verification Results */}
                    {verificationResults.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                                <FileCheck className="w-3 h-3" />
                                Affirmations Vérifiées ({verificationResults.length})
                            </h4>
                            {verificationResults.map((result, idx) => (
                                <div key={idx} className="bg-slate-700 rounded p-2">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-xs text-slate-300 flex-1">
                                            {result.claim}
                                        </p>
                                        {result.verified ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-600 rounded-full h-1.5">
                                            <div
                                                className={cn(
                                                    "h-1.5 rounded-full",
                                                    result.verified ? "bg-green-500" : "bg-red-500"
                                                )}
                                                style={{ width: `${(result.confidence || 0) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {((result.confidence || 0) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    {result.contradictions && (
                                        <p className="text-xs text-red-400 mt-1">
                                            ⚠️ {result.contradictions}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Unverified Claims Warning */}
                    {unverifiedClaims.length > 0 && (
                        <div className="bg-orange-900/20 border border-orange-600/50 rounded p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="text-xs font-semibold text-orange-400 mb-2">
                                        Affirmations Non Vérifiées ({unverifiedClaims.length})
                                    </h4>
                                    <ul className="space-y-1 text-xs text-orange-300">
                                        {unverifiedClaims.slice(0, 3).map((claim, idx) => (
                                            <li key={idx}>• {claim}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Citations List */}
                    {citations.length > 0 && (
                        <div>
                            <h4 className="text-xs font-semibold text-slate-300 mb-2">
                                Sources Utilisées:
                            </h4>
                            <div className="space-y-1">
                                {citations.slice(0, 5).map((citation, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        {citation.verified ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                        )}
                                        <span className="text-slate-400 truncate">
                                            [{idx + 1}] {citation.context}
                                        </span>
                                    </div>
                                ))}
                                {citations.length > 5 && (
                                    <p className="text-xs text-slate-500">
                                        ... et {citations.length - 5} autres sources
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Updated: Confidence Explanation */}
                    <div className="text-xs text-slate-400 italic pt-2 border-t border-slate-700">
                        💡 La confiance des sources est calculée selon: recherche web effectuée, nombre de citations vérifiées, 
                        affirmations factuelles validées, bases de connaissances externes consultées, et absence de contradictions détectées.
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
