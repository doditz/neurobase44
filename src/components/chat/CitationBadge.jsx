import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';

export default function CitationBadge({ citation, index }) {
    const [showDetails, setShowDetails] = useState(false);

    const getStatusIcon = () => {
        if (citation.verified) {
            return <CheckCircle2 className="w-3 h-3 text-green-400" />;
        }
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
    };

    const getStatusColor = () => {
        if (citation.verified) return 'border-green-600 text-green-400 hover:bg-green-900/30';
        return 'border-yellow-600 text-yellow-400 hover:bg-yellow-900/30';
    };

    return (
        <>
            <button
                onClick={() => setShowDetails(true)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-colors ${getStatusColor()}`}
            >
                {getStatusIcon()}
                <span>[{index + 1}]</span>
            </button>

            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-green-400 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5" />
                            Citation Source [{index + 1}]
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <Card className="bg-slate-700 border-slate-600">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                                    {citation.verified ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            Source Vérifiée
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                                            Source Non Vérifiée
                                        </>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">URL:</p>
                                    <a
                                        href={citation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-400 hover:underline break-all flex items-center gap-2"
                                    >
                                        {citation.url}
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Contexte:</p>
                                    <Badge variant="outline" className="border-slate-500 text-slate-300">
                                        {citation.context}
                                    </Badge>
                                </div>

                                {citation.relevance_score !== undefined && (
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Pertinence:</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-600 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${citation.relevance_score * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-300">
                                                {(citation.relevance_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Button
                            onClick={() => window.open(citation.url, '_blank')}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ouvrir la Source
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}