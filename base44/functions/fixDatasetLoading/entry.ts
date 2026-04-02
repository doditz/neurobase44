import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FIX DATASET LOADING - Autonomous repair for BenchmarkQuestion & DevTestQuestion
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[DatasetFix] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin only' }, { status: 403 });
        }

        addLog('=== DATASET LOADING FIX START ===');

        const repairs = [];
        let questionsCreated = 0;

        // CHECK 1: BenchmarkQuestion entity
        addLog('CHECK 1: BenchmarkQuestion data');
        const benchmarkQuestions = await base44.asServiceRole.entities.BenchmarkQuestion.filter({});
        
        addLog(`Found ${benchmarkQuestions.length} BenchmarkQuestions`);

        if (benchmarkQuestions.length === 0) {
            addLog('⚠️ No BenchmarkQuestions found - creating sample dataset');

            const sampleQuestions = [
                {
                    question_id: 'STD-001',
                    source_benchmark: 'NEURONAS Standard',
                    question_text: 'Expliquez le concept de réchauffement climatique et ses causes principales.',
                    question_type: 'standard_benchmark',
                    facettes_principales: ['reasoning', 'factual_knowledge'],
                    niveau_complexite: 'modéré',
                    hemisphere_dominant: 'Left',
                    ground_truth: 'Le réchauffement climatique est causé principalement par les émissions de gaz à effet de serre.',
                    expected_key_points: ['GES', 'CO2', 'activité humaine', 'température globale'],
                    domain: 'Sciences environnementales'
                },
                {
                    question_id: 'CRE-001',
                    source_benchmark: 'NEURONAS Creative',
                    question_text: 'Imaginez une société où les humains peuvent télécharger leur conscience dans des machines. Quels dilemmes éthiques surgiraient?',
                    question_type: 'creativity_benchmark',
                    facettes_principales: ['creativity', 'ethics', 'imagination'],
                    niveau_complexite: 'complexe',
                    hemisphere_dominant: 'Right',
                    ground_truth: null,
                    expected_key_points: ['identité', 'mortalité', 'inégalité', 'conscience'],
                    domain: 'Philosophie & Éthique'
                },
                {
                    question_id: 'ETH-001',
                    source_benchmark: 'Ethics Benchmark',
                    question_text: 'Un médecin doit choisir entre sauver 5 patients avec un traitement expérimental ou garantir la survie d\'1 patient avec un traitement éprouvé. Analysez ce dilemme.',
                    question_type: 'ethics_benchmark',
                    facettes_principales: ['ethics', 'reasoning', 'cultural_context'],
                    niveau_complexite: 'complexe',
                    hemisphere_dominant: 'Central',
                    ground_truth: null,
                    expected_key_points: ['utilitarisme', 'déontologie', 'risque', 'consentement'],
                    domain: 'Bioéthique',
                    priority_ars_criteria: {
                        ethics_score_min: 0.8,
                        reasoning_score_min: 0.7,
                        cultural_authenticity_min: 0.6
                    }
                },
                {
                    question_id: 'TECH-001',
                    source_benchmark: 'Technical Deep',
                    question_text: 'Implémentez un algorithme de tri rapide (quicksort) en Python avec gestion des cas limites et optimisations.',
                    question_type: 'technical_deep',
                    facettes_principales: ['technical', 'reasoning', 'coherence'],
                    niveau_complexite: 'complexe',
                    hemisphere_dominant: 'Left',
                    ground_truth: null,
                    expected_key_points: ['partition', 'récursion', 'pivot', 'complexité O(n log n)'],
                    domain: 'Informatique'
                },
                {
                    question_id: 'NEU-001',
                    source_benchmark: 'NEURONAS Specific',
                    question_text: 'Comment le système D²STIB réduit-il le bruit sémantique dans le traitement du langage naturel?',
                    question_type: 'neuronas_specific',
                    facettes_principales: ['technical', 'reasoning', 'depth'],
                    niveau_complexite: 'extrême',
                    hemisphere_dominant: 'Left',
                    ground_truth: 'D²STIB utilise des dérivées sémantiques de 1er, 2e et 3e ordre pour identifier les frontières sémantiques et filtrer le bruit.',
                    expected_key_points: ['dérivées sémantiques', 'semantic boundaries', 'filtrage adaptatif', 'savings computationnels'],
                    domain: 'IA & Neurosciences',
                    neuronas_capabilities_tested: ['D²STIB', 'Semantic filtering', 'Computational efficiency']
                }
            ];

            for (const q of sampleQuestions) {
                await base44.asServiceRole.entities.BenchmarkQuestion.create(q);
                questionsCreated++;
            }

            repairs.push({
                action: 'CREATE_BENCHMARK_QUESTIONS',
                status: 'SUCCESS',
                count: questionsCreated
            });
            addLog(`✓ Created ${questionsCreated} BenchmarkQuestions`);
        }

        // CHECK 2: DevTestQuestion entity
        addLog('CHECK 2: DevTestQuestion data');
        const devTestQuestions = await base44.asServiceRole.entities.DevTestQuestion.filter({});
        
        addLog(`Found ${devTestQuestions.length} DevTestQuestions`);

        if (devTestQuestions.length === 0) {
            addLog('⚠️ No DevTestQuestions found - creating sample dataset');

            const sampleDevQuestions = [
                {
                    question_id: 'DEV-CRE-001',
                    question_text: 'Imagine une histoire courte sur un robot qui découvre l\'art de la peinture.',
                    category: 'creative',
                    expected_qualities: ['creativity', 'narrative_coherence', 'emotional_depth'],
                    complexity_level: 'moderate'
                },
                {
                    question_id: 'DEV-ANA-001',
                    question_text: 'Analysez les avantages et inconvénients de l\'énergie nucléaire vs les énergies renouvelables.',
                    category: 'analytical',
                    expected_qualities: ['logical_reasoning', 'balanced_analysis', 'factual_accuracy'],
                    complexity_level: 'high'
                },
                {
                    question_id: 'DEV-ETH-001',
                    question_text: 'Devrait-on autoriser l\'édition génétique sur les embryons humains?',
                    category: 'ethical',
                    expected_qualities: ['ethical_reasoning', 'multiple_perspectives', 'cultural_sensitivity'],
                    complexity_level: 'high'
                },
                {
                    question_id: 'DEV-TECH-001',
                    question_text: 'Écrivez une fonction Python qui calcule la suite de Fibonacci de manière optimisée.',
                    category: 'technical',
                    expected_qualities: ['code_correctness', 'optimization', 'clarity'],
                    complexity_level: 'moderate'
                }
            ];

            for (const q of sampleDevQuestions) {
                await base44.asServiceRole.entities.DevTestQuestion.create(q);
                questionsCreated++;
            }

            repairs.push({
                action: 'CREATE_DEVTEST_QUESTIONS',
                status: 'SUCCESS',
                count: sampleDevQuestions.length
            });
            addLog(`✓ Created ${sampleDevQuestions.length} DevTestQuestions`);
        }

        addLog('=== DATASET FIX COMPLETE ===', { 
            total_questions_created: questionsCreated,
            repairs_applied: repairs.length
        });

        return Response.json({
            success: true,
            message: `Dataset fix applied successfully. Created ${questionsCreated} questions.`,
            repairs,
            summary: {
                benchmark_questions: benchmarkQuestions.length + (repairs.find(r => r.action === 'CREATE_BENCHMARK_QUESTIONS')?.count || 0),
                devtest_questions: devTestQuestions.length + (repairs.find(r => r.action === 'CREATE_DEVTEST_QUESTIONS')?.count || 0)
            },
            logs: log
        });

    } catch (error) {
        addLog('ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});