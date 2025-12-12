import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export default function PromptValidator({ prompt, validationResults }) {
    if (!validationResults) return null;

    const { quality_score, validation_passed, issues_found, recommendations } = validationResults;

    const getScoreColor = (score) => {
        if (score >= 0.95) return 'text-green-600 bg-green-50';
        if (score >= 0.85) return 'text-orange-600 bg-orange-50';
        return 'text-red-600 bg-red-50';
    };

    const getScoreIcon = (score) => {
        if (score >= 0.95) return <CheckCircle2 className="w-5 h-5" />;
        if (score >= 0.85) return <AlertCircle className="w-5 h-5" />;
        return <XCircle className="w-5 h-5" />;
    };

    return (
        <Card className="mt-4 border-2">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Validation QRONAS
                    </h3>
                    <Badge className={`${getScoreColor(quality_score)} flex items-center gap-1`}>
                        {getScoreIcon(quality_score)}
                        Score: {(quality_score * 100).toFixed(1)}%
                    </Badge>
                </div>

                {issues_found && issues_found.length > 0 && (
                    <div className="mb-3">
                        <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            Issues détectés ({issues_found.length})
                        </h4>
                        <ul className="space-y-1">
                            {issues_found.map((issue, idx) => (
                                <li key={idx} className="text-sm text-slate-600 pl-5 relative">
                                    <span className="absolute left-0 top-1">•</span>
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {recommendations && recommendations.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Recommandations ({recommendations.length})
                        </h4>
                        <ul className="space-y-1">
                            {recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-slate-600 pl-5 relative">
                                    <span className="absolute left-0 top-1">•</span>
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {validation_passed && issues_found.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Prompt validé avec succès ! Prêt pour Suno AI.
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}