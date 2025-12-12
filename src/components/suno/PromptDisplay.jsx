import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCheck, Music } from 'lucide-react';
import { toast } from 'sonner';
import PromptValidator from './PromptValidator';

export default function PromptDisplay({ prompt, validationResults }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            toast.success('Prompt copié dans le presse-papiers !');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Erreur lors de la copie');
        }
    };

    if (!prompt) return null;

    return (
        <div className="space-y-4">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Music className="w-5 h-5 text-purple-600" />
                            Prompt Suno Généré
                        </CardTitle>
                        <Button
                            onClick={handleCopy}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {copied ? (
                                <>
                                    <CheckCheck className="w-4 h-4 mr-2" />
                                    Copié !
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copier
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                        {prompt}
                    </pre>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <span>Caractères: {prompt.length}/3000</span>
                        <span>•</span>
                        <span className={prompt.length > 3000 ? 'text-red-600 font-medium' : ''}>
                            {prompt.length > 3000 ? '⚠️ Trop long !' : '✓ Longueur optimale'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {validationResults && (
                <PromptValidator 
                    prompt={prompt}
                    validationResults={validationResults}
                />
            )}
        </div>
    );
}