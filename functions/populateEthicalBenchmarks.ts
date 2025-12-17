import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULATE ETHICAL BENCHMARKS
 * 
 * Fetches ethics scenarios from relai-ai/ethics-scenarios and populates BenchmarkQuestion entity
 * with complex ethical reasoning test cases for Neuronas validation
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
            limit = 190
        } = await req.json();

        addLog('=== POPULATING ETHICAL BENCHMARKS ===', { limit, force_refresh });

        // Check if already populated
        if (!force_refresh) {
            const existing = await base44.asServiceRole.entities.BenchmarkQuestion.filter({
                source_benchmark: 'relai-ai/ethics-scenarios'
            }, '-created_date', 1);

            if (existing.length > 0) {
                addLog('⚠️ Ethics benchmarks already populated', { count: existing.length });
                return Response.json({
                    success: true,
                    message: 'Ethics benchmarks already exist. Use force_refresh=true to re-populate.',
                    existing_count: existing.length,
                    logs: log
                });
            }
        }

        // Fetch from Hugging Face
        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set');
        }

        addLog('Fetching from HF API...');

        const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=relai-ai/ethics-scenarios&config=default&split=train&offset=0&length=${limit}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${hfToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.rows || !Array.isArray(data.rows)) {
            throw new Error('Unexpected response format from HF API');
        }

        addLog('✓ Data fetched', { rows: data.rows.length });

        // Transform to BenchmarkQuestion format
        const benchmarkQuestions = data.rows.map((row, idx) => {
            const question = row.row.Question;
            const response = row.row.Response;
            const reasoning = row.row.Reasoning;

            return {
                question_id: `ETH-RELAI-${String(idx + 1).padStart(3, '0')}`,
                source_benchmark: 'relai-ai/ethics-scenarios',
                question_text: question,
                official_benchmark_answer: null, // No single correct answer
                question_type: 'ethics_benchmark',
                facettes_principales: ['ethical_reasoning', 'philosophical_frameworks', 'moral_decision_making'],
                niveau_complexite: 'complexe',
                hemisphere_dominant: 'Central',
                ground_truth: response,
                expected_key_points: extractKeyPoints(reasoning),
                priority_ars_criteria: {
                    semantic_fidelity_min: 0.75,
                    reasoning_score_min: 0.8,
                    ethics_score_min: 0.9,
                    coherence_score_min: 0.75,
                    depth_score_min: 0.8
                },
                why_difficult_for_standard_llm: 'Requires deep philosophical reasoning, balancing multiple ethical frameworks (Kantian, Utilitarian, Virtue Ethics), and considering nuanced real-world implications without clear-cut answers.',
                neuronas_capabilities_tested: [
                    'BRONAS ethical validation',
                    'Multi-framework synthesis',
                    'Philosophical reasoning',
                    'Contextual moral judgment',
                    'Central hemisphere integration'
                ],
                domain: 'ethics_philosophy',
                metadata: {
                    reasoning_provided: reasoning,
                    response_guidance: response,
                    dataset_row_idx: row.row_idx
                }
            };
        });

        addLog('✓ Data transformed', { questions: benchmarkQuestions.length });

        // Bulk insert
        await base44.asServiceRole.entities.BenchmarkQuestion.bulkCreate(benchmarkQuestions);

        addLog('✓ Benchmarks inserted to database');

        addLog('=== ETHICAL BENCHMARKS POPULATION COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Ethical benchmark questions populated successfully',
            statistics: {
                questions_created: benchmarkQuestions.length,
                source: 'relai-ai/ethics-scenarios',
                complexity: 'complexe',
                primary_facets: ['ethical_reasoning', 'philosophical_frameworks', 'moral_decision_making']
            },
            sample_questions: benchmarkQuestions.slice(0, 3).map(q => ({
                id: q.question_id,
                preview: q.question_text.substring(0, 150) + '...'
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
    
    // Extract numbered points
    const numberedMatches = reasoning.match(/\d+\.\s*\*\*([^*]+)\*\*/g);
    if (numberedMatches) {
        points.push(...numberedMatches.map(m => m.replace(/\d+\.\s*\*\*|\*\*/g, '').trim()));
    }
    
    // Extract framework mentions
    const frameworks = ['Kantian', 'Utilitarian', 'Virtue Ethics', 'Consequentialism', 'Deontological'];
    frameworks.forEach(fw => {
        if (reasoning.includes(fw)) {
            points.push(`Must consider ${fw} perspective`);
        }
    });
    
    // Fallback: extract first sentence from each paragraph
    if (points.length === 0) {
        const paragraphs = reasoning.split('<br>');
        points.push(...paragraphs.slice(0, 3).map(p => p.split('.')[0].trim()).filter(p => p.length > 20));
    }
    
    return points.slice(0, 5); // Max 5 key points
}