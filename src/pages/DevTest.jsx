/**
 * DEVTEST PAGE - Uses Unified Test Runner
 */

import React from 'react';
import { FlaskConical, Sparkles, BarChart3, Shield, Zap } from 'lucide-react';
import UnifiedTestRunner from '@/components/core/UnifiedTestRunner';
import ExportAllButton from '@/components/benchmark/ExportAllButton';
import BatchScenarioConfig from '@/components/benchmark/BatchScenarioConfig';
import BatchDetailedLogs from '@/components/benchmark/BatchDetailedLogs';

const DEVTEST_SCENARIOS = [
    {
        id: 'creative',
        title: 'Test Créatif',
        icon: Sparkles,
        color: 'bg-purple-600',
        prompt: 'Imagine une histoire courte sur un robot qui découvre l\'art de la peinture pour la première fois.',
        description: 'Teste la créativité et l\'imagination'
    },
    {
        id: 'analytical',
        title: 'Test Analytique',
        icon: BarChart3,
        color: 'bg-blue-600',
        prompt: 'Analyse les avantages et inconvénients de l\'énergie nucléaire vs les énergies renouvelables, avec des données chiffrées.',
        description: 'Teste le raisonnement logique et l\'analyse'
    },
    {
        id: 'ethical',
        title: 'Test Éthique',
        icon: Shield,
        color: 'bg-orange-600',
        prompt: 'Un médecin doit choisir entre sauver 5 patients avec un traitement expérimental ou garantir la survie d\'1 patient avec un traitement éprouvé. Que devrait-il faire ?',
        description: 'Teste le raisonnement éthique et moral'
    },
    {
        id: 'technical',
        title: 'Test Technique',
        icon: Zap,
        color: 'bg-green-600',
        prompt: 'Explique comment implémenter un algorithme de tri rapide (quicksort) en Python, avec optimisations et gestion des cas limites.',
        description: 'Teste les compétences techniques et la précision'
    }
];

export default function DevTestPage() {
    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <FlaskConical className="w-8 h-8" />
                            Tests de Développement Neuronas
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Comparez Mode A (LLM seul) vs Mode B (Neuronas complet)
                        </p>
                    </div>
                    <ExportAllButton limit={100} />
                </div>

                {/* Unified Test Runner with Scenario Config */}
                <UnifiedTestRunner
                    testType="devtest"
                    title="Development Tests"
                    subtitle="Test and iterate on Neuronas"
                    scenarios={DEVTEST_SCENARIOS}
                    entityName="BenchmarkResult"
                    orchestratorFunction="benchmarkOrchestrator"
                    accentColor="purple"
                    showBatchConfig={true}
                    BatchConfigComponent={BatchScenarioConfig}
                    EnhancedLogsComponent={BatchDetailedLogs}
                />
            </div>
        </div>
    );
}