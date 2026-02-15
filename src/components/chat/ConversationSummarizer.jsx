import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
    FileText, 
    Loader2, 
    Copy, 
    Check, 
    Download, 
    X,
    Sparkles,
    ChevronDown,
    ChevronUp,
    MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function ConversationSummarizer({ messages, topic, onClose, onInjectSummary }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [summary, setSummary] = useState(null);
    const [copied, setCopied] = useState(false);
    const [selectedRange, setSelectedRange] = useState({ start: 0, end: messages.length });
    const [showRangeSelector, setShowRangeSelector] = useState(false);
    const [summaryType, setSummaryType] = useState('concise'); // concise, detailed, key_points

    const generateSummary = async () => {
        if (messages.length === 0) {
            toast.error('No messages to summarize');
            return;
        }

        setIsGenerating(true);
        try {
            const selectedMessages = messages.slice(selectedRange.start, selectedRange.end);
            
            const conversationText = selectedMessages.map((msg, idx) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                return `[${role}]: ${msg.content?.substring(0, 500) || ''}${msg.content?.length > 500 ? '...' : ''}`;
            }).join('\n\n');

            const promptByType = {
                concise: `Summarize this conversation in 2-3 sentences, capturing the main topic and outcome:`,
                detailed: `Provide a detailed summary of this conversation including:
1. Main topics discussed
2. Key decisions or conclusions
3. Action items or follow-ups mentioned
4. Important technical details`,
                key_points: `Extract the key points from this conversation as a bullet list:
- Main questions asked
- Important answers/insights
- Technical findings
- Recommendations made`
            };

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `${promptByType[summaryType]}

**Conversation Topic:** ${topic || 'General Discussion'}
**Message Count:** ${selectedMessages.length}

**Conversation:**
${conversationText}

Provide a clear, actionable summary.`,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        summary: { type: 'string' },
                        key_topics: { type: 'array', items: { type: 'string' } },
                        action_items: { type: 'array', items: { type: 'string' } },
                        sentiment: { type: 'string' }
                    }
                }
            });

            setSummary({
                ...response,
                type: summaryType,
                messageCount: selectedMessages.length,
                generatedAt: new Date().toISOString()
            });

            toast.success('Summary generated!');
        } catch (error) {
            console.error('Failed to generate summary:', error);
            toast.error('Failed to generate summary');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        if (!summary) return;
        
        const text = formatSummaryAsText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const formatSummaryAsText = () => {
        if (!summary) return '';
        
        let text = `# Conversation Summary\n`;
        text += `**Topic:** ${topic || 'General Discussion'}\n`;
        text += `**Messages:** ${summary.messageCount}\n`;
        text += `**Generated:** ${new Date(summary.generatedAt).toLocaleString()}\n\n`;
        text += `## Summary\n${summary.summary}\n\n`;
        
        if (summary.key_topics?.length > 0) {
            text += `## Key Topics\n${summary.key_topics.map(t => `- ${t}`).join('\n')}\n\n`;
        }
        
        if (summary.action_items?.length > 0) {
            text += `## Action Items\n${summary.action_items.map(a => `- ${a}`).join('\n')}\n\n`;
        }
        
        if (summary.sentiment) {
            text += `## Sentiment: ${summary.sentiment}\n`;
        }
        
        return text;
    };

    const downloadSummary = (format) => {
        const text = formatSummaryAsText();
        const mimeType = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `conversation-summary-${Date.now()}.${format}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        toast.success(`Downloaded as .${format}`);
    };

    const handleInjectToChat = () => {
        if (summary && onInjectSummary) {
            onInjectSummary(`**CONVERSATION SUMMARY**\n\n${summary.summary}\n\nYou can ask me questions about this conversation.`);
            toast.success('Summary injected to chat');
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
                <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Summarizer
                </CardTitle>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="w-3 h-3 text-slate-400" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-3 space-y-3">
                {/* Summary Type Selector */}
                <div className="flex gap-1">
                    {[
                        { value: 'concise', label: 'Concise' },
                        { value: 'detailed', label: 'Detailed' },
                        { value: 'key_points', label: 'Key Points' }
                    ].map(type => (
                        <Button
                            key={type.value}
                            variant={summaryType === type.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSummaryType(type.value)}
                            className={`h-6 px-2 text-xs ${
                                summaryType === type.value 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'border-slate-600 text-slate-400'
                            }`}
                        >
                            {type.label}
                        </Button>
                    ))}
                </div>

                {/* Range Selector */}
                <div>
                    <button
                        onClick={() => setShowRangeSelector(!showRangeSelector)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300"
                    >
                        <MessageSquare className="w-3 h-3" />
                        <span>Messages: {selectedRange.start + 1} - {selectedRange.end} of {messages.length}</span>
                        {showRangeSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    
                    {showRangeSelector && (
                        <div className="mt-2 p-2 bg-slate-900 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500 w-12">From:</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={selectedRange.end}
                                    value={selectedRange.start + 1}
                                    onChange={(e) => setSelectedRange(prev => ({ 
                                        ...prev, 
                                        start: Math.max(0, parseInt(e.target.value) - 1) 
                                    }))}
                                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                />
                                <span className="text-slate-500 w-12">To:</span>
                                <input
                                    type="number"
                                    min={selectedRange.start + 1}
                                    max={messages.length}
                                    value={selectedRange.end}
                                    onChange={(e) => setSelectedRange(prev => ({ 
                                        ...prev, 
                                        end: Math.min(messages.length, parseInt(e.target.value)) 
                                    }))}
                                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                                />
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedRange({ start: 0, end: messages.length })}
                                    className="h-5 px-2 text-xs text-slate-400"
                                >
                                    All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedRange({ start: Math.max(0, messages.length - 10), end: messages.length })}
                                    className="h-5 px-2 text-xs text-slate-400"
                                >
                                    Last 10
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Generate Button */}
                <Button
                    onClick={generateSummary}
                    disabled={isGenerating || messages.length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            Generate Summary
                        </>
                    )}
                </Button>

                {/* Summary Result */}
                {summary && (
                    <div className="space-y-2">
                        <div className="p-3 bg-slate-900 rounded-lg border border-purple-600/30">
                            <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-purple-600 text-xs">{summary.type}</Badge>
                                <span className="text-xs text-slate-500">
                                    {summary.messageCount} messages
                                </span>
                            </div>
                            
                            <ScrollArea className="max-h-40">
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                    {summary.summary}
                                </p>
                            </ScrollArea>

                            {summary.key_topics?.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-slate-700">
                                    <div className="text-xs text-slate-500 mb-1">Key Topics:</div>
                                    <div className="flex flex-wrap gap-1">
                                        {summary.key_topics.map((topic, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {topic}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {summary.action_items?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-700">
                                    <div className="text-xs text-slate-500 mb-1">Action Items:</div>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        {summary.action_items.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                                <span className="text-green-400">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyToClipboard}
                                className="h-6 px-2 text-xs border-slate-600"
                            >
                                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                Copy
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadSummary('md')}
                                className="h-6 px-2 text-xs border-slate-600"
                            >
                                <Download className="w-3 h-3 mr-1" />
                                .md
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadSummary('txt')}
                                className="h-6 px-2 text-xs border-slate-600"
                            >
                                <Download className="w-3 h-3 mr-1" />
                                .txt
                            </Button>
                            {onInjectSummary && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleInjectToChat}
                                    className="h-6 px-2 text-xs border-green-600 text-green-400"
                                >
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Use in Chat
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500">
                        No messages to summarize
                    </div>
                )}
            </CardContent>
        </Card>
    );
}