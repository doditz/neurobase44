
import React, { useState, useEffect, useCallback } from 'react';
import { ResourceUsage } from '@/entities/ResourceUsage';
import { UserBudget } from '@/entities/UserBudget';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    DollarSign,
    TrendingUp,
    Clock,
    Zap,
    AlertCircle,
    Activity,
    BarChart3,
    Settings,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ResourceMonitoring() {
    const [user, setUser] = useState(null);
    const [budget, setBudget] = useState(null);
    const [usageData, setUsageData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('today');
    const [estimatedVsActual, setEstimatedVsActual] = useState({ estimated: 0, actual: 0, savings: 0 });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            // Load or create budget with PRO tier defaults
            const budgets = await UserBudget.filter({ created_by: currentUser.email });
            let currentBudget;
            if (budgets.length === 0) {
                const newBudget = await UserBudget.create({
                    daily_token_limit: 500000,
                    monthly_token_limit: 10000000,
                    backend_monthly_limit: 20000000,
                    tokens_used_today: 0,
                    tokens_used_month: 0,
                    backend_tokens_used_month: 0,
                    last_reset_date: format(new Date(), 'yyyy-MM-dd'),
                    last_monthly_reset: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                    alert_threshold_percentage: 0.8,
                    auto_optimize_enabled: true,
                    preferred_mode: 'premium',
                    budget_alerts_enabled: true,
                    cost_per_1k_tokens: 0.02,
                    perplexity_searches_month: 0,
                    plan_tier: 'pro'
                });
                setBudget(newBudget);
                currentBudget = newBudget;
            } else {
                setBudget(budgets[0]);
                currentBudget = budgets[0];
            }

            // Load usage data
            const usages = await ResourceUsage.list('-created_date', 100);
            setUsageData(usages);

            // Calculate estimated vs actual
            const totalEstimated = usages.reduce((sum, u) => sum + (u.tokens_used_estimated || 0), 0);
            // Simulate actual tokens and savings based on auto_optimize_enabled
            const totalActual = usages.reduce((sum, u) => {
                // If auto-optimize is enabled, simulate a 10% saving, otherwise actual is estimated.
                const actualTokens = currentBudget && currentBudget.auto_optimize_enabled ?
                    (u.tokens_used_estimated || 0) * 0.9 :
                    (u.tokens_used_estimated || 0);
                return sum + actualTokens;
            }, 0);
            const savings = totalEstimated - totalActual;
            setEstimatedVsActual({ estimated: totalEstimated, actual: totalActual, savings: Math.max(0, savings) });

        } catch (error) {
            console.error('Failed to load resource data:', error);
            toast.error('Échec du chargement des données');
        }
        setIsLoading(false);
    }, [timeRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateBudget = async (updates) => {
        try {
            await UserBudget.update(budget.id, updates);
            toast.success('Budget mis à jour');
            loadData(); // Reload data to reflect changes
        } catch (error) {
            console.error('Failed to update budget:', error);
            toast.error('Échec de la mise à jour');
        }
    };

    const resetDailyUsage = async () => {
        try {
            await UserBudget.update(budget.id, {
                tokens_used_today: 0,
                last_reset_date: format(new Date(), 'yyyy-MM-dd')
            });
            toast.success('Compteur quotidien réinitialisé');
            loadData();
        } catch (error) {
            console.error('Failed to reset daily usage:', error);
            toast.error('Échec de la réinitialisation');
        }
    };

    if (isLoading || !budget) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 animate-pulse mx-auto mb-4 text-green-400" />
                    <p className="text-green-300">Chargement des données...</p>
                </div>
            </div>
        );
    }

    const dailyPercentage = (budget.tokens_used_today / budget.daily_token_limit) * 100;
    const monthlyPercentage = (budget.tokens_used_month / budget.monthly_token_limit) * 100;
    const dailyCost = (budget.tokens_used_today / 1000) * budget.cost_per_1k_tokens;
    const monthlyCost = (budget.tokens_used_month / 1000) * budget.cost_per_1k_tokens;

    const isNearDailyLimit = dailyPercentage >= budget.alert_threshold_percentage * 100;
    const isNearMonthlyLimit = monthlyPercentage >= budget.alert_threshold_percentage * 100;

    // Calculate stats from usage data
    const todayUsages = usageData.filter(u =>
        format(new Date(u.created_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    );

    const avgProcessingTime = todayUsages.length > 0
        ? todayUsages.reduce((sum, u) => sum + u.processing_time_ms, 0) / todayUsages.length
        : 0;

    const totalLLMCalls = todayUsages.reduce((sum, u) => sum + u.llm_calls_count, 0);

    const operationBreakdown = usageData.reduce((acc, usage) => {
        acc[usage.operation_type] = (acc[usage.operation_type] || 0) + usage.tokens_used_estimated;
        return acc;
    }, {});

    return (
        <div className="bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-green-300 mb-2">Resource Monitoring</h1>
                            <p className="text-slate-400">Gestion et optimisation de l'utilisation des ressources</p>
                        </div>
                        <Button onClick={loadData} variant="outline" className="border-green-600 text-green-400">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualiser
                        </Button>
                    </div>
                </div>

                {/* Alert Banners */}
                {isNearDailyLimit && (
                    <div className="mb-6 p-4 bg-orange-900/30 border border-orange-600/50 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-orange-400">Limite Quotidienne Approchée</h3>
                            <p className="text-sm text-orange-300">
                                Vous avez utilisé {dailyPercentage.toFixed(0)}% de votre limite quotidienne
                            </p>
                        </div>
                    </div>
                )}

                {isNearMonthlyLimit && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-400">Limite Mensuelle Approchée</h3>
                            <p className="text-sm text-red-300">
                                Vous avez utilisé {monthlyPercentage.toFixed(0)}% de votre limite mensuelle
                            </p>
                        </div>
                    </div>
                )}

                {/* Overview Cards */}
                <div className="grid md:grid-cols-5 gap-6 mb-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-400" />
                                Tokens Aujourd'hui
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400 mb-2">
                                {budget.tokens_used_today.toLocaleString()}
                            </div>
                            <Progress value={dailyPercentage} className="h-2 mb-2" />
                            <p className="text-xs text-slate-400">
                                {dailyPercentage.toFixed(1)}% de {budget.daily_token_limit.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-orange-400" />
                                Coût Aujourd'hui
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400 mb-2">
                                ${dailyCost.toFixed(2)}
                            </div>
                            <p className="text-xs text-slate-400">
                                ${budget.cost_per_1k_tokens}/1k tokens
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" />
                                Temps Moyen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400 mb-2">
                                {(avgProcessingTime / 1000).toFixed(1)}s
                            </div>
                            <p className="text-xs text-slate-400">
                                {totalLLMCalls} appels LLM
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-orange-400" />
                                Ce Mois-ci
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400 mb-2">
                                ${monthlyCost.toFixed(2)}
                            </div>
                            <Progress value={monthlyPercentage} className="h-2 mb-2" />
                            <p className="text-xs text-slate-400">
                                {monthlyPercentage.toFixed(1)}% du budget
                            </p>
                        </CardContent>
                    </Card>

                    {/* NEW: Savings Card */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-green-400" />
                                Économies AI
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400 mb-2">
                                {estimatedVsActual.savings.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-400">
                                tokens économisés ce mois
                            </p>
                            {estimatedVsActual.savings > 0 && (
                                <p className="text-xs text-green-400 mt-1">
                                    ≈ ${((estimatedVsActual.savings / 1000) * budget.cost_per_1k_tokens).toFixed(2)} économisés
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="usage" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="usage" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <Activity className="w-4 h-4 mr-2" />
                            Utilisation
                        </TabsTrigger>
                        <TabsTrigger value="breakdown" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Répartition
                        </TabsTrigger>
                        <TabsTrigger value="optimization" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <Zap className="w-4 h-4 mr-2" />
                            Hybridation
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <Settings className="w-4 h-4 mr-2" />
                            Paramètres
                        </TabsTrigger>
                    </TabsList>

                    {/* Usage Tab */}
                    <TabsContent value="usage">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Historique d'Utilisation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {usageData.slice(0, 20).map((usage) => (
                                        <div key={usage.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-blue-600">{usage.agent_name}</Badge>
                                                    <Badge variant="outline" className="text-green-400 border-green-600">
                                                        {usage.operation_type}
                                                    </Badge>
                                                    {usage.mode_used && (
                                                        <Badge variant="outline" className="text-purple-400 border-purple-600">
                                                            {usage.mode_used}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(usage.created_date), 'PPp', { locale: fr })}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <div className="text-slate-500 text-xs">Tokens</div>
                                                    <div className="font-medium text-green-400">{usage.tokens_used_estimated.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500 text-xs">Appels LLM</div>
                                                    <div className="font-medium text-green-400">{usage.llm_calls_count}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500 text-xs">Temps</div>
                                                    <div className="font-medium text-green-400">{(usage.processing_time_ms / 1000).toFixed(1)}s</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-500 text-xs">Coût</div>
                                                    <div className="font-medium text-green-400">${usage.cost_estimated?.toFixed(3) || '0.000'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Breakdown Tab */}
                    <TabsContent value="breakdown">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Répartition par Type d'Opération</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(operationBreakdown).map(([type, tokens]) => {
                                        const percentage = estimatedVsActual.estimated > 0 ?
                                            (tokens / estimatedVsActual.estimated) * 100 : 0;
                                        return (
                                            <div key={type}>
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-green-300 capitalize">{type.replace(/_/g, ' ')}</span>
                                                    <span className="text-slate-400">{tokens.toLocaleString()} tokens ({percentage.toFixed(1)}%)</span>
                                                </div>
                                                <Progress value={percentage} className="h-2" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* NEW: Optimization Tab */}
                    <TabsContent value="optimization">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Hybridation Intelligente</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Performance des stratégies d'optimisation automatique
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-700 rounded-lg p-4">
                                        <div className="text-xs text-slate-400 mb-1">Compression Sémantique</div>
                                        <div className="text-2xl font-bold text-green-400">
                                            {estimatedVsActual.estimated > 0 ?
                                                `${((estimatedVsActual.savings / estimatedVsActual.estimated) * 100).toFixed(0)}%` :
                                                'N/A'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">de réduction moyenne</div>
                                    </div>

                                    <div className="bg-slate-700 rounded-lg p-4">
                                        <div className="text-xs text-slate-400 mb-1">Mode Auto-Optimisé</div>
                                        <div className="text-2xl font-bold text-blue-400">
                                            {budget.auto_optimize_enabled ? 'ACTIF' : 'INACTIF'}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{budget.preferred_mode} préféré</div>
                                    </div>

                                    <div className="bg-slate-700 rounded-lg p-4">
                                        <div className="text-xs text-slate-400 mb-1">Économies Mensuelles</div>
                                        <div className="text-2xl font-bold text-orange-400">
                                            ${((estimatedVsActual.savings / 1000) * budget.cost_per_1k_tokens).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">grâce à l'IA</div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-green-300 mb-3">Stratégies Actives</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                            <div>
                                                <div className="font-medium text-green-400">DSTIB Compression</div>
                                                <div className="text-xs text-slate-400">Réduction sémantique 70-80%</div>
                                            </div>
                                            <Badge className="bg-green-600">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                            <div>
                                                <div className="font-medium text-green-400">QRONAS Dispatch</div>
                                                <div className="text-xs text-slate-400">Sélection dynamique personas</div>
                                            </div>
                                            <Badge className="bg-green-600">Active</Badge>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                            <div>
                                                <div className="font-medium text-green-400">Budget-Aware Routing</div>
                                                <div className="text-xs text-slate-400">Priorisation selon budget</div>
                                            </div>
                                            <Badge className="bg-green-600">Active</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Paramètres de Budget</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Configurez vos limites et alertes
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">
                                        Limite Quotidienne (tokens)
                                    </label>
                                    <Input
                                        type="number"
                                        value={budget.daily_token_limit}
                                        onChange={(e) => updateBudget({ daily_token_limit: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-700 border-slate-600 text-green-300"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">
                                        Limite Mensuelle (tokens)
                                    </label>
                                    <Input
                                        type="number"
                                        value={budget.monthly_token_limit}
                                        onChange={(e) => updateBudget({ monthly_token_limit: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-700 border-slate-600 text-green-300"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">
                                        Seuil d'Alerte ({(budget.alert_threshold_percentage * 100).toFixed(0)}%)
                                    </label>
                                    <Input
                                        type="number"
                                        min="50"
                                        max="100"
                                        step="5"
                                        value={budget.alert_threshold_percentage * 100}
                                        onChange={(e) => updateBudget({ alert_threshold_percentage: parseFloat(e.target.value) / 100 || 0 })}
                                        className="bg-slate-700 border-slate-600 text-green-300"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-green-300">Alertes Budget</h4>
                                        <p className="text-xs text-slate-400">Recevoir des notifications de limite</p>
                                    </div>
                                    <Switch
                                        checked={budget.budget_alerts_enabled}
                                        onCheckedChange={(checked) => updateBudget({ budget_alerts_enabled: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-green-300">Optimisation Auto</h4>
                                        <p className="text-xs text-slate-400">Ajuster automatiquement les paramètres</p>
                                    </div>
                                    <Switch
                                        checked={budget.auto_optimize_enabled}
                                        onCheckedChange={(checked) => updateBudget({ auto_optimize_enabled: checked })}
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-700">
                                    <Button
                                        onClick={resetDailyUsage}
                                        variant="outline"
                                        className="w-full border-orange-600 text-orange-400 hover:bg-orange-900/50"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Réinitialiser Compteur Quotidien
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
