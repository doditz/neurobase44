import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
    Terminal, 
    Download, 
    Search,
    AlertCircle,
    Info,
    AlertTriangle,
    Zap,
    Bug
} from 'lucide-react';

/**
 * LogViewer - Composant réutilisable pour afficher les logs centralisés
 * Principe : Un seul composant pour afficher les logs de n'importe quelle page
 */
export default function LogViewer({ logs = [], title = "System Logs", showStats = true }) {
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    if (!logs || logs.length === 0) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                    <Terminal className="w-8 h-8 mx-auto mb-2" />
                    <p>Aucun log disponible</p>
                </CardContent>
            </Card>
        );
    }

    // Parse logs si format string
    const parsedLogs = logs.map(log => {
        if (typeof log === 'string') {
            // Format: [123ms] [LEVEL] message
            const match = log.match(/\[(\d+)ms\] \[(\w+)\] (.+)/);
            if (match) {
                return {
                    timestamp: parseInt(match[1]),
                    level: match[2],
                    message: match[3]
                };
            }
            return { timestamp: 0, level: 'INFO', message: log };
        }
        return log;
    });

    // Filtrage
    const filteredLogs = parsedLogs.filter(log => {
        const levelMatch = filterLevel === 'ALL' || log.level === filterLevel;
        const searchMatch = !searchTerm || log.message.toLowerCase().includes(searchTerm.toLowerCase());
        return levelMatch && searchMatch;
    });

    // Statistiques
    const stats = parsedLogs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
    }, {});

    const levelConfig = {
        INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/30' },
        DEBUG: { icon: Bug, color: 'text-green-400', bg: 'bg-green-900/30' },
        WARNING: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
        ERROR: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
        CRITICAL: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-900/50' },
        SYSTEM: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-900/30' }
    };

    const handleDownload = () => {
        const logText = parsedLogs.map(log => 
            `[${log.timestamp}ms] [${log.level}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neuronas-logs-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        {title}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        className="text-green-400 hover:text-green-300"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>

                {showStats && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Badge 
                            className="cursor-pointer"
                            variant={filterLevel === 'ALL' ? 'default' : 'outline'}
                            onClick={() => setFilterLevel('ALL')}
                        >
                            ALL ({parsedLogs.length})
                        </Badge>
                        {Object.entries(stats).map(([level, count]) => (
                            <Badge
                                key={level}
                                className={`cursor-pointer ${filterLevel === level ? levelConfig[level]?.bg : ''}`}
                                variant={filterLevel === level ? 'default' : 'outline'}
                                onClick={() => setFilterLevel(level)}
                            >
                                {level} ({count})
                            </Badge>
                        ))}
                    </div>
                )}
            </CardHeader>

            <CardContent>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher dans les logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-900 border-slate-600 text-green-300"
                        />
                    </div>
                </div>

                <ScrollArea className="h-[400px]">
                    <div className="space-y-1 font-mono text-xs">
                        {filteredLogs.map((log, index) => {
                            const config = levelConfig[log.level] || levelConfig.INFO;
                            const Icon = config.icon;

                            return (
                                <div
                                    key={index}
                                    className={`p-2 rounded ${config.bg} border border-slate-700 flex items-start gap-2`}
                                >
                                    <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-slate-500">[{log.timestamp}ms]</span>
                                            <Badge className={`${config.color} text-xs`} variant="outline">
                                                {log.level}
                                            </Badge>
                                        </div>
                                        <p className={`${config.color} break-words`}>
                                            {log.message}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}