import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserBudget } from '@/entities/UserBudget';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
    Zap, Clock, AlertTriangle, TrendingDown, ChevronDown, ChevronUp, 
    Lightbulb, RefreshCw, TrendingUp, Settings, Play, Square
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : (n||0).toString();
const pct = (used, limit) => limit ? Math.min(100, (used / limit) * 100) : 0;
const color = p => p >= 90 ? 'text-red-400' : p >= 75 ? 'text-orange-400' : p >= 50 ? 'text-yellow-400' : 'text-green-400';
const bgColor = p => p >= 90 ? 'bg-red-500' : p >= 75 ? 'bg-orange-500' : p >= 50 ? 'bg-yellow-500' : 'bg-green-500';

export default function ResourceMonitorBar({ 
    processingTime = 0, 
    isProcessing = false,
    lastResponseTokens = 0,
    onOptimizeSuggestion = null,
    onAutoOptimize = null,
    settings = {},
    onSettingsChange = null
}) {
    const [budget, setBudget] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tokenHistory, setTokenHistory] = useState([]);
    const [autoOptEnabled, setAutoOptEnabled] = useState(false);
    const [sessionLimit, setSessionLimit] = useState(null);
    const [sessionTokens, setSessionTokens] = useState(0);
    const [showLimitInput, setShowLimitInput] = useState(false);
    const autoOptRef = useRef(null);

    // Load budget once
    useEffect(() => {
        UserBudget.list().then(b => b[0] && setBudget(b[0])).catch(() => {});
    }, []);

    // Track token history for predictions
    useEffect(() => {
        if (lastResponseTokens > 0) {
            setTokenHistory(prev => [...prev.slice(-9), { tokens: lastResponseTokens, time: Date.now() }]);
            setSessionTokens(prev => prev + lastResponseTokens);
        }
    }, [lastResponseTokens]);

    // Predictive analytics
    const prediction = useMemo(() => {
        if (tokenHistory.length < 2 || !budget) return null;
        const avgTokens = tokenHistory.reduce((s, t) => s + t.tokens, 0) / tokenHistory.length;
        const remaining = budget.daily_token_limit - budget.tokens_used_today;
        const msgsUntilLimit = remaining > 0 ? Math.floor(remaining / avgTokens) : 0;
        const burnRate = avgTokens;
        const willHitLimit = msgsUntilLimit < 5;
        return { avgTokens: Math.round(avgTokens), msgsUntilLimit, burnRate, willHitLimit };
    }, [tokenHistory, budget]);

    // Auto-optimization engine
    useEffect(() => {
        if (!autoOptEnabled || !isProcessing || !onAutoOptimize) return;
        
        autoOptRef.current = setInterval(() => {
            const dailyPct = budget ? pct(budget.tokens_used_today, budget.daily_token_limit) : 0;
            const sessionPct = sessionLimit ? pct(sessionTokens, sessionLimit) : 0;
            
            // Trigger auto-optimization based on constraints
            if (processingTime > 45 || dailyPct > 85 || sessionPct > 90) {
                const optimizations = [];
                if (processingTime > 45) optimizations.push('reduce_rounds');
                if (dailyPct > 85 || sessionPct > 90) optimizations.push('eco_mode');
                if (prediction?.willHitLimit) optimizations.push('simplify');
                
                onAutoOptimize(optimizations);
                toast.info(`⚡ Auto-optimizing: ${optimizations.join(', ')}`);
            }
        }, 5000);

        return () => clearInterval(autoOptRef.current);
    }, [autoOptEnabled, isProcessing, processingTime, budget, sessionTokens, sessionLimit, prediction, onAutoOptimize]);

    // Check session limit
    useEffect(() => {
        if (sessionLimit && sessionTokens >= sessionLimit) {
            toast.warning('Session token limit reached!');
            onOptimizeSuggestion?.('session_limit_reached');
        }
    }, [sessionTokens, sessionLimit, onOptimizeSuggestion]);

    const dailyPct = budget ? pct(budget.tokens_used_today, budget.daily_token_limit) : 0;
    const monthlyPct = budget ? pct(budget.tokens_used_month, budget.monthly_token_limit) : 0;
    const sessionPct = sessionLimit ? pct(sessionTokens, sessionLimit) : 0;
    const isNearLimit = dailyPct >= 80 || monthlyPct >= 80 || sessionPct >= 80;
    const isAtLimit = dailyPct >= 100 || sessionPct >= 100;

    const suggestions = useMemo(() => {
        const s = [];
        if (processingTime > 30) s.push({ icon: Clock, text: 'Reduce complexity', action: 'reduce_complexity' });
        if (dailyPct >= 70) s.push({ icon: TrendingDown, text: 'Switch to eco mode', action: 'switch_eco' });
        if (prediction?.willHitLimit) s.push({ icon: AlertTriangle, text: `~${prediction.msgsUntilLimit} msgs until limit`, action: 'conserve' });
        if (lastResponseTokens > 2000) s.push({ icon: Lightbulb, text: 'Simplify prompts', action: 'simplify_prompt' });
        return s;
    }, [processingTime, dailyPct, prediction, lastResponseTokens]);

    if (!budget && !isProcessing && !sessionLimit) return null;

    return (
        <div className={`border-b transition-all ${isAtLimit ? 'bg-red-900/30 border-red-600/50' : isNearLimit ? 'bg-orange-900/20 border-orange-600/30' : 'bg-slate-800/50 border-slate-700'}`}>
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/30">
                <div className="flex items-center gap-3 text-xs">
                    {isProcessing && processingTime > 0 && (
                        <div className={`flex items-center gap-1 ${processingTime >= 60 ? 'text-red-400' : processingTime >= 30 ? 'text-orange-400' : 'text-green-400'}`}>
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span className="font-mono">{processingTime}s</span>
                        </div>
                    )}
                    {budget && (
                        <div className="flex items-center gap-2">
                            <Zap className={`w-3 h-3 ${color(dailyPct)}`} />
                            <span className={`font-mono ${color(dailyPct)}`}>{fmt(budget.tokens_used_today)}/{fmt(budget.daily_token_limit)}</span>
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${bgColor(dailyPct)}`} style={{ width: `${dailyPct}%` }} />
                            </div>
                        </div>
                    )}
                    {sessionLimit && (
                        <Badge variant="outline" className={`text-xs py-0 ${color(sessionPct)} border-current`}>
                            Session: {fmt(sessionTokens)}/{fmt(sessionLimit)}
                        </Badge>
                    )}
                    {prediction?.willHitLimit && (
                        <Badge className="bg-orange-600 text-xs py-0">
                            <TrendingUp className="w-2.5 h-2.5 mr-1" />
                            ~{prediction.msgsUntilLimit} left
                        </Badge>
                    )}
                    {autoOptEnabled && (
                        <Badge className="bg-purple-600 text-xs py-0">
                            <Play className="w-2.5 h-2.5 mr-1" />
                            Auto-Opt
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {suggestions.length > 0 && <Badge variant="outline" className="text-xs py-0 text-yellow-400 border-yellow-600/50">{suggestions.length} tips</Badge>}
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </div>
            </button>

            {isExpanded && (
                <div className="px-3 py-2 border-t border-slate-700/50 space-y-3">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {budget && (
                            <>
                                <div className="bg-slate-900/50 rounded-lg p-2">
                                    <div className="text-slate-500">Daily</div>
                                    <div className={`text-lg font-bold ${color(dailyPct)}`}>{dailyPct.toFixed(0)}%</div>
                                    <Progress value={dailyPct} className="h-1 mt-1" />
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-2">
                                    <div className="text-slate-500">Monthly</div>
                                    <div className={`text-lg font-bold ${color(monthlyPct)}`}>{monthlyPct.toFixed(0)}%</div>
                                    <Progress value={monthlyPct} className="h-1 mt-1" />
                                </div>
                            </>
                        )}
                        {prediction && (
                            <div className="bg-slate-900/50 rounded-lg p-2">
                                <div className="text-slate-500">Avg/msg</div>
                                <div className="text-lg font-bold text-purple-400">{fmt(prediction.avgTokens)}</div>
                                <div className="text-slate-500">~{prediction.msgsUntilLimit} msgs left</div>
                            </div>
                        )}
                        <div className="bg-slate-900/50 rounded-lg p-2">
                            <div className="text-slate-500">Session</div>
                            <div className="text-lg font-bold text-blue-400">{fmt(sessionTokens)}</div>
                            {sessionLimit && <Progress value={sessionPct} className="h-1 mt-1" />}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Switch checked={autoOptEnabled} onCheckedChange={setAutoOptEnabled} className="data-[state=checked]:bg-purple-600" />
                            <span className="text-xs text-slate-400">Auto-Optimize</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowLimitInput(!showLimitInput)} className="h-6 px-2 text-xs">
                                <Settings className="w-3 h-3 mr-1" />
                                Session Limit
                            </Button>
                            {showLimitInput && (
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        placeholder="e.g. 50000"
                                        className="w-24 h-6 text-xs bg-slate-800"
                                        onKeyDown={e => e.key === 'Enter' && setSessionLimit(parseInt(e.target.value) || null)}
                                    />
                                    {sessionLimit && (
                                        <Button variant="ghost" size="icon" onClick={() => setSessionLimit(null)} className="h-6 w-6">
                                            <Square className="w-3 h-3 text-red-400" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSessionTokens(0)} className="h-6 px-2 text-xs text-slate-400">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reset Session
                        </Button>
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="space-y-1">
                            {suggestions.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs">
                                    <s.icon className="w-3 h-3 text-yellow-400" />
                                    <span className="text-slate-300">{s.text}</span>
                                    {onOptimizeSuggestion && (
                                        <Button variant="ghost" size="sm" onClick={() => onOptimizeSuggestion(s.action)} className="ml-auto h-5 px-2 text-xs text-yellow-400">
                                            Apply
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}