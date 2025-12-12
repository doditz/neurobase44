import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    MessageSquare, 
    Brain, 
    Zap, 
    Clock,
    ChevronRight,
    ChevronDown,
    Target
} from 'lucide-react';

export default function DebateVisualizationModal({ isOpen, onClose, debateData }) {
    const [expandedRounds, setExpandedRounds] = useState({});

    if (!debateData) return null;

    const { 
        debate_metadata = {},
        debate_history = [],
        personas_used = [],
        complexity_score = 0,
        d2_activation = 0,
        debate_rounds_executed = 0,
        total_time_ms = 0
    } = debateData;

    const toggleRound = (roundIndex) => {
        setExpandedRounds(prev => ({
            ...prev,
            [roundIndex]: !prev[roundIndex]
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-green-400 flex items-center gap-2">
                        <Brain className="w-6 h-6" />
                        Analyse Détaillée du Débat
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">
                            Vue d'ensemble
                        </TabsTrigger>
                        <TabsTrigger value="debate" className="data-[state=active]:bg-green-600">
                            Débat Complet
                        </TabsTrigger>
                        <TabsTrigger value="personas" className="data-[state=active]:bg-green-600">
                            Personas
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-4">
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-4 pr-4">
                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                            <Brain className="w-3 h-3" />
                                            Complexité
                                        </div>
                                        <div className="text-xl font-bold text-green-400">
                                            {(complexity_score * 100).toFixed(0)}%
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                            <Zap className="w-3 h-3" />
                                            D2 Activation
                                        </div>
                                        <div className="text-xl font-bold text-orange-400">
                                            {(d2_activation * 100).toFixed(0)}%
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                            <MessageSquare className="w-3 h-3" />
                                            Rondes
                                        </div>
                                        <div className="text-xl font-bold text-blue-400">
                                            {debate_rounds_executed}
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                            <Clock className="w-3 h-3" />
                                            Temps
                                        </div>
                                        <div className="text-xl font-bold text-purple-400">
                                            {(total_time_ms / 1000).toFixed(1)}s
                                        </div>
                                    </div>
                                </div>

                                {/* Thinking Steps */}
                                {debate_metadata.thinking_steps && (
                                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                        <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Étapes de Traitement
                                        </h3>
                                        <div className="space-y-2">
                                            {debate_metadata.thinking_steps.map((step, idx) => (
                                                <div key={idx} className="flex items-center gap-3 text-xs">
                                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-slate-300 font-medium">
                                                            {step.step.replace(/_/g, ' ')}
                                                        </div>
                                                        <div className="text-slate-500">
                                                            {Object.entries(step)
                                                                .filter(([key]) => key !== 'step')
                                                                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                                                                .join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* System Configuration */}
                                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                    <h3 className="text-sm font-semibold text-blue-400 mb-3">Configuration Dynamique</h3>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-400">Agent: </span>
                                            <Badge className="bg-slate-700">{debate_metadata.agent_name || 'N/A'}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Archétype: </span>
                                            <Badge className="bg-slate-700">{debate_metadata.archetype || 'N/A'}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Hémisphère: </span>
                                            <Badge className="bg-slate-700">{debate_metadata.dominant_hemisphere || 'N/A'}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">SMAS: </span>
                                            <Badge className={debate_metadata.smas_activated ? 'bg-green-600' : 'bg-red-600'}>
                                                {debate_metadata.smas_activated ? 'Actif' : 'Inactif'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Debate Tab */}
                    <TabsContent value="debate" className="mt-4">
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-3 pr-4">
                                {debate_history && debate_history.length > 0 ? (
                                    debate_history.map((round, roundIndex) => (
                                        <div key={roundIndex} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                                            <button
                                                onClick={() => toggleRound(roundIndex)}
                                                className="w-full p-3 flex items-center justify-between hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-sm">
                                                        {roundIndex + 1}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-sm font-semibold text-green-400">
                                                            Ronde {roundIndex + 1}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {round.persona || 'Multiple personas'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {expandedRounds[roundIndex] ? (
                                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                                )}
                                            </button>

                                            {expandedRounds[roundIndex] && (
                                                <div className="p-4 bg-slate-900 border-t border-slate-700">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <div className="text-xs text-slate-400 mb-1">Prompt:</div>
                                                            <div className="text-sm text-slate-300 bg-slate-800 p-2 rounded">
                                                                {round.prompt || 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-400 mb-1">Réponse:</div>
                                                            <div className="text-sm text-slate-200 bg-slate-800 p-2 rounded whitespace-pre-wrap">
                                                                {round.response || 'N/A'}
                                                            </div>
                                                        </div>
                                                        {round.time_ms && (
                                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {round.time_ms}ms
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        Aucun historique de débat disponible
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Personas Tab */}
                    <TabsContent value="personas" className="mt-4">
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-3 pr-4">
                                {personas_used && personas_used.length > 0 ? (
                                    personas_used.map((persona, idx) => (
                                        <div key={idx} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-green-400">
                                                        {persona.name || persona}
                                                    </h4>
                                                    {persona.handle && (
                                                        <Badge className="bg-slate-700 mt-1">{persona.handle}</Badge>
                                                    )}
                                                </div>
                                                {persona.expertise_score && (
                                                    <Badge className="bg-blue-600">
                                                        Expertise: {(persona.expertise_score * 100).toFixed(0)}%
                                                    </Badge>
                                                )}
                                            </div>
                                            {persona.domain && (
                                                <div className="text-xs text-slate-400 mt-2">
                                                    <span className="font-semibold">Domaine:</span> {persona.domain}
                                                </div>
                                            )}
                                            {persona.capabilities && (
                                                <div className="text-xs text-slate-300 mt-2">
                                                    {persona.capabilities}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        Aucune information sur les personas disponible
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}