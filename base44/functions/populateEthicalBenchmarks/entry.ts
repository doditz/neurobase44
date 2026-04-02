import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULATE ETHICAL BENCHMARKS
 * 
 * Fetches ethics scenarios from multiple HF datasets and populates BenchmarkQuestion entity:
 * - relai-ai/ethics-scenarios (190 complex philosophical scenarios)
 * - debasisdwivedy/Dataset_Philosophy_Ethics_Morality (425 philosophy questions)
 * - agentlans/reddit-ethics (9.74k real-world ethical dilemmas)
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[PopulateEthics] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { 
            force_refresh = false,
            relai_limit = 190,
            philosophy_limit = 100,
            reddit_limit = 200
        } = await req.json();

        addLog('=== POPULATING ETHICAL BENCHMARKS ===', { relai_limit, philosophy_limit, reddit_limit, force_refresh });

        // Check if already populated
        if (!force_refresh) {
            const existingCount = (
                await base44.asServiceRole.entities.BenchmarkQuestion.filter({
                    question_type: 'ethics_benchmark'
                }, '-created_date', 1)
            ).length;

            if (existingCount > 0) {
                addLog('⚠️ Ethics benchmarks already populated', { count: existingCount });
                return Response.json({
                    success: true,
                    message: 'Ethics benchmarks already exist. Use force_refresh=true to re-populate.',
                    existing_count: existingCount,
                    logs: log
                });
            }
        }

        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set');
        }

        const allBenchmarks = [];

        // DATASET 1: relai-ai/ethics-scenarios
        addLog('STEP 1: Fetching relai-ai/ethics-scenarios...');
        const relaiUrl = `https://datasets-server.huggingface.co/rows?dataset=relai-ai/ethics-scenarios&config=default&split=train&offset=0&length=${relai_limit}`;
        const relaiRes = await fetch(relaiUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } });
        
        if (!relaiRes.ok) {
            throw new Error(`RELAI API error: ${relaiRes.status}`);
        }
        
        const relaiData = await relaiRes.json();
        addLog('✓ RELAI data fetched', { rows: relaiData.rows.length });

        // Transform RELAI data
        const relaiQuestions = relaiData.rows.map((row, idx) => ({
            question_id: `ETH-RELAI-${String(idx + 1).padStart(3, '0')}`,
            source_benchmark: 'relai-ai/ethics-scenarios',
            question_text: row.row.Question,
            official_benchmark_answer: null,
            question_type: 'ethics_benchmark',
            facettes_principales: ['ethical_reasoning', 'philosophical_frameworks', 'moral_decision_making'],
            niveau_complexite: 'complexe',
            hemisphere_dominant: 'Central',
            ground_truth: row.row.Response,
            expected_key_points: extractKeyPoints(row.row.Reasoning),
            priority_ars_criteria: {
                semantic_fidelity_min: 0.75,
                reasoning_score_min: 0.8,
                ethics_score_min: 0.9,
                coherence_score_min: 0.75,
                depth_score_min: 0.8
            },
            why_difficult_for_standard_llm: 'Requires deep philosophical reasoning, balancing multiple ethical frameworks (Kantian, Utilitarian, Virtue Ethics).',
            neuronas_capabilities_tested: ['BRONAS ethical validation', 'Multi-framework synthesis', 'Philosophical reasoning'],
            domain: 'ethics_philosophy',
            metadata: { reasoning: row.row.Reasoning, response_guidance: row.row.Response }
        }));
        allBenchmarks.push(...relaiQuestions);
        addLog('✓ RELAI transformed', { count: relaiQuestions.length });

        // DATASET 2: debasisdwivedy/Dataset_Philosophy_Ethics_Morality
        addLog('STEP 2: Fetching philosophy dataset...');
        const philoUrl = `https://datasets-server.huggingface.co/rows?dataset=debasisdwivedy/Dataset_Philosophy_Ethics_Morality&config=default&split=train&offset=0&length=${philosophy_limit}`;
        const philoRes = await fetch(philoUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } });
        
        if (!philoRes.ok) {
            throw new Error(`Philosophy API error: ${philoRes.status}`);
        }
        
        const philoData = await philoRes.json();
        addLog('✓ Philosophy data fetched', { rows: philoData.rows.length });

        const philoQuestions = philoData.rows.map((row, idx) => ({
            question_id: `ETH-PHILO-${String(idx + 1).padStart(3, '0')}`,
            source_benchmark: 'debasisdwivedy/Dataset_Philosophy_Ethics_Morality',
            question_text: row.row.QUERY || `${row.row.CATEGORY}: Analyze and explain this philosophical topic.`,
            official_benchmark_answer: null,
            question_type: 'ethics_benchmark',
            facettes_principales: ['philosophical_reasoning', 'metaphysics', 'epistemology', 'moral_theory'],
            niveau_complexite: 'extrême',
            hemisphere_dominant: 'Central',
            ground_truth: row.row.ANSWER,
            expected_key_points: extractPhilosophyKeyPoints(row.row.REASONING),
            priority_ars_criteria: {
                semantic_fidelity_min: 0.8,
                reasoning_score_min: 0.85,
                ethics_score_min: 0.8,
                coherence_score_min: 0.8,
                depth_score_min: 0.9
            },
            why_difficult_for_standard_llm: 'Requires deep philosophical analysis across multiple schools of thought, understanding of classical and modern philosophy.',
            neuronas_capabilities_tested: ['Abstract reasoning', 'Philosophical synthesis', 'Metaphysical analysis', 'BRONAS validation'],
            domain: row.row.CATEGORY || 'philosophy',
            metadata: { category: row.row.CATEGORY, reasoning: row.row.REASONING, answer: row.row.ANSWER }
        }));
        allBenchmarks.push(...philoQuestions);
        addLog('✓ Philosophy transformed', { count: philoQuestions.length });

        // DATASET 3: agentlans/reddit-ethics
        addLog('STEP 3: Fetching reddit-ethics dataset...');
        const redditUrl = `https://datasets-server.huggingface.co/rows?dataset=agentlans/reddit-ethics&config=default&split=train&offset=0&length=${reddit_limit}`;
        const redditRes = await fetch(redditUrl, { headers: { 'Authorization': `Bearer ${hfToken}` } });
        
        if (!redditRes.ok) {
            throw new Error(`Reddit API error: ${redditRes.status}`);
        }
        
        const redditData = await redditRes.json();
        addLog('✓ Reddit-ethics data fetched', { rows: redditData.rows.length });

        const redditQuestions = redditData.rows.map((row, idx) => ({
            question_id: `ETH-REDDIT-${String(idx + 1).padStart(4, '0')}`,
            source_benchmark: 'agentlans/reddit-ethics',
            question_text: `${row.row.title}\n\n${row.row.description}\n\nScenario: ${row.row.text.substring(0, 500)}...`,
            official_benchmark_answer: null,
            question_type: 'ethics_benchmark',
            facettes_principales: ['real_world_ethics', 'moral_dilemmas', 'social_ethics', 'practical_reasoning'],
            niveau_complexite: 'modéré',
            hemisphere_dominant: 'Central',
            ground_truth: row.row.resolution,
            expected_key_points: [
                row.row.utilitarianism,
                row.row.deontology,
                row.row.virtue_ethics
            ],
            priority_ars_criteria: {
                semantic_fidelity_min: 0.7,
                reasoning_score_min: 0.75,
                ethics_score_min: 0.85,
                coherence_score_min: 0.75,
                depth_score_min: 0.7
            },
            why_difficult_for_standard_llm: 'Real-world ethical dilemmas with nuanced social contexts, requires balancing multiple ethical frameworks in practical situations.',
            neuronas_capabilities_tested: ['BRONAS real-world validation', 'Social context understanding', 'Multi-framework application', 'Empathy modeling'],
            domain: 'social_ethics',
            metadata: { 
                issues: row.row.issues,
                questions: row.row.questions,
                answers: row.row.answers,
                ethical_frameworks: {
                    utilitarian: row.row.utilitarianism,
                    deontological: row.row.deontology,
                    virtue_ethics: row.row.virtue_ethics
                }
            }
        }));
        allBenchmarks.push(...redditQuestions);
        addLog('✓ Reddit transformed', { count: redditQuestions.length });

        // Bulk insert
        addLog('STEP 4: Inserting to database...', { total: allBenchmarks.length });
        await base44.asServiceRole.entities.BenchmarkQuestion.bulkCreate(allBenchmarks);

        addLog('✓ All benchmarks inserted');

        addLog('=== ETHICAL BENCHMARKS POPULATION COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Ethical benchmark questions populated from 3 datasets',
            statistics: {
                total_questions: allBenchmarks.length,
                relai_scenarios: relaiQuestions.length,
                philosophy_questions: philoQuestions.length,
                reddit_dilemmas: redditQuestions.length,
                sources: [
                    'relai-ai/ethics-scenarios',
                    'debasisdwivedy/Dataset_Philosophy_Ethics_Morality',
                    'agentlans/reddit-ethics'
                ]
            },
            sample_questions: [
                ...relaiQuestions.slice(0, 1),
                ...philoQuestions.slice(0, 1),
                ...redditQuestions.slice(0, 1)
            ].map(q => ({
                id: q.question_id,
                source: q.source_benchmark,
                preview: q.question_text.substring(0, 100) + '...'
            })),
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

// Helper: Extract key points from reasoning text
function extractKeyPoints(reasoning) {
    const points = [];
    const numberedMatches = reasoning.match(/\d+\.\s*\*\*([^*]+)\*\*/g);
    if (numberedMatches) {
        points.push(...numberedMatches.map(m => m.replace(/\d+\.\s*\*\*|\*\*/g, '').trim()));
    }
    
    const frameworks = ['Kantian', 'Utilitarian', 'Virtue Ethics', 'Consequentialism', 'Deontological'];
    frameworks.forEach(fw => {
        if (reasoning.includes(fw)) {
            points.push(`Must consider ${fw} perspective`);
        }
    });
    
    if (points.length === 0) {
        const paragraphs = reasoning.split('<br>');
        points.push(...paragraphs.slice(0, 3).map(p => p.split('.')[0].trim()).filter(p => p.length > 20));
    }
    
    return points.slice(0, 5);
}

// Helper: Extract philosophy key points
function extractPhilosophyKeyPoints(reasoning) {
    const points = [];
    const sentences = reasoning.split(/\.\s+/);
    
    // Extract perspective mentions
    const perspectives = ['Materialism', 'Idealism', 'Empiricism', 'Rationalism', 'Existentialism', 'Pragmatism'];
    perspectives.forEach(p => {
        if (reasoning.includes(p)) {
            points.push(`Consider ${p}`);
        }
    });
    
    // Extract key sentences
    points.push(...sentences.filter(s => 
        s.length > 30 && s.length < 150 && 
        (s.includes('must') || s.includes('should') || s.includes('requires'))
    ).slice(0, 3));
    
    return points.slice(0, 5);
}