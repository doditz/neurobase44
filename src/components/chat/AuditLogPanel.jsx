import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Terminal, ChevronRight, Brain, Users, Zap, Clock,
    Search, MessageSquare, Activity, Cpu
} from 'lucide-react';

/**
 * AuditLogPanel
 * ----------------------------------------------------------------------------
 * Renders the NEURONAS pipeline transparency layer directly in chat:
 *  - Cognitive metrics (complexity, archetype, path, personas, rounds, time, tokens)
 *  - Web-grounding / SMAS activation status
 *  - The raw orchestrator audit log (timestamped levels)
 *  - The full multi-persona debate transcript (per round)
 *
 * Pure presentational component — driven entirely by the assistant message
 * metadata produced by chatOrchestratorFast. No data fetching, no side effects.
 */

const LEVEL_COLORS = {
    START: 'text-cyan-400',
    ANALYZE: 'text-blue-400',
    ASSESSED: 'text-blue-400',
    HISTORY: 'text-slate-400',
    WEBSEARCH: 'text-emerald-400',
    WEBSEARCH_FAIL: 'text-red-400',
    FAST_PATH: 'text-yellow-400',
    MEDIUM_PATH: 'text-yellow-400',
    FULL_PATH: 'text-purple-400',
    ADAPTIVE: 'text-purple-300',
    QRONAS_OK: 'text-green-400',
    QRONAS_FAIL: 'text-red-400',
    DONE: 'text-green-400',
    FATAL: 'text-red-500'
};

const Metric = ({ icon: Icon, label, value, color = 'text-green-400' }) => (
    <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-slate-400">
            <Icon className="w-3 h-3" />
            {label}
        </span>
        <span className={cn('font-mono font-semibold', color)}>{value}</span>
    </div>
);

export default function AuditLogPanel({ metadata }) {
    const [open, setOpen] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [showDebate, setShowDebate] = useState(false);

    if (!metadata) return null;

    const logs = metadata.audit_logs || [];
    const debate = metadata.debate_history || [];
    const hasAnything =
        logs.length > 0 ||
        debate.length > 0 ||
        metadata.complexity_score !== undefined;

    if (!hasAnything) return null;

    const complexity = metadata.complexity_score != null
        ? `${(metadata.complexity_score * 100).toFixed(0)}%` : '—';
    const personas = Array.isArray(metadata.personas_used)
        ? metadata.personas_used.length : (metadata.personas_used || 0);
    const rounds = metadata.debate_rounds_executed ?? 0;
    const timeS = metadata.total_time_ms != null
        ? `${(metadata.total_time_ms / 1000).toFixed(1)}s` : '—';
    const tokens = metadata.estimated_tokens != null
        ? metadata.estimated_tokens.toLocaleString() : '—';

    // Group debate transcript by round
    const rounds_map = debate.reduce((acc, d) => {
        const r = d.round || 1;
        (acc[r] = acc[r] || []).push(d);
        return acc;
    }, {});

    return (
        <Card className="mt-3 bg-slate-900/70 border-cyan-700/40">
            <CardHeader className="py-2 px-3">
                <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        NEURONAS Audit Log & Cognitive Metrics
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        {metadata.debate_method === 'tri_llm_smas' && (
                            <Badge variant="outline" className="text-pink-300 border-pink-600/50 text-[10px] py-0">
                                <Cpu className="w-2.5 h-2.5 mr-1" />Tri-LLM
                            </Badge>
                        )}
                        {metadata.smas_activated && (
                            <Badge variant="outline" className="text-purple-300 border-purple-600/50 text-[10px] py-0">
                                <Brain className="w-2.5 h-2.5 mr-1" />SMAS
                            </Badge>
                        )}
                        {metadata.web_search_executed && (
                            <Badge variant="outline" className="text-emerald-300 border-emerald-600/50 text-[10px] py-0">
                                <Search className="w-2.5 h-2.5 mr-1" />Grounded
                            </Badge>
                        )}
                        <ChevronRight className={cn('w-3 h-3 text-cyan-400 transition-transform', open && 'rotate-90')} />
                    </div>
                </button>
            </CardHeader>

            {open && (
                <CardContent className="py-2 px-3 space-y-3">
                    {/* Cognitive metrics grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <Metric icon={Brain} label="Complexity" value={complexity} />
                        <Metric icon={Activity} label="Archetype" value={metadata.archetype || '—'} color="text-blue-400" />
                        <Metric icon={Cpu} label="Path" value={metadata.path_used || 'full'} color="text-purple-400" />
                        <Metric icon={Users} label="Personas" value={personas} color="text-blue-400" />
                        <Metric icon={MessageSquare} label="Debate Rounds" value={rounds} color="text-purple-300" />
                        <Metric icon={Clock} label="Time" value={timeS} />
                        <Metric icon={Zap} label="Est. Tokens" value={tokens} color="text-orange-400" />
                        <Metric icon={Search} label="Web Search" value={metadata.web_search_executed ? 'Yes' : 'No'} color="text-emerald-400" />
                    </div>

                    {/* Debate transcript */}
                    {debate.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowDebate(!showDebate)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200"
                            >
                                <ChevronRight className={cn('w-3 h-3 transition-transform', showDebate && 'rotate-90')} />
                                Debate Transcript ({debate.length} contributions)
                            </button>
                            {showDebate && (
                                <div className="mt-2 space-y-2">
                                    {Object.entries(rounds_map).map(([round, items]) => (
                                        <div key={round} className="border-l-2 border-purple-700/40 pl-2">
                                            <div className="text-[10px] uppercase tracking-wide text-purple-400 mb-1">
                                                Round {round}
                                            </div>
                                            <div className="space-y-1.5">
                                                {items.map((it, idx) => (
                                                    <div key={idx} className="bg-slate-800/60 rounded p-2">
                                                        <div className="text-[11px] font-semibold text-cyan-300 mb-0.5">
                                                            {it.persona}
                                                        </div>
                                                        <div className="text-[11px] text-slate-300 whitespace-pre-wrap break-words">
                                                            {it.response}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Raw audit log */}
                    {logs.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowRaw(!showRaw)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                            >
                                <ChevronRight className={cn('w-3 h-3 transition-transform', showRaw && 'rotate-90')} />
                                Raw Pipeline Log ({logs.length} entries)
                            </button>
                            {showRaw && (
                                <pre className="mt-2 bg-black/50 rounded-md p-2 text-[10px] leading-relaxed max-h-60 overflow-auto font-mono">
                                    {logs.map((l, idx) => {
                                        const level = typeof l === 'object' ? l.level : '';
                                        const t = typeof l === 'object' ? l.t : '';
                                        const msg = typeof l === 'object' ? l.msg : String(l);
                                        return (
                                            <div key={idx} className="flex gap-2">
                                                <span className="text-slate-600">{t != null ? `${t}ms` : ''}</span>
                                                <span className={cn('font-semibold', LEVEL_COLORS[level] || 'text-slate-400')}>
                                                    [{level}]
                                                </span>
                                                <span className="text-slate-300">{msg}</span>
                                            </div>
                                        );
                                    })}
                                </pre>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}