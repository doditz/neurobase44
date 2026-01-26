/**
 * UNIFIED LOG DISPLAY COMPONENT
 * 
 * Single component for displaying logs anywhere in the app.
 * Fetches from UnifiedLog entity or displays provided logs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
    RefreshCw, Search, Filter, ChevronDown, ChevronRight, 
    AlertCircle, AlertTriangle, Info, CheckCircle2, Bug, Loader2,
    Pin, Clock, Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SOURCE_COLORS = {
    benchmark: 'bg-green-600',
    devtest: 'bg-blue-600',
    auto_tune: 'bg-purple-600',
    realtime_tuner: 'bg-orange-600',
    chat: 'bg-cyan-600',
    gauntlet: 'bg-red-600',
    pipeline_test: 'bg-yellow-600',
    system_diagnostic: 'bg-slate-600',
    alert: 'bg-pink-600',
    parameter_change: 'bg-indigo-600'
};

const STATUS_COLORS = {
    success: 'bg-green-600',
    partial: 'bg-yellow-600',
    failed: 'bg-red-600',
    timeout: 'bg-orange-600'
};

const LEVEL_ICONS = {
    ERROR: { icon: AlertCircle, color: 'text-red-400' },
    CRITICAL: { icon: AlertCircle, color: 'text-red-600' },
    WARNING: { icon: AlertTriangle, color: 'text-orange-400' },
    SUCCESS: { icon: CheckCircle2, color: 'text-green-400' },
    INFO: { icon: Info, color: 'text-blue-400' },
    DEBUG: { icon: Bug, color: 'text-slate-400' },
    SYSTEM: { icon: Layers, color: 'text-purple-400' }
};

export default function UnifiedLogDisplay({
    // If provided, display these logs directly
    logs: providedLogs = null,
    
    // If not provided, fetch from entity with these filters
    sourceType = null,
    sourceId = null,
    limit = 50,
    
    // Display options
    title = 'Unified Logs',
    showFilters = true,
    showSearch = true,
    showRefresh = true,
    collapsible = true,
    defaultExpanded = true,
    maxHeight = '400px'
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [loading, setLoading] = useState(false);
    const [fetchedLogs, setFetchedLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Determine which logs to use
    const rawLogs = providedLogs || fetchedLogs;

    // Fetch logs if not provided
    useEffect(() => {
        if (!providedLogs) {
            fetchLogs();
        }
    }, [providedLogs, sourceType, sourceId, limit]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await base44.functions.invoke('unifiedLogManager', {
                action: 'query',
                source_type: sourceType,
                source_id: sourceId,
                limit
            });
            
            if (data?.logs) {
                setFetchedLogs(data.logs);
            }
        } catch (error) {
            console.error('[UnifiedLogDisplay] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Parse and filter logs
    const parsedLogs = useMemo(() => {
        // If raw logs are strings (formatted), parse them
        const parsed = rawLogs.map((log, idx) => {
            if (typeof log === 'string') {
                // Parse formatted log string: "[123ms] [Module] [LEVEL] Message"
                const match = log.match(/\[(\d+)ms\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
                if (match) {
                    return {
                        id: idx,
                        timestamp: parseInt(match[1]),
                        module: match[2],
                        level: match[3],
                        message: match[4],
                        raw: log
                    };
                }
                return { id: idx, level: 'INFO', message: log, raw: log };
            }
            // Already an object (from UnifiedLog entity)
            return { id: log.id || idx, ...log };
        });

        // Apply filters
        return parsed.filter(log => {
            if (levelFilter !== 'all' && log.level !== levelFilter) return false;
            if (sourceFilter !== 'all' && log.source_type !== sourceFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const searchable = `${log.message || ''} ${log.module || ''} ${log.result_summary || ''}`.toLowerCase();
                if (!searchable.includes(q)) return false;
            }
            return true;
        });
    }, [rawLogs, levelFilter, sourceFilter, searchQuery]);

    // Get unique sources for filter
    const availableSources = useMemo(() => {
        const sources = new Set(rawLogs.map(l => l.source_type).filter(Boolean));
        return Array.from(sources);
    }, [rawLogs]);

    const content = (
        <div className="space-y-3">
            {/* Filters */}
            {(showFilters || showSearch) && (
                <div className="flex flex-wrap gap-2 items-center">
                    {showSearch && (
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 bg-slate-700 border-slate-600 text-sm"
                            />
                        </div>
                    )}
                    
                    {showFilters && (
                        <>
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                                <SelectTrigger className="w-28 h-8 bg-slate-700 border-slate-600 text-xs">
                                    <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="ERROR">Error</SelectItem>
                                    <SelectItem value="WARNING">Warning</SelectItem>
                                    <SelectItem value="INFO">Info</SelectItem>
                                    <SelectItem value="DEBUG">Debug</SelectItem>
                                    <SelectItem value="SYSTEM">System</SelectItem>
                                </SelectContent>
                            </Select>

                            {availableSources.length > 1 && (
                                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                    <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-xs">
                                        <SelectValue placeholder="Source" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all">All Sources</SelectItem>
                                        {availableSources.map(src => (
                                            <SelectItem key={src} value={src}>{src}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </>
                    )}

                    {showRefresh && !providedLogs && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLogs}
                            disabled={loading}
                            className="h-8 border-green-600 text-green-400"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}

                    <Badge variant="outline" className="text-xs">
                        {parsedLogs.length} logs
                    </Badge>
                </div>
            )}

            {/* Logs List */}
            <ScrollArea style={{ maxHeight }} className="rounded border border-slate-700">
                <div className="space-y-1 p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                        </div>
                    ) : parsedLogs.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Aucun log trouvé
                        </div>
                    ) : (
                        parsedLogs.map(log => {
                            const levelConfig = LEVEL_ICONS[log.level] || LEVEL_ICONS.INFO;
                            const Icon = levelConfig.icon;
                            const isEntity = log.source_type; // From UnifiedLog entity
                            const isDetailExpanded = expandedLogId === log.id;

                            return (
                                <div
                                    key={log.id}
                                    className={`text-xs rounded p-2 ${
                                        log.level === 'ERROR' || log.level === 'CRITICAL'
                                            ? 'bg-red-900/20 border border-red-800/50'
                                            : log.level === 'WARNING'
                                            ? 'bg-orange-900/20 border border-orange-800/50'
                                            : log.level === 'SUCCESS'
                                            ? 'bg-green-900/20 border border-green-800/50'
                                            : 'bg-slate-800/50 border border-slate-700/50'
                                    }`}
                                >
                                    <div 
                                        className="flex items-start gap-2 cursor-pointer"
                                        onClick={() => setExpandedLogId(isDetailExpanded ? null : log.id)}
                                    >
                                        <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${levelConfig.color}`} />
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {log.timestamp !== undefined && (
                                                    <span className="text-slate-500">[{log.timestamp}ms]</span>
                                                )}
                                                {log.module && (
                                                    <Badge variant="outline" className="text-xs py-0 h-4">
                                                        {log.module}
                                                    </Badge>
                                                )}
                                                {isEntity && log.source_type && (
                                                    <Badge className={`${SOURCE_COLORS[log.source_type] || 'bg-slate-600'} text-xs py-0 h-4`}>
                                                        {log.source_type}
                                                    </Badge>
                                                )}
                                                {log.is_pinned && (
                                                    <Pin className="w-3 h-3 text-yellow-400" />
                                                )}
                                            </div>
                                            
                                            <p className="text-slate-300 mt-1 break-words">
                                                {log.message || log.result_summary || log.raw}
                                            </p>

                                            {/* Expanded details */}
                                            {isDetailExpanded && isEntity && (
                                                <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                                                    {log.metrics && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {log.metrics.spg !== undefined && (
                                                                <Badge variant="outline">SPG: {log.metrics.spg.toFixed(3)}</Badge>
                                                            )}
                                                            {log.metrics.latency_ms !== undefined && (
                                                                <Badge variant="outline">{log.metrics.latency_ms}ms</Badge>
                                                            )}
                                                            {log.metrics.tokens !== undefined && (
                                                                <Badge variant="outline">{log.metrics.tokens} tokens</Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    {log.strategy_name && (
                                                        <p className="text-slate-400">Strategy: {log.strategy_name}</p>
                                                    )}
                                                    {log.config_version && (
                                                        <p className="text-slate-400">Version: {log.config_version}</p>
                                                    )}
                                                    {log.error_message && (
                                                        <p className="text-red-400">Error: {log.error_message}</p>
                                                    )}
                                                    {log.created_date && (
                                                        <p className="text-slate-500">
                                                            <Clock className="w-3 h-3 inline mr-1" />
                                                            {format(new Date(log.created_date), 'dd MMM yyyy HH:mm:ss', { locale: fr })}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isEntity && (
                                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDetailExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    if (!collapsible) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>{content}</CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-slate-700/50 transition-colors">
                        <CardTitle className="text-green-300 text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                {title}
                                <Badge variant="outline" className="text-xs ml-2">
                                    {parsedLogs.length}
                                </Badge>
                            </span>
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>{content}</CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}