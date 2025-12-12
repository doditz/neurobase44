
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageSquare, Clock, Brain, Pencil, Check, X, Music } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Debate } from '@/entities/Debate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ConversationList({ debates, activeDebate, onSelectDebate, isLoading }) {
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    const startEditing = (debate, e) => {
        e.stopPropagation();
        setEditingId(debate.id);
        setEditingTitle(debate.topic || debate.title || 'Sans titre');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingTitle('');
    };

    const saveTitle = async (debateId, e) => {
        e.stopPropagation();
        if (!editingTitle.trim()) {
            toast.error('Le titre ne peut pas être vide');
            return;
        }

        try {
            await Debate.update(debateId, { topic: editingTitle.trim() });
            toast.success('Titre mis à jour');
            setEditingId(null);
            setEditingTitle('');
            window.location.reload(); // Simple refresh
        } catch (error) {
            console.error('Failed to update title:', error);
            toast.error('Échec de la mise à jour du titre');
        }
    };

    const getConversationTitle = (debate) => {
        if (debate.topic && debate.topic.trim() && !debate.topic.includes('Débat sur :') && !debate.topic.includes('Suno Composition')) {
            return debate.topic;
        }
        if (debate.title && debate.title.trim()) {
            return debate.title;
        }
        // Generate a title from the creation date
        const date = new Date(debate.created_date);
        const type = debate.agent_name === 'suno_prompt_architect' ? 'Composition' : 'Débat';
        return `${type} du ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const getAgentIcon = (agentName) => {
        switch(agentName) {
            case 'suno_prompt_architect':
                return <Music className="w-3 h-3 mt-0.5 text-pink-400 flex-shrink-0" />;
            case 'smas_debater':
            default:
                return <Brain className="w-3 h-3 mt-0.5 text-green-400 flex-shrink-0" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-3">
                <Brain className="w-6 h-6 animate-pulse text-green-400" />
            </div>
        );
    }

    if (!debates || debates.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-green-400">
                <MessageSquare className="w-6 h-6 mb-2" />
                <p className="text-xs">Aucune conversation</p>
                <p className="text-xs text-slate-500">Cliquez sur "New" pour commencer</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-2 border-b border-slate-700">
                <h3 className="text-xs font-medium text-green-400">Historique ({debates.length})</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-1 space-y-1">
                    {debates.map((debate) => {
                        const isEditing = editingId === debate.id;
                        const displayTitle = getConversationTitle(debate);
                        
                        return (
                            <div
                                key={debate.id}
                                className={cn(
                                    "w-full text-left p-2 rounded-md transition-colors group",
                                    activeDebate?.id === debate.id
                                        ? "bg-orange-900/30 border border-orange-600/50"
                                        : "hover:bg-slate-700"
                                )}
                            >
                                {isEditing ? (
                                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <Input
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            className="h-7 text-xs bg-slate-600 border-slate-500 text-green-300"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveTitle(debate.id, e);
                                                if (e.key === 'Escape') cancelEditing();
                                            }}
                                        />
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => saveTitle(debate.id, e)}
                                                className="h-6 w-6 text-green-400 hover:bg-green-900/30"
                                            >
                                                <Check className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={cancelEditing}
                                                className="h-6 w-6 text-red-400 hover:bg-red-900/30"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onSelectDebate(debate)}
                                        className="w-full flex items-start gap-2"
                                    >
                                        {getAgentIcon(debate.agent_name)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                                <p className={cn(
                                                    "font-medium text-xs truncate",
                                                    activeDebate?.id === debate.id ? "text-orange-400" : "text-green-300"
                                                )}>
                                                    {displayTitle}
                                                </p>
                                                <button
                                                    onClick={(e) => startEditing(debate, e)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                >
                                                    <Pencil className="w-3 h-3 text-slate-400 hover:text-green-400" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                                <p className="text-xs text-slate-500">
                                                    {formatDistanceToNow(new Date(debate.created_date), { addSuffix: true, locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
