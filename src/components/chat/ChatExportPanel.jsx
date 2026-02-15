import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileJson, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatExportPanel({ messages, conversationId, topic, onClose }) {
    const [copied, setCopied] = useState(false);

    const formatMessagesAsText = () => {
        let text = `# Chat Transcript: ${topic || 'Conversation'}\n`;
        text += `# ID: ${conversationId || 'N/A'}\n`;
        text += `# Exported: ${new Date().toLocaleString()}\n`;
        text += `${'='.repeat(60)}\n\n`;

        messages.forEach((msg, idx) => {
            const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
            const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
            text += `[${idx + 1}] ${role} ${timestamp ? `(${timestamp})` : ''}\n`;
            text += `${'-'.repeat(40)}\n`;
            text += `${msg.content}\n\n`;
            
            if (msg.metadata) {
                text += `📊 Metadata: Complexity: ${(msg.metadata.complexity_score * 100).toFixed(0)}%, `;
                text += `Personas: ${msg.metadata.personas_used?.length || 0}, `;
                text += `Time: ${msg.metadata.total_time_ms}ms\n\n`;
            }
        });

        return text;
    };

    const formatMessagesAsMarkdown = () => {
        let md = `# Chat Transcript: ${topic || 'Conversation'}\n\n`;
        md += `**ID:** ${conversationId || 'N/A'}  \n`;
        md += `**Exported:** ${new Date().toLocaleString()}  \n`;
        md += `**Messages:** ${messages.length}\n\n---\n\n`;

        messages.forEach((msg, idx) => {
            const role = msg.role === 'user' ? '**👤 User**' : '**🤖 Assistant**';
            md += `### ${role}\n\n`;
            md += `${msg.content}\n\n`;
            
            if (msg.metadata) {
                md += `> 📊 *Complexity: ${(msg.metadata.complexity_score * 100).toFixed(0)}% | `;
                md += `Personas: ${msg.metadata.personas_used?.join(', ') || 'N/A'} | `;
                md += `Time: ${msg.metadata.total_time_ms}ms*\n\n`;
            }
            md += `---\n\n`;
        });

        return md;
    };

    const formatMessagesAsJSON = () => {
        return JSON.stringify({
            conversation_id: conversationId,
            topic,
            exported_at: new Date().toISOString(),
            message_count: messages.length,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                metadata: msg.metadata
            }))
        }, null, 2);
    };

    const downloadFile = (content, filename, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${filename}`);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(formatMessagesAsText());
            setCopied(true);
            toast.success('Copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const handleExport = (format) => {
        const timestamp = new Date().toISOString().split('T')[0];
        const safeTopic = (topic || 'chat').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        
        switch (format) {
            case 'txt':
                downloadFile(formatMessagesAsText(), `${safeTopic}_${timestamp}.txt`, 'text/plain');
                break;
            case 'md':
                downloadFile(formatMessagesAsMarkdown(), `${safeTopic}_${timestamp}.md`, 'text/markdown');
                break;
            case 'json':
                downloadFile(formatMessagesAsJSON(), `${safeTopic}_${timestamp}.json`, 'application/json');
                break;
        }
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