import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain, MessageSquare, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function WelcomeBackModal({ isOpen, onClose, user, lastConversation, onContinue, onStartNew }) {
    if (!user || !lastConversation) return null;

    const timeAgo = formatDistanceToNow(new Date(lastConversation.created_date), { 
        addSuffix: true,
        locale: fr 
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center">
                            <Brain className="w-6 h-6 text-slate-900" />
                        </div>
                        <div>
                            <DialogTitle className="text-green-300 text-xl">
                                Bon retour, {user.full_name || user.email.split('@')[0]} ! 👋
                            </DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="text-slate-300 text-base leading-relaxed pt-2">
                        Nous avons discuté {timeAgo} de{' '}
                        <span className="font-semibold text-green-400">
                            {lastConversation.topic || 'votre projet'}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 pt-4">
                    <Button
                        onClick={onContinue}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base"
                    >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Oui, continuer cette conversation
                    </Button>
                    <Button
                        onClick={onStartNew}
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 h-12 text-base"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Non, démarrer un nouveau sujet
                    </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                        <Brain className="w-3 h-3" />
                        Mémoire L1 active - Neuronas se souvient de votre contexte
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}