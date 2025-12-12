import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

export default function BatchDetailedLogs({ progressData }) {
    const [expandedLogs, setExpandedLogs] = useState({});

    if (!progressData?.question_logs || progressData.question_logs.length === 0) {
        return null;
    }

    const toggleLog = (index) => {
        setExpandedLogs(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-400 text-sm">
                    📋 Journal Détaillé ({progressData.question_logs.length} entrées)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-80">
                    <div className="space-y-2">
                        {progressData.question_logs.map((log, idx) => {
                            const isExpanded = expandedLogs[idx];
                            const isSuccess = log.status === 'success';
                            const isPending = log.status === 'pending' || log.status === 'running';

                            return (
                                <div
                                    key={idx}
                                    className={`border rounded-lg overflow-hidden ${
                                        isSuccess ? 'border-green-600/30 bg-green-900/10' :
                                        isPending ? 'border-blue-600/30 bg-blue-900/10' :
                                        'border-red-600/30 bg-red-900/10'
                                    }`}
                                >
                                    <button
                                        onClick={() => toggleLog(idx)}
                                        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            )}
                                            
                                            {isSuccess ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : isPending ? (
                                                <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-400" />
                                            )}

                                            <div className="flex-1 text-left">
                                                <div className="text-sm text-slate-300 truncate">
                                                    {log.question_text || `Question ${idx + 1}`}
                                                </div>
                                                <div className="flex gap-2 mt-1 text-xs">
                                                    <Badge className={
                                                        isSuccess ? 'bg-green-600' :
                                                        isPending ? 'bg-blue-600' :
                                                        'bg-red-600'
                                                    }>
                                                        {log.status}
                                                    </Badge>
                                                    {log.spg !== undefined && (
                                                        <Badge variant="outline" className="text-green-400">
                                                            SPG: {log.spg.toFixed(3)}
                                                        </Badge>
                                                    )}
                                                    {log.time_ms !== undefined && (
                                                        <Badge variant="outline" className="text-blue-400">
                                                            {log.time_ms}ms
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-2 border-t border-slate-700 space-y-2">
                                            {log.scenario_category && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">Catégorie: </span>
                                                    <span className="text-slate-300">{log.scenario_category}</span>
                                                </div>
                                            )}
                                            
                                            {log.winner && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">Gagnant: </span>
                                                    <Badge className={
                                                        log.winner === 'mode_b' ? 'bg-green-600' :
                                                        log.winner === 'mode_a' ? 'bg-orange-600' :
                                                        'bg-slate-600'
                                                    }>
                                                        {log.winner}
                                                    </Badge>
                                                </div>
                                            )}

                                            {log.personas_count !== undefined && (
                                                <div className="text-xs">
                                                    <span className="text-slate-500">Personas utilisées: </span>
                                                    <span className="text-slate-300">{log.personas_count}</span>
                                                </div>
                                            )}

                                            {log.error && (
                                                <div className="p-2 bg-red-900/20 rounded border border-red-600/50 text-xs">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-red-300">{log.error}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {log.completed_at && (
                                                <div className="text-xs text-slate-500">
                                                    Complété à {new Date(log.completed_at).toLocaleTimeString()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}