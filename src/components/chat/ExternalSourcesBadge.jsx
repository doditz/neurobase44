import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, BookOpen, Code, Database, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sourceIcons = {
    'Wikipedia': Globe,
    'arXiv': BookOpen,
    'GitHub': Code,
    'CrossRef': FileText,
    'DBpedia': Database
};

const sourceColors = {
    'Wikipedia': 'border-blue-600 bg-blue-900/20 text-blue-400',
    'arXiv': 'border-purple-600 bg-purple-900/20 text-purple-400',
    'GitHub': 'border-slate-600 bg-slate-900/20 text-slate-400',
    'CrossRef': 'border-green-600 bg-green-900/20 text-green-400',
    'DBpedia': 'border-orange-600 bg-orange-900/20 text-orange-400'
};

export default function ExternalSourcesBadge({ sources }) {
    const [showDetails, setShowDetails] = useState(false);

    if (!sources || sources.length === 0) return null;

    const externalSources = sources.filter(s => s.external);
    if (externalSources.length === 0) return null;

    const sourcesByType = externalSources.reduce((acc, source) => {
        const type = source.source || 'Other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(source);
        return acc;
    }, {});

    return (
        <>
            <button
                onClick={() => setShowDetails(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-600 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors text-xs"
            >
                <Database className="w-3 h-3" />
                <span>{externalSources.length} sources externes</span>
            </button>

            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-blue-400 flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Sources de Connaissances Externes
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {Object.entries(sourcesByType).map(([sourceType, items]) => {
                            const Icon = sourceIcons[sourceType] || Globe;
                            const colorClass = sourceColors[sourceType] || 'border-slate-600 bg-slate-900/20 text-slate-400';
                            
                            return (
                                <Card key={sourceType} className={cn("border-2", colorClass)}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            {sourceType}
                                            <Badge variant="outline" className="ml-auto">
                                                {items.length} résultat{items.length > 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {items.map((source, idx) => (
                                            <div key={idx} className="bg-slate-700 rounded p-3">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h4 className="text-sm font-semibold text-slate-200 flex-1">
                                                        {source.title}
                                                    </h4>
                                                </div>
                                                
                                                {source.authors && (
                                                    <p className="text-xs text-slate-400 mb-1">
                                                        <span className="font-medium">Auteurs:</span> {source.authors}
                                                    </p>
                                                )}
                                                
                                                {source.published_date && (
                                                    <p className="text-xs text-slate-400 mb-1">
                                                        <span className="font-medium">Date:</span> {source.published_date}
                                                    </p>
                                                )}
                                                
                                                {source.stars && (
                                                    <p className="text-xs text-slate-400 mb-1">
                                                        <span className="font-medium">⭐ Stars:</span> {source.stars.toLocaleString()}
                                                    </p>
                                                )}
                                                
                                                {source.doi && (
                                                    <p className="text-xs text-slate-400 mb-1">
                                                        <span className="font-medium">DOI:</span> {source.doi}
                                                    </p>
                                                )}
                                                
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(source.url, '_blank')}
                                                        className="text-xs bg-slate-600 border-slate-500 hover:bg-slate-500"
                                                    >
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        Ouvrir
                                                    </Button>
                                                    
                                                    <Badge variant="outline" className="text-xs border-slate-500">
                                                        {source.context}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        
                        <div className="bg-blue-900/20 border border-blue-600/30 rounded p-3 text-xs text-blue-300">
                            <p className="mb-2">
                                <strong>ℹ️ À propos des sources externes:</strong>
                            </p>
                            <ul className="space-y-1 ml-4 list-disc">
                                <li><strong>Wikipedia:</strong> Encyclopédie collaborative, contexte général</li>
                                <li><strong>arXiv:</strong> Archive de prépublications scientifiques en accès libre</li>
                                <li><strong>GitHub:</strong> Dépôts de code open-source et projets collaboratifs</li>
                                <li><strong>CrossRef:</strong> Articles scientifiques avec DOI, méta-données académiques</li>
                                <li><strong>DBpedia:</strong> Base de connaissances structurées extraite de Wikipedia</li>
                            </ul>
                            <p className="mt-2 italic">
                                Toutes ces sources sont gratuites, en accès libre et ne nécessitent pas de compte.
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}