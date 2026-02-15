import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserBudget } from '@/entities/UserBudget';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Zap, 
    Clock, 
    AlertTriangle, 
    TrendingDown,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResourceMonitorBar({ 
    processingTime = 0, 
    isProcessing = false,
    lastResponseTokens = 0,
    onOptimizeSuggestion = null 
}) {
    const [budget, setBudget] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadBudget();
        // Refresh every 30 seconds while processing
        const interval = isProcessing ? setInterval(loadBudget, 30000) : null;
        return () => interval && clearInterval(interval);
    }, [isProcessing]);

    const loadBudget = async () => {
        try {
            const budgets = await UserBudget.list();
            if (budgets.length > 0) {
                setBudget(budgets[0]);
            }
        } catch (error) {
            console.log('[ResourceMonitor] No budget found');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadBudget();
        setIsRefreshing(false);
    };

    const getDailyUsagePercent = () => {
        if (!budget) return 0;
        return Math.min(100, (budget.tokens_used_today / budget.daily_token_limit) * 100);
    };

    const getMonthlyUsagePercent = () => {
        if (!budget) return 0;
        return Math.min(100, (budget.tokens_used_month / budget.monthly_token_limit) * 100);
    };

    const getUsageColor = (percent) => {
        if (percent >= 90) return 'text-red-400';
        if (percent >= 75) return 'text-orange-400';
        if (percent >= 50) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getProgressColor = (percent) => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 75) return 'bg-orange-500';
        if (percent >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getProcessingTimeColor = () => {
        if (processingTime >= 60) return 'text-red-400';
        if (processingTime >= 30) return 'text-orange-400';
        if (processingTime >= 15) return 'text-yellow-400';
        return 'text-green-400';
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num?.toString() || '0';
    };

    const dailyPercent = getDailyUsagePercent();
    const monthlyPercent = getMonthlyUsagePercent();
    const isNearLimit = dailyPercent >= 80 || monthlyPercent >= 80;
    const isAtLimit = dailyPercent >= 100;

    // Optimization suggestions
    const getSuggestions = () => {
        const suggestions = [];
        
        if (processingTime > 30) {
            suggestions.push({
                icon: Clock,
                text: 'Reduce debate rounds or personas for faster responses',
                action: 'reduce_complexity'
            });
        }
        
        if (dailyPercent >= 70) {
            suggestions.push({
                icon: TrendingDown,
                text: 'Use "eco" mode to conserve tokens',
                action: 'switch_eco'
            });
        }
        
        if (lastResponseTokens > 2000) {
            suggestions.push({
                icon: Lightbulb,
                text: 'Shorter prompts use fewer tokens',
                action: 'simplify_prompt'
            });
        }
        
        return suggestions;
    };

    const suggestions = getSuggestions();

    if (!budget && !isProcessing) return null;

    return (
        <div className={`border-b transition-all ${isAtLimit ? 'bg-red-900/30 border-red-600/50' : isNearLimit ? 'bg-orange-900/20 border-orange-600/30' : 'bg-slate-800/50 border-slate-700'}`}>
            {/* Collapsed View */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-3 text-xs">
                    {/* Processing Time */}
                    {isProcessing && processingTime > 0 && (
                        <div className={`flex items-center gap-1 ${getProcessingTimeColor()}`}>
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span className="font-mono">{processingTime}s</span>
                            {processingTime > 30 && <span className="text-orange-400">(complex)</span>}
                        </div>
                    )}

                    {/* Token Usage */}
                    {budget && (
                        <div className="flex items-center gap-2">
                            <Zap className={`w-3 h-3 ${getUsageColor(dailyPercent)}`} />
                            <span className={`font-mono ${getUsageColor(dailyPercent)}`}>
                                {formatNumber(budget.tokens_used_today)}/{formatNumber(budget.daily_token_limit)}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all ${getProgressColor(dailyPercent)}`}
                                    style={{ width: `${dailyPercent}%` }}
                                />
                            </div>
                            <span className={`${getUsageColor(dailyPercent)}`}>
                                {dailyPercent.toFixed(0)}%
                            </span>
                        </div>
                    )}

                    {/* Warnings */}
                    {isAtLimit && (
                        <Badge className="bg-red-600 text-xs py-0">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            Limit reached
                        </Badge>
                    )}
                    
                    {isNearLimit && !isAtLimit && (
                        <Badge className="bg-orange-600 text-xs py-0">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            Near limit
                        </Badge>
                    )}

                    {/* Last Response Tokens */}
                    {lastResponseTokens > 0 && !isProcessing && (
                        <span className="text-slate-500">
                            Last: {formatNumber(lastResponseTokens)} tokens
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {suggestions.length > 0 && (
                        <Badge variant="outline" className="text-xs py-0 text-yellow-400 border-yellow-600/50">
                            <Lightbulb className="w-2.5 h-2.5 mr-1" />
                            {suggestions.length} tips
                        </Badge>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                </div>
            </button>

            {/* Expanded View */}
            {isExpanded && (
                <div className="px-3 py-2 border-t border-slate-700/50 space-y-3">
                    {/* Detailed Stats */}
                    {budget && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="bg-slate-900/50 rounded-lg p-2">
                                <div className="text-slate-500 mb-1">Daily Usage</div>
                                <div className={`text-lg font-bold ${getUsageColor(dailyPercent)}`}>
                                    {dailyPercent.toFixed(1)}%
                                </div>
                                <Progress value={dailyPercent} className="h-1 mt-1" />
                                <div className="text-slate-500 mt-1">
                                    {formatNumber(budget.tokens_used_today)} / {formatNumber(budget.daily_token_limit)}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-2">
                                <div className="text-slate-500 mb-1">Monthly Usage</div>
                                <div className={`text-lg font-bold ${getUsageColor(monthlyPercent)}`}>
                                    {monthlyPercent.toFixed(1)}%
                                </div>
                                <Progress value={monthlyPercent} className="h-1 mt-1" />
                                <div className="text-slate-500 mt-1">
                                    {formatNumber(budget.tokens_used_month)} / {formatNumber(budget.monthly_token_limit)}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-2">
                                <div className="text-slate-500 mb-1">Plan</div>
                                <div className="text-lg font-bold text-purple-400 capitalize">
                                    {budget.plan_tier || 'Pro'}
                                </div>
                                <div className="text-slate-500 mt-1">
                                    Mode: {budget.preferred_mode || 'balanced'}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 rounded-lg p-2">
                                <div className="text-slate-500 mb-1">Est. Cost</div>
                                <div className="text-lg font-bold text-green-400">
                                    ${((budget.tokens_used_month / 1000) * (budget.cost_per_1k_tokens || 0.02)).toFixed(2)}
                                </div>
                                <div className="text-slate-500 mt-1">
                                    This month
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Optimization Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-yellow-400" />
                                Optimization Tips
                            </div>
                            {suggestions.map((suggestion, idx) => {
                                const Icon = suggestion.icon;
                                return (
                                    <div 
                                        key={idx}
                                        className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-xs"
                                    >
                                        <Icon className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                        <span className="text-slate-300">{suggestion.text}</span>
                                        {onOptimizeSuggestion && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onOptimizeSuggestion(suggestion.action)}
                                                className="ml-auto h-5 px-2 text-xs text-yellow-400 hover:text-yellow-300"
                                            >
                                                Apply
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Refresh Button */}
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-6 px-2 text-xs text-slate-400 hover:text-green-400"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}