import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, CheckCircle2, XCircle, Clock, Zap, TrendingUp, Target, Award, ChevronDown, ChevronUp, MessageSquare, Brain, Users } from 'lucide-react';

const safeNum = (val) => (val === null || val === undefined || isNaN(val)) ? 0 : Number(val);

export default function BatchProgressTracker({ progressData, elapsedTime }) {
    if (!progressData) return null;

    const { 
        status, 
        completed_questions, 
        successful_questions = 0,
        failed_questions_count = 0,
        total_questions, 
        progress_percentage, 
        current_question_text,
        real_time_stats = {}
    } = progressData;
    
    const getStatusConfig = () => {
        switch (status) {
            case 'running':
                return { 
                    icon: Loader2, 
                    color: 'text-blue-400', 
                    bgColor: 'bg-blue-900/20', 
                    label: 'En cours', 
                    animate: true 
                };
            case 'completed':
                return { 
                    icon: CheckCircle2, 
                    color: 'text-green-400', 
                    bgColor: 'bg-green-900/20', 
                    label: 'Terminé' 
                };
            case 'failed':
                return { 
                    icon: XCircle, 
                    color: 'text-red-400', 
                    bgColor: 'bg-red-900/20', 
                    label: 'Échoué' 
                };
            default:
                return { 
                    icon: Clock, 
                    color: 'text-slate-400', 
                    bgColor: 'bg-slate-900/20', 
                    label: 'En attente' 
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;
    const remainingQuestions = total_questions - completed_questions;
    const avgTimePerQuestion = completed_questions > 0 ? elapsedTime / completed_questions : 0;
    const estimatedTimeRemaining = real_time_stats.estimated_time_remaining_ms || (remainingQuestions * avgTimePerQuestion);

    const {
        running_avg_spg = 0,
        running_avg_cpu_savings = 0,
        running_avg_token_savings = 0,
        current_pass_rate = 0
    } = real_time_stats;

    return (
        <Card className={`${config.bgColor} border-slate-700 mb-6`}>
            <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
                    Progression du Batch
                    <Badge className={config.bgColor}>{config.label}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                            Question {completed_questions} / {total_questions}
                            {status === 'running' && (
                                <span className="ml-2 text-xs">
                                    (✅ {successful_questions} | ❌ {failed_questions_count})
                                </span>
                            )}
                        </span>
                        <span className="text-green-400 font-semibold">
                            {Math.round(progress_percentage)}%
                        </span>
                    </div>
                    <Progress value={progress_percentage} className="h-3" />
                </div>

                {/* Real-Time Stats - Enhanced */}
                {status === 'running' && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-3 bg-green-900/20 rounded-lg border border-green-600/30">
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    SPG Moy.
                                </div>
                                <div className="text-lg font-bold text-green-400">
                                    {safeNum(running_avg_spg).toFixed(3)}
                                </div>
                                {real_time_stats.median_spg !== undefined && (
                                    <div className="text-xs text-green-300/70 mt-1">
                                        Médiane: {safeNum(real_time_stats.median_spg).toFixed(3)}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    Pass Rate
                                </div>
                                <div className="text-lg font-bold text-blue-400">
                                    {(safeNum(current_pass_rate) * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs text-blue-300/70 mt-1">
                                    {safeNum(successful_questions)}/{safeNum(completed_questions)} réussis
                                </div>
                            </div>
                            <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-600/30">
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    CPU Save
                                </div>
                                <div className="text-lg font-bold text-purple-400">
                                    {safeNum(running_avg_cpu_savings).toFixed(1)}%
                                </div>
                            </div>
                            <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-600/30">
                                <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Token Save
                                </div>
                                <div className="text-lg font-bold text-orange-400">
                                    {safeNum(running_avg_token_savings).toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        {/* Cumulative Scores */}
                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-500 mb-2">📊 Scores Cumulatifs</div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                    <div className="text-slate-400">Somme SPG</div>
                                    <div className="text-green-400 font-bold text-sm">
                                        {safeNum(safeNum(running_avg_spg) * safeNum(completed_questions)).toFixed(2)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400">Questions traitées</div>
                                    <div className="text-blue-400 font-bold text-sm">
                                        {safeNum(completed_questions)}/{safeNum(total_questions)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-400">Projection finale</div>
                                    <div className="text-purple-400 font-bold text-sm">
                                        SPG ~{safeNum(running_avg_spg).toFixed(3)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Current Question */}
                {current_question_text && status === 'running' && (
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                        <div className="text-xs text-slate-500 mb-1">Question actuelle:</div>
                        <div className="text-sm text-slate-300 line-clamp-2">
                            {current_question_text}
                        </div>
                    </div>
                )}

                {/* Time Estimates */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 bg-slate-900 rounded">
                        <div className="text-xs text-slate-500">Temps écoulé</div>
                        <div className="text-sm font-semibold text-blue-400">
                            {Math.round(elapsedTime / 1000)}s
                        </div>
                    </div>
                    <div className="p-2 bg-slate-900 rounded">
                        <div className="text-xs text-slate-500">Temps/question</div>
                        <div className="text-sm font-semibold text-purple-400">
                            {avgTimePerQuestion > 0 ? `${(avgTimePerQuestion / 1000).toFixed(1)}s` : '-'}
                        </div>
                    </div>
                    <div className="p-2 bg-slate-900 rounded">
                        <div className="text-xs text-slate-500">Temps restant</div>
                        <div className="text-sm font-semibold text-orange-400">
                            {estimatedTimeRemaining > 0 ? `~${Math.round(estimatedTimeRemaining / 1000)}s` : '-'}
                        </div>
                    </div>
                </div>

                {/* Performance Indicator */}
                <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded text-xs">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-400">
                        Vitesse moyenne: {avgTimePerQuestion > 0 ? `${(60000 / avgTimePerQuestion).toFixed(1)} questions/min` : 'Calcul en cours...'}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}