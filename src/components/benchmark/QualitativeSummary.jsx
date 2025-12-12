import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, 
    TrendingDown, 
    Minus,
    Brain,
    Zap,
    FileText,
    Target,
    Lightbulb,
    Shield
} from 'lucide-react';

const safeNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || isNaN(value)) return fallback;
    return Number(value);
};

export default function QualitativeSummary({ benchmark }) {
    const analysis = useMemo(() => {
        if (!benchmark) return null;
        
        const quality = benchmark.quality_scores || {};
        const modeATime = safeNumber(benchmark.mode_a_time_ms, 0);
        const modeBTime = safeNumber(benchmark.mode_b_time_ms, 0);
        const modeATokens = safeNumber(benchmark.mode_a_token_count, 0);
        const modeBTokens = safeNumber(benchmark.mode_b_token_count, 0);
        
        const modeA_ARS = safeNumber(quality.mode_a_ars_score, 0);
        const modeB_ARS = safeNumber(quality.mode_b_ars_score, 0);
        
        const timeImprovement = modeATime > 0 ? ((modeATime - modeBTime) / modeATime * 100) : 0;
        const tokenImprovement = modeATokens > 0 ? ((modeATokens - modeBTokens) / modeATokens * 100) : 0;
        const qualityImprovement = modeA_ARS > 0 ? ((modeB_ARS - modeA_ARS) / modeA_ARS * 100) : 0;
        
        const lengthA = (benchmark.mode_a_response || '').length;
        const lengthB = (benchmark.mode_b_response || '').length;
        const lengthDiff = lengthB - lengthA;
        const lengthDiffPercent = lengthA > 0 ? (lengthDiff / lengthA * 100) : 0;
        
        const insights = [];
        
        // Quality insights
        if (qualityImprovement > 10) {
            insights.push({
                type: 'quality_gain',
                icon: TrendingUp,
                color: 'text-green-400',
                title: 'Amélioration Qualité Significative',
                description: `Mode B démontre ${qualityImprovement.toFixed(1)}% d'amélioration en qualité ARS, indiquant une réponse plus complète et nuancée.`
            });
        } else if (qualityImprovement < -5) {
            insights.push({
                type: 'quality_loss',
                icon: TrendingDown,
                color: 'text-orange-400',
                title: 'Légère Régression Qualité',
                description: `Mode B montre ${Math.abs(qualityImprovement).toFixed(1)}% de baisse en qualité, possiblement dû à une sur-optimisation pour l'efficacité.`
            });
        } else {
            insights.push({
                type: 'quality_stable',
                icon: Minus,
                color: 'text-blue-400',
                title: 'Qualité Maintenue',
                description: `Qualité similaire entre les deux modes (variation de ${qualityImprovement.toFixed(1)}%), démontrant une optimisation équilibrée.`
            });
        }
        
        // Efficiency insights
        if (tokenImprovement > 30) {
            insights.push({
                type: 'efficiency_high',
                icon: Zap,
                color: 'text-yellow-400',
                title: 'Optimisation Tokens Excellente',
                description: `Réduction de ${tokenImprovement.toFixed(1)}% des tokens, résultant en des économies de coût substantielles sans compromettre la qualité.`
            });
        } else if (tokenImprovement > 10) {
            insights.push({
                type: 'efficiency_moderate',
                icon: Zap,
                color: 'text-blue-400',
                title: 'Optimisation Tokens Modérée',
                description: `Réduction de ${tokenImprovement.toFixed(1)}% des tokens, offrant un bon équilibre entre coût et performance.`
            });
        } else if (tokenImprovement < -10) {
            insights.push({
                type: 'efficiency_concern',
                icon: Zap,
                color: 'text-red-400',
                title: 'Augmentation de Consommation',
                description: `Mode B utilise ${Math.abs(tokenImprovement).toFixed(1)}% plus de tokens, suggérant une réponse plus détaillée mais potentiellement moins optimisée.`
            });
        }
        
        // Length analysis
        if (lengthDiffPercent > 50) {
            insights.push({
                type: 'length_verbose',
                icon: FileText,
                color: 'text-purple-400',
                title: 'Réponse Plus Détaillée',
                description: `Mode B produit ${lengthDiffPercent.toFixed(0)}% plus de contenu, offrant potentiellement plus de contexte et d'explications.`
            });
        } else if (lengthDiffPercent < -30) {
            insights.push({
                type: 'length_concise',
                icon: Target,
                color: 'text-indigo-400',
                title: 'Réponse Plus Concise',
                description: `Mode B est ${Math.abs(lengthDiffPercent).toFixed(0)}% plus court, privilégiant la concision tout en maintenant la qualité.`
            });
        }
        
        // Creativity analysis
        const creativityA = safeNumber(quality.creativity_score_a, 0);
        const creativityB = safeNumber(quality.creativity_score_b, 0);
        const creativityDiff = creativityB - creativityA;
        
        if (creativityDiff > 0.1) {
            insights.push({
                type: 'creativity_gain',
                icon: Lightbulb,
                color: 'text-pink-400',
                title: 'Créativité Améliorée',
                description: `Mode B démontre ${(creativityDiff * 100).toFixed(1)}% plus de créativité, apportant des perspectives originales et innovantes.`
            });
        }
        
        // Ethics analysis
        const ethicsA = safeNumber(quality.ethics_score_a, 0);
        const ethicsB = safeNumber(quality.ethics_score_b, 0);
        
        if (ethicsB > 0.85) {
            insights.push({
                type: 'ethics_strong',
                icon: Shield,
                color: 'text-green-400',
                title: 'Considérations Éthiques Solides',
                description: `Mode B maintient un score éthique élevé de ${(ethicsB * 100).toFixed(1)}%, démontrant un raisonnement responsable.`
            });
        }
        
        // Overall assessment
        let overallVerdict = '';
        let verdictColor = '';
        
        if (qualityImprovement > 5 && tokenImprovement > 20) {
            overallVerdict = 'Sweet Spot Atteint';
            verdictColor = 'text-green-400 bg-green-900/20 border-green-600';
        } else if (qualityImprovement > 0 && tokenImprovement > 0) {
            overallVerdict = 'Optimisation Réussie';
            verdictColor = 'text-blue-400 bg-blue-900/20 border-blue-600';
        } else if (qualityImprovement > 10) {
            overallVerdict = 'Qualité Priorisée';
            verdictColor = 'text-purple-400 bg-purple-900/20 border-purple-600';
        } else if (tokenImprovement > 30) {
            overallVerdict = 'Efficacité Priorisée';
            verdictColor = 'text-yellow-400 bg-yellow-900/20 border-yellow-600';
        } else {
            overallVerdict = 'Performance Standard';
            verdictColor = 'text-slate-400 bg-slate-900/20 border-slate-600';
        }
        
        return {
            insights,
            overallVerdict,
            verdictColor,
            metrics: {
                qualityImprovement,
                tokenImprovement,
                timeImprovement,
                lengthDiffPercent
            }
        };
    }, [benchmark]);
    
    if (!analysis) return null;
    
    return (
        <div className="space-y-4">
            {/* Overall Verdict */}
            <Card className={`${analysis.verdictColor} border-2`}>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <Brain className="w-10 h-10" />
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2">{analysis.overallVerdict}</h3>
                            <div className="flex flex-wrap gap-3">
                                <Badge variant="outline" className="border-current">
                                    Qualité: {analysis.metrics.qualityImprovement > 0 ? '+' : ''}
                                    {analysis.metrics.qualityImprovement.toFixed(1)}%
                                </Badge>
                                <Badge variant="outline" className="border-current">
                                    Tokens: {analysis.metrics.tokenImprovement > 0 ? '-' : '+'}
                                    {Math.abs(analysis.metrics.tokenImprovement).toFixed(1)}%
                                </Badge>
                                <Badge variant="outline" className="border-current">
                                    Longueur: {analysis.metrics.lengthDiffPercent > 0 ? '+' : ''}
                                    {analysis.metrics.lengthDiffPercent.toFixed(0)}%
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Detailed Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.insights.map((insight, idx) => {
                    const Icon = insight.icon;
                    return (
                        <Card key={idx} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${insight.color}`} />
                                    <span className={insight.color}>{insight.title}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    {insight.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}