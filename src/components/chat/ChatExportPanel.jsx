import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileJson, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { exportData } from '@/components/utils/FileExporter';

export default function ChatExportPanel({ messages, conversationId, topic, onClose }) {
    const [copied, setCopied] = useState(false);

    const formatters = {
        txt: () => {
            let text = `# Chat Transcript: ${topic || 'Conversation'}\n`;
            text += `# ID: ${conversationId || 'N/A'}\n`;
            text += `# Exported: ${new Date().toLocaleString()}\n`;
            text += `${'='.repeat(60)}\n\n`;
            messages.forEach((msg, idx) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                text += `[${idx + 1}] ${role}\n${'-'.repeat(40)}\n${msg.content || ''}\n\n`;
                if (msg.metadata?.complexity_score) {
                    text += `Metadata: Complexity: ${(msg.metadata.complexity_score * 100).toFixed(0)}%, Personas: ${msg.metadata.personas_used?.length || 0}, Time: ${msg.metadata.total_time_ms}ms\n\n`;
                }
            });
            return text;
        },
        md: () => {
            let md = `# Chat Transcript: ${topic || 'Conversation'}\n\n`;
            md += `**ID:** ${conversationId || 'N/A'}  \n**Exported:** ${new Date().toLocaleString()}  \n**Messages:** ${messages.length}\n\n---\n\n`;
            messages.forEach(msg => {
                md += `### **${msg.role === 'user' ? 'User' : 'Assistant'}**\n\n${msg.content || ''}\n\n`;
                if (msg.metadata?.complexity_score) {
                    md += `> *Complexity: ${(msg.metadata.complexity_score * 100).toFixed(0)}% | Personas: ${msg.metadata.personas_used?.join(', ') || 'N/A'} | Time: ${msg.metadata.total_time_ms}ms*\n\n`;
                }
                md += `---\n\n`;
            });
            return md;
        },
        json: () => ({ conversation_id: conversationId, topic, exported_at: new Date().toISOString(), message_count: messages.length, messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp, metadata: m.metadata })) })
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(formatters.txt());
            setCopied(true);
            toast.success('Copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch { toast.error('Failed to copy'); }
    };

    const handleExport = (format) => {
        exportData(messages, topic || 'chat', format, formatters);
        toast.success(`Downloaded .${format}`);
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Transcript
                </CardTitle>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="w-4 h-4 text-slate-400" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Badge variant="outline">{messages.length} messages</Badge>
                    <span>{topic || 'Untitled'}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('txt')}
                        className="border-slate-600 text-slate-300 hover:text-green-400"
                    >
                        <FileText className="w-3 h-3 mr-1" />
                        .txt
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('md')}
                        className="border-slate-600 text-slate-300 hover:text-green-400"
                    >
                        <FileText className="w-3 h-3 mr-1" />
                        .md
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('json')}
                        className="border-slate-600 text-slate-300 hover:text-green-400"
                    >
                        <FileJson className="w-3 h-3 mr-1" />
                        .json
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={copyToClipboard}
                        className="border-slate-600 text-slate-300 hover:text-green-400"
                    >
                        {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        Copy
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}