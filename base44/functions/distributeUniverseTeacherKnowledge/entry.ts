import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DISTRIBUTE UNIVERSE-TEACHER KNOWLEDGE
 * 
 * Distributes 3.2M pedagogical dataset specifications across hemispheric memory tiers
 * LEFT (L1-L3): Structured facts, datasets, methodologies
 * RIGHT (R1-R3): Intuitive applications, contextual scaling, creative connections
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[UniverseTeacher] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { force_refresh = false } = await req.json();

        addLog('=== DISTRIBUTING UNIVERSE-TEACHER KNOWLEDGE ===');

        if (!force_refresh) {
            const existing = await base44.asServiceRole.entities.SystemMemory.filter({
                memory_key: 'universe_teacher_l1_core'
            }, '-created_date', 1);

            if (existing.length > 0) {
                addLog('⚠️ Universe-Teacher knowledge already distributed');
                return Response.json({
                    success: true,
                    message: 'Knowledge exists. Use force_refresh=true to re-distribute.',
                    logs: log
                });
            }
        }

        const memoryEntries = [];

        // ========================================
        // LEFT HEMISPHERE - ANALYTICAL/FACTUAL
        // ========================================

        // L1 - Critical Core Datasets (Always Active)
        memoryEntries.push({
            memory_key: 'universe_teacher_l1_core',
            memory_content: JSON.stringify({
                total_rows: '3.2M',
                primary_datasets: [
                    { name: 'allenai/science_teacher', rows: '1.1M', domain: 'K-12 science' },
                    { name: 'qwedsa/gsm8k_with_physics_apps', rows: '8.9k', domain: 'math→physics' },
                    { name: 'conceptual-physics-dataset', rows: '54k', domain: 'physics' },
                    { name: 'openstax_biology_worked', rows: '26k', domain: 'biology' }
                ],
                merge_format: { text: 'lesson+example', domain: 'tag', level: 'difficulty' },
                licensing: 'MIT/CC-BY/OER'
            }),
            memory_type: 'technical_capability',
            tier_level: 1,
            hemisphere: 'left',
            d2_modulation: 0.95,
            omega_t: 1.0,
            source_database_tier: 'L1',
            compression_type: 'none',
            pruning_protection: true,
            importance_score: 1.0
        });

        // L2 - Deep Lab Protocols (Session-Level)
        memoryEntries.push({
            memory_key: 'universe_teacher_l2_lab_protocols',
            memory_content: JSON.stringify({
                physics_lab: { repo: 'deepset/physics-dataset-lab', rows: '12k', feature: '10× mass perturbation traces' },
                bio_chem_methods: { repo: 's2orc_bio_chem', rows: '2M', feature: 'PCR/CRISPR application methods' },
                expert_challenges: { repo: 'ai2_arc', rows: '2k', feature: 'Hard science questions' }
            }),
            memory_type: 'technical_capability',
            tier_level: 2,
            hemisphere: 'left',
            d2_modulation: 0.8,
            omega_t: 0.9,
            source_database_tier: 'L2',
            compression_type: 'gzip',
            pruning_protection: true,
            importance_score: 0.85
        });

        // L3 - Merge Methodology (Long-term Reference)
        memoryEntries.push({
            memory_key: 'universe_teacher_l3_methodology',
            memory_content: `
Merge Algorithm:
1. Filter: Keep only rows with application/worked_example fields
2. Normalize: Rename fields uniformly (text, domain, level)
3. Concatenate: Combine all 4 datasets
4. Split: 95% train, 5% test
5. Output: Single unified dataset

Code Pattern:
- normalize(batch, domain) → filter → map → remove_columns
- concatenate_datasets([d1, d2, d3, d4])
- train_test_split(test_size=0.05)
            `,
            memory_type: 'technical_capability',
            tier_level: 3,
            hemisphere: 'left',
            d2_modulation: 0.6,
            omega_t: 0.95,
            source_database_tier: 'L3',
            compression_type: 'lzma',
            pruning_protection: false,
            importance_score: 0.7,
            decay_factor: 0.995
        });

        // ========================================
        // RIGHT HEMISPHERE - INTUITIVE/APPLICATION
        // ========================================

        // R1 - Chain-of-Application Pattern (Immediate Access)
        memoryEntries.push({
            memory_key: 'universe_teacher_r1_application_chain',
            memory_content: JSON.stringify({
                pattern: [
                    '1. Intuition (1 sentence)',
                    '2. Formal law/equation',
                    '3. Worked real-world example',
                    '4. Exponential scaling guidance'
                ],
                wrapper_purpose: 'Upgrade static facts → teaching+application',
                model_suggestion: 'microsoft/DialoGPT-medium or GPT-3.5',
                parameters: { max_new_tokens: 150, temperature: 0.3 },
                prompt_template: 'Below is a science fact. Rewrite into mini-lesson: intuition → formula → example → scaling'
            }),
            memory_type: 'creative_insight',
            tier_level: 1,
            hemisphere: 'right',
            d2_modulation: 0.85,
            omega_t: 0.1,
            source_database_tier: 'R1',
            compression_type: 'none',
            pruning_protection: true,
            importance_score: 0.9
        });

        // R2 - Cross-Domain Connections (Session)
        memoryEntries.push({
            memory_key: 'universe_teacher_r2_cross_domain',
            memory_content: `
Pedagogical Bridges:
- Math → Physics: GSM8K templates map to projectile/circuit scenarios
- Physics → Biology: Gravity principles scale to cellular mechanics
- Chemistry → Biology: Molecular dynamics inform enzyme kinetics
- General Science → All: K-12 intuition scaffolds to graduate complexity

Application Scaling:
- K-12: Concrete examples (apple falling)
- Undergraduate: Quantitative models (F=ma)
- Graduate: Perturbation analysis (what if 10× mass?)
- Research: Cross-domain synthesis (quantum biology)
            `,
            memory_type: 'creative_insight',
            tier_level: 2,
            hemisphere: 'right',
            d2_modulation: 0.75,
            omega_t: 0.2,
            source_database_tier: 'R2',
            compression_type: 'gzip',
            pruning_protection: true,
            importance_score: 0.8
        });

        // R3 - Intuitive Scaling Principles (Long-term)
        memoryEntries.push({
            memory_key: 'universe_teacher_r3_scaling_intuition',
            memory_content: `
Meta-Pedagogical Insights:
- "How to push a law to its limit": Lab protocols include measurement + perturbation
- "Exponential thinking": 10× parameter → what breaks? what emerges?
- "Real-world grounding": Abstract concepts need tangible measurement protocols
- "Difficulty ramps": Always provide next-level pathway (K-12 → PhD → frontier)
- "Application-first": Static facts become memorable through worked examples

Creative Teaching Heuristics:
- Start with "what would you predict?" before formula
- End with "how would you scale to [extreme case]?"
- Link every equation to a tool/instrument/experiment
- Use analogies from familiar domains to explain novel concepts
            `,
            memory_type: 'creative_insight',
            tier_level: 3,
            hemisphere: 'right',
            d2_modulation: 0.65,
            omega_t: 0.15,
            source_database_tier: 'R3',
            compression_type: 'lzma',
            pruning_protection: false,
            importance_score: 0.75,
            decay_factor: 0.995
        });

        // Insert all memory entries
        await base44.asServiceRole.entities.SystemMemory.bulkCreate(memoryEntries);

        addLog('✓ Universe-Teacher knowledge distributed across hemispheric tiers');

        addLog('=== DISTRIBUTION COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Universe-Teacher knowledge distributed to hemispheric memory system',
            distribution: {
                left_hemisphere: {
                    L1: 'Core datasets (3.2M rows)',
                    L2: 'Lab protocols (2M+ rows)',
                    L3: 'Merge methodology'
                },
                right_hemisphere: {
                    R1: 'Chain-of-application pattern',
                    R2: 'Cross-domain bridges',
                    R3: 'Scaling intuition heuristics'
                }
            },
            total_memories_created: memoryEntries.length,
            note: 'BRONAS remains ETHICS ONLY. Pedagogical knowledge lives in hemispheric memory.',
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