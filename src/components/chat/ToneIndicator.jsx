import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Smile, Frown, Meh, Sparkles } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ToneIndicator({ toneAnalysis }) {
    if (!toneAnalysis || !toneAnalysis.detected_tones || toneAnalysis.detected_tones.length === 0) {
        return null;
    }

    const getToneIcon = (tone) => {
        if (tone.includes('sarcasm') || tone.includes('irony')) return '😏';
        if (tone.includes('humor') || tone.includes('joke')) return '😄';
        if (tone.includes('cynicism')) return '🙄';
        if (tone.includes('deadpan')) return '😐';
        return '🎭';
    };

    const getToneColor = (tone) => {
        if (tone.includes('sarcasm')) return 'bg-purple-900/30 text-purple-400 border-purple-600';
        if (tone.includes('humor')) return 'bg-yellow-900/30 text-yellow-400 border-yellow-600';
        if (tone.includes('irony')) return 'bg-pink-900/30 text-pink-400 border-pink-600';
        return 'bg-slate-700 text-slate-300 border-slate-600';
    };

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {toneAnalysis.detected_tones.slice(0, 3).map((tone, idx) => (
                    <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                            <Badge 
                                className={`text-xs border ${getToneColor(tone.tone)}`}
                                variant="outline"
                            >
                                {getToneIcon(tone.tone)} {tone.tone}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 border-slate-600">
                            <div className="space-y-1 text-xs">
                                <div className="font-semibold text-green-400">
                                    {tone.tone.charAt(0).toUpperCase() + tone.tone.slice(1)}
                                </div>
                                <div className="text-slate-400">
                                    Confidence: {(tone.confidence * 100).toFixed(0)}%
                                </div>
                                {tone.explanation && (
                                    <div className="text-slate-300 mt-2 max-w-xs">
                                        {tone.explanation}
                                    </div>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ))}
                
                {toneAnalysis.implied_meaning && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className="text-xs border bg-indigo-900/30 text-indigo-400 border-indigo-600" variant="outline">
                                💬 Implied
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 border-slate-600 max-w-md">
                            <div className="text-xs">
                                <div className="font-semibold text-green-400 mb-1">Implied Meaning:</div>
                                <div className="text-slate-300">{toneAnalysis.implied_meaning}</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}