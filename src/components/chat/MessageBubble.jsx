import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Copy, Zap, CheckCircle2, AlertCircle, Loader2, 
    ChevronRight, Clock, ChevronDown, Shield, Brain,
    TrendingUp, Users, FileText, ExternalLink, Award,
    BarChart3
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ComplexityIndicator from './ComplexityIndicator';
import SourcingConfidenceIndicator from './SourcingConfidenceIndicator';
import CitationBadge from './CitationBadge';
import DebateAnalysisDisplay from './DebateAnalysisDisplay';
import ExternalSourcesBadge from './ExternalSourcesBadge';
import KaomojiThemedMessage from './KaomojiThemedMessage';

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-slate-50",
                    expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-slate-700">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-slate-500", isError && "text-red-600")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-slate-400 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Parameters:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Result:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FATEScores = ({ fateMetrics }) => {
    if (!fateMetrics) return null;
    
    const { fairness, accountability, transparency, ethics, overall_score } = fateMetrics;
    
    return (
        <Card className="mt-3 bg-green-900/20 border-green-600/50">
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-semibold text-green-300 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Scores FATE
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Fairness:</span>
                        <span className="text-green-400 font-mono">{(fairness * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Accountability:</span>
                        <span className="text-green-400 font-mono">{(accountability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Transparency:</span>
                        <span className="text-green-400 font-mono">{(transparency * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Ethics:</span>
                        <span className="text-green-400 font-mono">{(ethics * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-green-700/50 flex justify-between items-center">
                    <span className="text-slate-300 font-semibold">Overall:</span>
                    <Badge className="bg-green-600">{(overall_score * 100).toFixed(0)}%</Badge>
                </div>
            </CardContent>
        </Card>
    );
};

const SMRCEScores = ({ smrceBreakdown }) => {
    if (!smrceBreakdown) return null;
    
    const { sensory, memory, reasoning, coherence, ethics } = smrceBreakdown;
    
    return (
        <Card className="mt-3 bg-purple-900/20 border-purple-600/50">
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-semibold text-purple-300 flex items-center gap-2">
                    <Brain className="w-3 h-3" />
                    Analyse S.M.R.C.E.
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
                <div className="space-y-1 text-xs">
                    {sensory !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Sensory:</span>
                            <span className="text-purple-400 font-mono">{(sensory * 100).toFixed(0)}%</span>
                        </div>
                    )}
                    {memory !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Memory:</span>
                            <span className="text-purple-400 font-mono">{(memory * 100).toFixed(0)}%</span>
                        </div>
                    )}
                    {reasoning !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Reasoning:</span>
                            <span className="text-purple-400 font-mono">{(reasoning * 100).toFixed(0)}%</span>
                        </div>
                    )}
                    {coherence !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Coherence:</span>
                            <span className="text-purple-400 font-mono">{(coherence * 100).toFixed(0)}%</span>
                        </div>
                    )}
                    {ethics !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Ethics:</span>
                            <span className="text-purple-400 font-mono">{(ethics * 100).toFixed(0)}%</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const DebateRoundsMetrics = ({ debateRounds }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (!debateRounds || debateRounds.length === 0) return null;
    
    return (
        <Card className="mt-3 bg-orange-900/20 border-orange-600/50">
            <CardHeader className="py-2 px-3">
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between"
                >
                    <CardTitle className="text-xs font-semibold text-orange-300 flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" />
                        Métriques des rondes de débat ({debateRounds.length})
                    </CardTitle>
                    <ChevronRight className={cn("w-3 h-3 text-orange-400 transition-transform", expanded && "rotate-90")} />
                </button>
            </CardHeader>
            {expanded && (
                <CardContent className="py-2 px-3 space-y-2">
                    {debateRounds.map((round, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded p-2">
                            <div className="text-xs font-semibold text-orange-400 mb-1">
                                Ronde {round.round_index}: {round.round_label}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Items:</span>
                                    <span className="text-orange-300 font-mono">{round.items_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">D2 Level:</span>
                                    <span className="text-orange-300 font-mono">{(round.d2_level * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Consensus:</span>
                                    <span className="text-orange-300 font-mono">{(round.consensusLevel * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Variance:</span>
                                    <span className="text-orange-300 font-mono">{(round.argumentStrengthVariance * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            )}
        </Card>
    );
};

const ValidationStatus = ({ bronasPreVal, bronasPostVal }) => {
    if (!bronasPreVal && !bronasPostVal) return null;
    
    return (
        <Card className="mt-3 bg-yellow-900/20 border-yellow-600/50">
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-semibold text-yellow-300 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Validation BRONAS
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2 text-xs">
                {bronasPreVal && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400">Pré-validation:</span>
                            <Badge className={bronasPreVal.status === 'passed' ? 'bg-green-600' : 'bg-red-600'}>
                                {bronasPreVal.status}
                            </Badge>
                        </div>
                        {bronasPreVal.bias_score !== undefined && (
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Bias Score:</span>
                                <span className="text-yellow-400 font-mono">{(bronasPreVal.bias_score * 100).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>
                )}
                {bronasPostVal && (
                    <div className="pt-2 border-t border-yellow-700/50">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400">Post-validation:</span>
                            <Badge className={bronasPostVal.status === 'passed' ? 'bg-green-600' : 'bg-red-600'}>
                                {bronasPostVal.status}
                            </Badge>
                        </div>
                        {bronasPostVal.ethics_score !== undefined && (
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Ethics Score:</span>
                                <span className="text-yellow-400 font-mono">{(bronasPostVal.ethics_score * 100).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ProcessingMetrics = ({ qronasMetrics }) => {
    if (!qronasMetrics) return null;
    
    return (
        <Card className="mt-3 bg-slate-800/50 border-slate-600">
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Métriques de traitement
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {qronasMetrics.total_time_ms !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Temps:</span>
                            <span className="text-green-400 font-mono">{(qronasMetrics.total_time_ms / 1000).toFixed(1)}s</span>
                        </div>
                    )}
                    {qronasMetrics.total_tokens !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Tokens:</span>
                            <span className="text-green-400 font-mono">{qronasMetrics.total_tokens.toLocaleString()}</span>
                        </div>
                    )}
                    {qronasMetrics.llm_calls_completed !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">LLM Calls:</span>
                            <span className="text-green-400 font-mono">{qronasMetrics.llm_calls_completed}</span>
                        </div>
                    )}
                    {qronasMetrics.fallback_used && (
                        <div className="col-span-2">
                            <Badge variant="outline" className="text-orange-400 border-orange-600">
                                Fallback Mode
                            </Badge>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// New component definition for DebateMetricsDisplay
const DebateMetricsDisplay = ({ metadata }) => {
    if (!metadata || (!metadata.debate_rounds_executed && !metadata.personas_used)) return null;

    return (
        <Card className="mt-3 bg-red-900/20 border-red-600/50">
            <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-semibold text-red-300 flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" />
                    Débat général métriques
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
                <div className="space-y-1 text-xs">
                    {metadata.debate_rounds_executed !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Rounds exécutés:</span>
                            <span className="text-red-400 font-mono">{metadata.debate_rounds_executed}</span>
                        </div>
                    )}
                    {metadata.personas_used !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-slate-400">Personas utilisés:</span>
                            <span className="text-red-400 font-mono">{metadata.personas_used}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default function MessageBubble({ message }) {
    const [showMetadata, setShowMetadata] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const isUser = message.role === 'user';
    const metadata = message.metadata || {};
    const toneAnalysis = metadata?.tone_analysis;
    
    // Check if message contains Neuronas audit log (kaomoji theming)
    const isKaomojiThemed = message.content && (
        message.content.includes('<(^-^)>') || 
        message.content.includes('(╯°□°)╯') ||
        message.content.includes('NEURONAS_AUDIT_LOG')
    );
    
    // Progressive text reveal for better perceived latency
    React.useEffect(() => {
        if (!isUser && message.progressive && message.content) {
            let index = 0;
            const interval = setInterval(() => {
                if (index < message.content.length) {
                    setDisplayedText(message.content.slice(0, index + 1));
                    index += Math.max(1, Math.floor(message.content.length / 50));
                } else {
                    setDisplayedText(message.content);
                    clearInterval(interval);
                }
            }, 20);
            return () => clearInterval(interval);
        } else if (!isUser) {
            setDisplayedText(message.content);
        }
    }, [message.content, message.progressive, isUser]);
    
    // Check if metadata is rich (assistant message from NEURONAS)
    const hasRichMetadata = !isUser && (
        metadata.fate_metrics || 
        metadata.smrce_breakdown || 
        metadata.debate_rounds_metrics ||
        metadata.citations ||
        metadata.bronas_pre_validation ||
        metadata.bronas_post_validation ||
        metadata.qronas_metrics ||
        metadata.sourcing_confidence_score ||
        metadata.debate_analysis // Added this for DebateAnalysisDisplay
    );
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {/* Tone Indicator for User Messages */}
                {isUser && toneAnalysis && (
                    <div className="mb-2">
                        <ToneIndicator toneAnalysis={toneAnalysis} />
                    </div>
                )}
                
                {/* User Files Display */}
                {message.files && message.files.length > 0 && (
                    <div className="mb-2 space-y-1">
                        {message.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span className="text-slate-300">{file.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Message Content */}
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5",
                        isUser ? "bg-slate-800 text-white" : isKaomojiThemed ? "" : "bg-white border border-slate-200"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : isKaomojiThemed ? (
                            <KaomojiThemedMessage content={message.content} />
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code">
                                                <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2">
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Code copied');
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ children, ...props }) => (
                                        <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                                    ),
                                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-semibold my-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold my-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {/* External Sources Badge (NEW) */}
                {!isUser && message.metadata?.citations && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        <ExternalSourcesBadge sources={message.metadata.citations} />
                        
                        {/* Regular citation badges */}
                        {message.metadata.citations.filter(c => !c.external).map((citation, idx) => (
                            <CitationBadge key={idx} citation={citation} index={idx} />
                        ))}
                    </div>
                )}

                {/* Tool Calls Display */}
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}

                {/* Complexity Indicator */}
                {!isUser && message.metadata && (
                    <ComplexityIndicator metadata={message.metadata} />
                )}

                {/* NEW: Debate Analysis Display */}
                {!isUser && message.metadata && message.metadata.debate_analysis && (
                    <DebateAnalysisDisplay analysis={message.metadata.debate_analysis} />
                )}

                {/* Sourcing Confidence Indicator */}
                {!isUser && message.metadata && (
                    <SourcingConfidenceIndicator metadata={message.metadata} />
                )}

                {/* Debate Metrics Display */}
                {!isUser && message.metadata && (metadata.debate_rounds_executed > 0 || metadata.personas_used) && (
                    <DebateMetricsDisplay metadata={message.metadata} />
                )}

                {/* 🔥 NEW: Rich metadata display for assistant messages */}
                {hasRichMetadata && (
                    <div className="mt-2 w-full">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMetadata(!showMetadata)}
                            className="text-xs text-slate-500 hover:text-slate-300 h-6 px-2"
                        >
                            <Award className="w-3 h-3 mr-1" />
                            {showMetadata ? 'Masquer' : 'Afficher'} les métriques
                            <ChevronRight className={cn("w-3 h-3 ml-1 transition-transform", showMetadata && "rotate-90")} />
                        </Button>

                        {showMetadata && (
                            <div className="space-y-2 mt-2">
                                {/* Removed CitationsDisplay as its logic is now inline or replaced by CitationBadge */}
                                
                                {metadata.fate_metrics && (
                                    <FATEScores fateMetrics={metadata.fate_metrics} />
                                )}
                                
                                {metadata.smrce_breakdown && (
                                    <SMRCEScores smrceBreakdown={metadata.smrce_breakdown} />
                                )}
                                
                                {metadata.debate_rounds_metrics && (
                                    <DebateRoundsMetrics debateRounds={metadata.debate_rounds_metrics} />
                                )}
                                
                                <ValidationStatus 
                                    bronasPreVal={metadata.bronas_pre_validation}
                                    bronasPostVal={metadata.bronas_post_validation}
                                />
                                
                                {metadata.qronas_metrics && (
                                    <ProcessingMetrics qronasMetrics={metadata.qronas_metrics} />
                                )}

                                {metadata.auto_features_activated && (
                                    <Card className="mt-2 bg-indigo-900/20 border-indigo-600/50">
                                        <CardContent className="py-2 px-3">
                                            <div className="flex flex-wrap gap-2">
                                                {metadata.auto_features_activated.citations_enabled && (
                                                    <Badge variant="outline" className="text-indigo-300 border-indigo-600 text-xs">
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        Citations activées
                                                    </Badge>
                                                )}
                                                {metadata.auto_features_activated.conversational_tone && (
                                                    <Badge variant="outline" className="text-indigo-300 border-indigo-600 text-xs">
                                                        <Users className="w-3 h-3 mr-1" />
                                                        Ton conversationnel
                                                    </Badge>
                                                )}
                                                {metadata.auto_features_activated.perplexity_used && (
                                                    <Badge variant="outline" className="text-indigo-300 border-indigo-600 text-xs">
                                                        <Zap className="w-3 h-3 mr-1" />
                                                        Perplexity utilisé
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}