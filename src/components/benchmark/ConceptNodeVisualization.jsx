import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Eye, Database, Target, Shield } from 'lucide-react';

const CONCEPT_ICONS = {
    sensory: Eye,
    memory: Database,
    reasoning: Target,
    coherence: Zap,
    ethics: Shield,
    cultural: Brain,
    technical: Target,
    creative: Brain
};

const CONCEPT_COLORS = {
    sensory: 'bg-blue-500',
    memory: 'bg-purple-500',
    reasoning: 'bg-green-500',
    coherence: 'bg-cyan-500',
    ethics: 'bg-yellow-500',
    cultural: 'bg-pink-500',
    technical: 'bg-indigo-500',
    creative: 'bg-orange-500'
};

export default function ConceptNodeVisualization({ concept_nodes = [] }) {
    if (concept_nodes.length === 0) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                    No concept nodes available for this result
                </CardContent>
            </Card>
        );
    }

    // Group by concept type
    const grouped = concept_nodes.reduce((acc, node) => {
        if (!acc[node.concept_type]) {
            acc[node.concept_type] = [];
        }
        acc[node.concept_type].push(node);
        return acc;
    }, {});

    // Calculate average activation per concept type
    const concept_summary = Object.entries(grouped).map(([type, nodes]) => ({
        type,
        avg_activation: nodes.reduce((sum, n) => sum + n.activation_strength, 0) / nodes.length,
        total_contribution: nodes.reduce((sum, n) => sum + n.ars_contribution, 0),
        node_count: nodes.length,
        is_critical: nodes.some(n => n.is_bottleneck)
    })).sort((a, b) => b.total_contribution - a.total_contribution);

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-300 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Concept-Bottleneck Analysis (Explainability Layer)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3">
                    {concept_summary.map((concept) => {
                        const Icon = CONCEPT_ICONS[concept.type] || Brain;
                        const colorClass = CONCEPT_COLORS[concept.type] || 'bg-gray-500';

                        return (
                            <div key={concept.type} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-green-400" />
                                        <span className="font-medium text-green-300 capitalize">{concept.type}</span>
                                        {concept.is_critical && (
                                            <Badge className="bg-orange-600 text-white text-xs">
                                                Critical Node
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-sm text-slate-400">
                                        {concept.node_count} activation{concept.node_count > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                                            <span>Activation Strength</span>
                                            <span>{(concept.avg_activation * 100).toFixed(0)}%</span>
                                        </div>
                                        <Progress 
                                            value={concept.avg_activation * 100} 
                                            className="h-2"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                                            <span>ARS Contribution</span>
                                            <span>{(concept.total_contribution * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${colorClass} transition-all`}
                                                style={{ width: `${Math.min(100, concept.total_contribution * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-medium text-green-300 mb-2">Decision Path</h4>
                    <p className="text-xs text-slate-400">
                        This visualization shows which cognitive concepts drove the Neuronas decision.
                        Critical nodes are bottlenecks where key decisions were made.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}