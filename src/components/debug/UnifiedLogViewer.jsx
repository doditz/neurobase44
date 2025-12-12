
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    ChevronDown, ChevronRight, Terminal, Search,
    AlertCircle, CheckCircle2, Info, AlertTriangle, Zap, XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const LEVEL_CONFIG = {
    INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-600/50' },
    DEBUG: { icon: Terminal, color: 'text-slate-400', bg: 'bg-slate-900/20', border: 'border-slate-600/50' },
    WARNING: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-600/50' },
    ERROR: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-600/50' },
    CRITICAL: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-900/30', border: 'border-red-500/70' },
    SYSTEM: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-600/50' },
    SUCCESS: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-600/50' }
};

export default function UnifiedLogViewer({ 
    logs = [], 
    title = "Logs Système", 
    showStats = true,
    defaultExpanded = false 
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDialog, setShowDialog] = useState(false);

    const parsedLogs = useMemo(() => {
        if (!Array.isArray(logs)) return [];
        
        return logs.map((log, index) => {
            if (typeof log === 'string') {
                const match = log.match(/\[(\d+)ms\] \[([^\]]+)\] \[([^\]]+)\] (.+)/);
                if (match) {
                    return {
                        index,
                        timestamp: match[1],
                        module: match[2],
                        level: match[3],
                        message: match[4],
                        raw: log
                    };
                }
                return {
                    index,
                    timestamp: index,
                    module: 'Unknown',
                    level: 'INFO',
                    message: log,
                    raw: log
                };
            }
            return {
                index,
                timestamp: log.timestamp || index,
                module: log.module || 'Unknown',
                level: log.level || 'INFO',
                message: log.message || JSON.stringify(log),
                metadata: log.metadata,
                raw: JSON.stringify(log)
            };
        });
    }, [logs]);

    const filteredLogs = useMemo(() => {
        let filtered = parsedLogs;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(log => 
                log.message.toLowerCase().includes(query) ||
                log.module.toLowerCase().includes(query) ||
                (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query))
            );
        }

        if (levelFilter !== 'all') {
            filtered = filtered.filter(log => log.level === levelFilter);
        }

        return filtered;
    }, [parsedLogs, searchQuery, levelFilter]);

    const stats = useMemo(() => {
        const statsByLevel = {};
        parsedLogs.forEach(log => {
            statsByLevel[log.level] = (statsByLevel[log.level] || 0) + 1;
        });
        
        return {
            total: parsedLogs.length,
            byLevel: statsByLevel,
            modules: [...new Set(parsedLogs.map(l => l.module))]
        };
    }, [parsedLogs]);

    if (!logs || logs.length === 0) {
        return null;
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between w-full text-left"
                >
                    <CardTitle className="text-green-400 text-base flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Terminal className="w-4 h-4" />
                        {title}
                        <Badge variant="outline" className="ml-2">{stats.total} entrées</Badge>
                    </CardTitle>
                </button>
            </CardHeader>

            {isExpanded && (
                <CardContent>
                    {showStats && (
                        <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                {Object.entries(stats.byLevel).map(([level, count]) => {
                                    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.INFO;
                                    const Icon = config.icon;
                                    return (
                                        <div key={level} className={`p-2 rounded ${config.bg} border ${config.border}`}>
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-3 h-3 ${config.color}`} />
                                                <span className="text-xs text-slate-400">{level}</span>
                                            </div>
                                            <div className={`text-lg font-bold ${config.color}`}>{count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-xs text-slate-400">
                                Modules: {stats.modules.join(', ')}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 mb-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher dans les logs..."
                                    className="pl-8 bg-slate-900 border-slate-700 text-slate-300 h-9"
                                />
                            </div>
                            <select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-300 text-sm"
                            >
                                <option value="all">Tous niveaux</option>
                                {Object.keys(stats.byLevel).map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <ScrollArea className="h-96">
                        <div className="space-y-1 font-mono text-xs">
                            {filteredLogs.map((log) => {
                                const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.INFO;
                                const Icon = config.icon;
                                
                                return (
                                    <div
                                        key={log.index}
                                        onClick={() => { setSelectedLog(log); setShowDialog(true); }}
                                        className={`p-2 rounded border ${config.bg} ${config.border} hover:bg-opacity-30 transition-colors cursor-pointer`}
                                        title="Click to view details"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${config.color}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-500">[{log.timestamp}ms]</span>
                                                    <Badge variant="outline" className="text-xs">{log.module}</Badge>
                                                    <Badge className={`text-xs ${config.bg}`}>{log.level}</Badge>
                                                </div>
                                                <div className="text-slate-300 break-words">{log.message}</div>
                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <div className="mt-1 p-2 bg-slate-900 rounded text-slate-400 text-xs overflow-auto">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            Aucun log ne correspond aux filtres
                        </div>
                    )}
                </CardContent>
            )}

            {showDialog && selectedLog && (
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-green-400">Log details</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Click outside to close
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-slate-500">Timestamp</div>
                                    <div className="text-slate-200">{selectedLog.timestamp} ms</div>
                                </div>
                                <div>
                                    <div className="text-slate-500">Module</div>
                                    <div className="text-slate-200">{selectedLog.module}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500">Level</div>
                                    <div className="text-slate-200">{selectedLog.level}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-500 mb-1">Message</div>
                                <div className="bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 whitespace-pre-wrap">
                                    {selectedLog.message}
                                </div>
                            </div>
                            {selectedLog.metadata && (
                                <div>
                                    <div className="text-slate-500 mb-1">Metadata</div>
                                    <pre className="bg-slate-800 border border-slate-700 rounded p-2 text-slate-300 overflow-auto max-h-64">
{JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.raw && (
                                <div>
                                    <div className="text-slate-500 mb-1">Raw</div>
                                    <pre className="bg-slate-800 border border-slate-700 rounded p-2 text-slate-400 overflow-auto max-h-64">
{selectedLog.raw}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}
