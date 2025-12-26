import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
    Play, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
    Zap, TrendingUp, TrendingDown, Minus, Target, Settings, Activity,
    FileJson, FlaskConical, Brain, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Analyse dry-run de chaque stratégie d'optimisation
 * Simule l'application sans modifier les vrais paramètres
 */
export default function StrategyDryRunAnalyzer() {
    const [strategies, setStrategies] = useState([]);
    const [tunableParams, setTunableParams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [currentStrategy, setCurrentStrategy] = useState(null);
    const [analysisResults, setAnalysisResults] = useState({});
    const [expandedStrategies, setExpandedStrategies] = useState({});
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [strats, params] = await Promise.all([
                base44.entities.OptimizationStrategy.list('-priority_level', 100),
                base44.entities.TunableParameter.list()
            ]);
            setStrategies(strats);
            setTunableParams(params);
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Analyse dry-run d'une stratégie spécifique
     */
    const analyzeStrategy = async (strategy) => {
        const result = {
            strategy_id: strategy.id,
            strategy_name: strategy.strategy_name,
            timestamp: new Date().toISOString(),
            status: 'analyzing',
            analysis: {},
            recommendations: [],
            simulated_changes: [],
            impact_assessment: {},
            warnings: [],
            score: 0
        };

        try {
            // 1. Vérifier les paramètres associés
            const associatedParams = strategy.associated_tunable_params || [];
            const matchedParams = tunableParams.filter(p => 
                associatedParams.includes(p.parameter_name)
            );
            const missingParams = associatedParams.filter(pname => 
                !tunableParams.find(p => p.parameter_name === pname)
            );

            result.analysis.associated_params = {
                expected: associatedParams,
                found: matchedParams.map(p => p.parameter_name),
                missing: missingParams,
                coverage: associatedParams.length > 0 
                    ? (matchedParams.length / associatedParams.length) * 100 
                    : 100
            };

            if (missingParams.length > 0) {
                result.warnings.push(`${missingParams.length} paramètre(s) manquant(s): ${missingParams.join(', ')}`);
            }

            // 2. Simuler les changements de paramètres
            const currentConfig = {};
            tunableParams.forEach(p => {
                currentConfig[p.parameter_name] = p.current_value;
            });

            result.simulated_changes = matchedParams.map(param => {
                const currentVal = param.current_value;
                let simulatedVal = currentVal;
                let changeReason = '';

                // Simuler selon le type de stratégie
                if (strategy.strategy_type === 'compression') {
                    if (param.parameter_name.toLowerCase().includes('compression')) {
                        simulatedVal = Math.min(param.max_bound, currentVal * 1.2);
                        changeReason = 'Augmentation compression pour réduire tokens';
                    }
                } else if (strategy.strategy_type === 'context_aware') {
                    if (param.parameter_name === 'debateRounds') {
                        simulatedVal = Math.max(param.min_bound, currentVal - 1);
                        changeReason = 'Réduction rondes selon complexité';
                    } else if (param.parameter_name === 'maxPersonas') {
                        simulatedVal = Math.max(param.min_bound, Math.min(5, currentVal));
                        changeReason = 'Optimisation nombre de personas';
                    }
                } else if (strategy.strategy_type === 'model_cascading') {
                    if (param.parameter_name === 'temperature') {
                        simulatedVal = Math.max(param.min_bound, currentVal * 0.9);
                        changeReason = 'Réduction température pour latence';
                    }
                } else if (strategy.strategy_type === 'hybrid') {
                    // Sweet spot balanced
                    if (param.parameter_name === 'semanticCompressionRatio') {
                        simulatedVal = 0.45;
                        changeReason = 'Sweet spot compression';
                    } else if (param.parameter_name === 'maxPersonas') {
                        simulatedVal = 5;
                        changeReason = 'Sweet spot personas';
                    } else if (param.parameter_name === 'debateRounds') {
                        simulatedVal = 2;
                        changeReason = 'Sweet spot débat';
                    }
                }

                const change = simulatedVal - currentVal;
                const changePercent = currentVal !== 0 ? (change / currentVal) * 100 : 0;

                return {
                    param_name: param.parameter_name,
                    current_value: currentVal,
                    simulated_value: simulatedVal,
                    change: change,
                    change_percent: changePercent,
                    bounds: [param.min_bound, param.max_bound],
                    within_bounds: simulatedVal >= param.min_bound && simulatedVal <= param.max_bound,
                    reason: changeReason,
                    impact_quality: param.impact_on_quality,
                    impact_cost: param.impact_on_cost
                };
            });

            // 3. Évaluer l'impact
            const qualityImpacts = { high: 3, medium: 2, low: 1 };
            const costImpacts = { high: 3, medium: 2, low: 1 };
            
            let totalQualityRisk = 0;
            let totalCostBenefit = 0;
            
            result.simulated_changes.forEach(change => {
                if (change.change !== 0) {
                    totalQualityRisk += qualityImpacts[change.impact_quality] || 1;
                    totalCostBenefit += costImpacts[change.impact_cost] || 1;
                }
            });

            result.impact_assessment = {
                expected_token_reduction: strategy.strategy_type === 'compression' ? '30-50%' : 
                                          strategy.strategy_type === 'context_aware' ? '20-40%' :
                                          strategy.strategy_type === 'hybrid' ? '40-60%' : '10-30%',
                expected_latency_change: strategy.cost_impact === 'reduces_cost' ? '-20 à -40%' : '±10%',
                quality_risk_score: totalQualityRisk,
                cost_benefit_score: totalCostBenefit,
                risk_level: totalQualityRisk > 6 ? 'high' : totalQualityRisk > 3 ? 'medium' : 'low',
                recommendation: strategy.quality_impact === 'improves_quality' ? 'RECOMMANDÉ' :
                               strategy.quality_impact === 'maintains_quality' ? 'SAFE' : 'ATTENTION'
            };

            // 4. Vérifier conditions d'activation
            result.analysis.activation_conditions = {
                conditions: strategy.activation_conditions || {},
                currently_met: evaluateActivationConditions(strategy.activation_conditions, currentConfig),
                description: describeActivationConditions(strategy.activation_conditions)
            };

            // 5. Générer recommandations
            result.recommendations = generateRecommendations(strategy, result);

            // 6. Calculer score global
            let score = 50; // Base score
            score += strategy.priority_level * 3; // Max +30
            score += result.analysis.associated_params.coverage * 0.2; // Max +20
            score -= result.warnings.length * 5; // -5 par warning
            score += result.impact_assessment.cost_benefit_score * 2;
            score -= result.impact_assessment.quality_risk_score;
            
            result.score = Math.max(0, Math.min(100, Math.round(score)));
            result.status = 'completed';

        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            result.warnings.push(`Erreur d'analyse: ${error.message}`);
        }

        return result;
    };

    const evaluateActivationConditions = (conditions, config) => {
        if (!conditions) return true;
        if (conditions.always_active) return true;
        
        // Simplified evaluation
        if (conditions.spg_below && config.global_spg >= conditions.spg_below) return false;
        if (conditions.complexity_score_below && config.complexity >= conditions.complexity_score_below) return false;
        
        return true;
    };

    const describeActivationConditions = (conditions) => {
        if (!conditions) return 'Aucune condition spécifique';
        if (conditions.always_active) return 'Toujours actif';
        
        const parts = [];
        if (conditions.spg_below) parts.push(`SPG < ${conditions.spg_below}`);
        if (conditions.complexity_score_below) parts.push(`Complexité < ${conditions.complexity_score_below}`);
        if (conditions.time_above_ms) parts.push(`Temps > ${conditions.time_above_ms}ms`);
        if (conditions.uses_complexity_score) parts.push('Utilise score complexité');
        if (conditions.quality_floor) parts.push(`Qualité min: ${conditions.quality_floor}`);
        
        return parts.length > 0 ? parts.join(', ') : 'Conditions complexes';
    };

    const generateRecommendations = (strategy, result) => {
        const recs = [];
        
        if (result.analysis.associated_params.missing.length > 0) {
            recs.push({
                type: 'warning',
                text: `Créer les paramètres manquants: ${result.analysis.associated_params.missing.join(', ')}`
            });
        }
        
        if (strategy.priority_level >= 9) {
            recs.push({
                type: 'info',
                text: 'Stratégie haute priorité - Recommandée pour tests fréquents'
            });
        }
        
        if (strategy.quality_impact === 'slight_quality_tradeoff') {
            recs.push({
                type: 'caution',
                text: 'Cette stratégie peut légèrement impacter la qualité. Monitorer ARS.'
            });
        }
        
        if (strategy.cost_impact === 'reduces_cost') {
            recs.push({
                type: 'success',
                text: `Économies attendues: ${strategy.expected_improvement_range || '20-40%'}`
            });
        }
        
        return recs;
    };

    /**
     * Analyser toutes les stratégies en séquence
     */
    const runFullAnalysis = async () => {
        setAnalyzing(true);
        setProgress(0);
        const results = {};

        for (let i = 0; i < strategies.length; i++) {
            const strategy = strategies[i];
            setCurrentStrategy(strategy.strategy_name);
            
            const result = await analyzeStrategy(strategy);
            results[strategy.id] = result;
            
            setAnalysisResults({ ...results });
            setProgress(((i + 1) / strategies.length) * 100);
            
            // Petit délai pour UI responsive
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setCurrentStrategy(null);
        setAnalyzing(false);
        toast.success(`Analyse terminée: ${strategies.length} stratégies`);
    };

    /**
     * Analyser une seule stratégie
     */
    const runSingleAnalysis = async (strategy) => {
        setCurrentStrategy(strategy.strategy_name);
        const result = await analyzeStrategy(strategy);
        setAnalysisResults(prev => ({ ...prev, [strategy.id]: result }));
        setCurrentStrategy(null);
        toast.success(`Analyse "${strategy.strategy_name}" terminée`);
    };

    const toggleExpand = (id) => {
        setExpandedStrategies(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBadge = (score) => {
        if (score >= 80) return 'bg-green-600';
        if (score >= 60) return 'bg-yellow-600';
        if (score >= 40) return 'bg-orange-600';
        return 'bg-red-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-300 flex items-center gap-2">
                        <FlaskConical className="w-5 h-5" />
                        Analyse Dry-Run des Stratégies ({strategies.length})
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Simulation d'impact sans modification réelle des paramètres
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={runFullAnalysis}
                            disabled={analyzing}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyse en cours...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Analyser Toutes ({strategies.length})
                                </>
                            )}
                        </Button>
                        
                        <Button
                            onClick={loadData}
                            variant="outline"
                            className="border-slate-600"
                            disabled={analyzing}
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            Rafraîchir
                        </Button>

                        {Object.keys(analysisResults).length > 0 && (
                            <Badge variant="outline" className="text-green-400">
                                {Object.keys(analysisResults).length} analysée(s)
                            </Badge>
                        )}
                    </div>

                    {analyzing && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">
                                    Analyse: {currentStrategy}
                                </span>
                                <span className="text-sm text-green-400">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Strategies List with Analysis */}
            <ScrollArea className="h-[700px]">
                <div className="space-y-3 pr-4">
                    {strategies.map((strategy, idx) => {
                        const result = analysisResults[strategy.id];
                        const isExpanded = expandedStrategies[strategy.id];

                        return (
                            <Card 
                                key={strategy.id} 
                                className={`bg-slate-800 border-slate-700 ${
                                    result?.status === 'completed' ? 'border-l-4 border-l-green-600' :
                                    result?.status === 'error' ? 'border-l-4 border-l-red-600' : ''
                                }`}
                            >
                                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(strategy.id)}>
                                    <CollapsibleTrigger className="w-full">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500 font-mono text-sm">
                                                        #{idx + 1}
                                                    </span>
                                                    {isExpanded ? 
                                                        <ChevronDown className="w-4 h-4 text-slate-400" /> :
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    }
                                                    <div className="text-left">
                                                        <CardTitle className="text-green-300 text-base">
                                                            {strategy.strategy_name}
                                                        </CardTitle>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {strategy.strategy_type} | Priority: {strategy.priority_level}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {result ? (
                                                        <>
                                                            <Badge className={getScoreBadge(result.score)}>
                                                                Score: {result.score}
                                                            </Badge>
                                                            {result.status === 'completed' ? (
                                                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                            ) : (
                                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                runSingleAnalysis(strategy);
                                                            }}
                                                            disabled={analyzing}
                                                            className="border-purple-600 text-purple-400"
                                                        >
                                                            <Zap className="w-3 h-3 mr-1" />
                                                            Analyser
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <CardContent className="pt-0">
                                            {/* Strategy Info */}
                                            <div className="bg-slate-900 rounded-lg p-3 mb-3">
                                                <p className="text-sm text-slate-300 mb-2">
                                                    {strategy.description}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {strategy.source}
                                                    </Badge>
                                                    <Badge className={
                                                        strategy.cost_impact === 'reduces_cost' ? 'bg-green-600' : 
                                                        strategy.cost_impact === 'neutral' ? 'bg-slate-600' : 'bg-orange-600'
                                                    }>
                                                        {strategy.cost_impact}
                                                    </Badge>
                                                    <Badge className={
                                                        strategy.quality_impact === 'improves_quality' ? 'bg-blue-600' :
                                                        strategy.quality_impact === 'maintains_quality' ? 'bg-slate-600' : 'bg-yellow-600'
                                                    }>
                                                        {strategy.quality_impact}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Analysis Results */}
                                            {result && result.status === 'completed' && (
                                                <div className="space-y-4">
                                                    {/* Parameters Coverage */}
                                                    <div className="bg-slate-900 rounded-lg p-3">
                                                        <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-2">
                                                            <Settings className="w-3 h-3" />
                                                            Paramètres Associés
                                                        </h4>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Progress 
                                                                value={result.analysis.associated_params.coverage} 
                                                                className="h-2 flex-1" 
                                                            />
                                                            <span className="text-xs text-slate-400">
                                                                {result.analysis.associated_params.coverage.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {result.analysis.associated_params.found.map(p => (
                                                                <Badge key={p} className="bg-green-900/50 text-green-300 text-xs">
                                                                    {p}
                                                                </Badge>
                                                            ))}
                                                            {result.analysis.associated_params.missing.map(p => (
                                                                <Badge key={p} className="bg-red-900/50 text-red-300 text-xs">
                                                                    {p} (manquant)
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Simulated Changes */}
                                                    {result.simulated_changes.length > 0 && (
                                                        <div className="bg-slate-900 rounded-lg p-3">
                                                            <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
                                                                <Sparkles className="w-3 h-3" />
                                                                Changements Simulés (Dry-Run)
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {result.simulated_changes.map((change, i) => (
                                                                    <div key={i} className="flex items-center justify-between text-xs bg-slate-800 rounded p-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-300 font-mono">
                                                                                {change.param_name}
                                                                            </span>
                                                                            {!change.within_bounds && (
                                                                                <AlertCircle className="w-3 h-3 text-red-400" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-500">
                                                                                {change.current_value.toFixed(2)}
                                                                            </span>
                                                                            <span className="text-slate-600">→</span>
                                                                            <span className={
                                                                                change.change > 0 ? 'text-green-400' :
                                                                                change.change < 0 ? 'text-orange-400' : 'text-slate-400'
                                                                            }>
                                                                                {change.simulated_value.toFixed(2)}
                                                                            </span>
                                                                            {change.change !== 0 && (
                                                                                <Badge variant="outline" className={`text-xs ${
                                                                                    change.change > 0 ? 'text-green-400' : 'text-orange-400'
                                                                                }`}>
                                                                                    {change.change > 0 ? '+' : ''}{change.change_percent.toFixed(1)}%
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Impact Assessment */}
                                                    <div className="bg-slate-900 rounded-lg p-3">
                                                        <h4 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-2">
                                                            <Target className="w-3 h-3" />
                                                            Évaluation d'Impact
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-xs text-slate-500">Réduction Tokens</span>
                                                                <p className="text-sm font-bold text-green-400">
                                                                    {result.impact_assessment.expected_token_reduction}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Latence</span>
                                                                <p className="text-sm font-bold text-blue-400">
                                                                    {result.impact_assessment.expected_latency_change}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Risque Qualité</span>
                                                                <Badge className={
                                                                    result.impact_assessment.risk_level === 'low' ? 'bg-green-600' :
                                                                    result.impact_assessment.risk_level === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                                                                }>
                                                                    {result.impact_assessment.risk_level}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Recommandation</span>
                                                                <Badge className={
                                                                    result.impact_assessment.recommendation === 'RECOMMANDÉ' ? 'bg-green-600' :
                                                                    result.impact_assessment.recommendation === 'SAFE' ? 'bg-blue-600' : 'bg-orange-600'
                                                                }>
                                                                    {result.impact_assessment.recommendation}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Activation Conditions */}
                                                    <div className="bg-slate-900 rounded-lg p-3">
                                                        <h4 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-2">
                                                            <Activity className="w-3 h-3" />
                                                            Conditions d'Activation
                                                        </h4>
                                                        <p className="text-xs text-slate-300">
                                                            {result.analysis.activation_conditions.description}
                                                        </p>
                                                        <div className="mt-2">
                                                            <Badge className={
                                                                result.analysis.activation_conditions.currently_met 
                                                                    ? 'bg-green-600' : 'bg-slate-600'
                                                            }>
                                                                {result.analysis.activation_conditions.currently_met 
                                                                    ? '✓ Conditions remplies' : '○ En attente'}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* Recommendations */}
                                                    {result.recommendations.length > 0 && (
                                                        <div className="bg-slate-900 rounded-lg p-3">
                                                            <h4 className="text-xs font-semibold text-pink-400 mb-2 flex items-center gap-2">
                                                                <Brain className="w-3 h-3" />
                                                                Recommandations
                                                            </h4>
                                                            <div className="space-y-1">
                                                                {result.recommendations.map((rec, i) => (
                                                                    <div key={i} className={`text-xs p-2 rounded ${
                                                                        rec.type === 'success' ? 'bg-green-900/30 text-green-300' :
                                                                        rec.type === 'warning' ? 'bg-red-900/30 text-red-300' :
                                                                        rec.type === 'caution' ? 'bg-yellow-900/30 text-yellow-300' :
                                                                        'bg-blue-900/30 text-blue-300'
                                                                    }`}>
                                                                        {rec.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Warnings */}
                                                    {result.warnings.length > 0 && (
                                                        <div className="bg-red-900/20 rounded-lg p-3 border border-red-600/50">
                                                            <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-2">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Warnings ({result.warnings.length})
                                                            </h4>
                                                            <ul className="space-y-1">
                                                                {result.warnings.map((w, i) => (
                                                                    <li key={i} className="text-xs text-red-300">• {w}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Not yet analyzed */}
                                            {!result && (
                                                <div className="text-center py-6 text-slate-500">
                                                    <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Cliquez sur "Analyser" pour lancer le dry-run</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}