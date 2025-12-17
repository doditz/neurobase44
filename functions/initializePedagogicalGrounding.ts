import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * INITIALIZE PEDAGOGICAL GROUNDING
 * 
 * Stores Universe-Teacher merge specifications and chain-of-application methodology
 * as immutable SystemMemory for BRONAS educational validation
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[PedagogicalInit] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { force_refresh = false } = await req.json();

        addLog('=== INITIALIZING PEDAGOGICAL GROUNDING ===');

        // Check if already exists
        if (!force_refresh) {
            const existing = await base44.asServiceRole.entities.SystemMemory.filter({
                memory_key: 'bronas_universe_teacher_grounding'
            }, '-created_date', 1);

            if (existing.length > 0) {
                addLog('⚠️ Pedagogical grounding already initialized');
                return Response.json({
                    success: true,
                    message: 'Pedagogical grounding exists. Use force_refresh=true to re-initialize.',
                    logs: log
                });
            }
        }

        // Universe-Teacher Dataset Specifications
        const universeTeacherSpec = {
            name: 'Universe-Teacher Merge',
            total_rows: '3.2M',
            domains: ['general_science', 'math_physics', 'physics', 'biology'],
            source_datasets: [
                {
                    repo: 'allenai/science_teacher',
                    domain: 'Gen-science K-12',
                    rows: '1.1M',
                    feature: 'Each question has lesson field: intuition → formula → real-world use'
                },
                {
                    repo: 'qwedsa/gsm8k_with_physics_apps',
                    domain: 'Math → physics',
                    rows: '8.9k',
                    feature: 'Every arithmetic template mapped to physics scenario'
                },
                {
                    repo: 'conceptual-physics-dataset',
                    domain: 'Physics',
                    rows: '54k',
                    feature: 'Next-step prediction: gravity → planetary motion scaling'
                },
                {
                    repo: 'openstax_biology_worked',
                    domain: 'Biology',
                    rows: '26k',
                    feature: 'Each law paired with lab protocol (measure/perturb)'
                }
            ],
            merge_methodology: 'Filter rows with application/worked_example → normalize → concatenate → 5% test split',
            output_format: {
                text: 'Full lesson + worked example',
                domain: 'Domain tag',
                level: 'Difficulty level'
            }
        };

        // Chain-of-Application Methodology
        const chainOfApplicationSpec = {
            name: 'Chain-of-Application Wrapper',
            purpose: 'Upgrade static facts to teaching+application format',
            methodology: '3-shot prompt to generate pedagogical structure',
            output_structure: [
                '1. Intuition explanation (1 sentence)',
                '2. Formal law/equation',
                '3. Worked real-world example',
                '4. Exponential scaling guidance'
            ],
            model: 'microsoft/DialoGPT-medium or GPT-3.5',
            parameters: 'max_new_tokens=150, temperature=0.3'
        };

        // Optional Deep Lab Add-ons
        const deepLabAddons = [
            {
                repo: 'deepset/physics-dataset-lab',
                rows: '12k',
                feature: 'Virtual physics-lab logs with 10× mass perturbation traces'
            },
            {
                repo: 's2orc_bio_chem',
                rows: '2M',
                feature: 'Open-access papers, filter "methods" for PCR/CRISPR application'
            },
            {
                repo: 'ai2_arc',
                rows: '2k',
                feature: 'Hard science questions for expert ramp'
            }
        ];

        // Store in SystemMemory
        const pedagogicalMemory = {
            memory_key: 'bronas_universe_teacher_grounding',
            memory_content: JSON.stringify({
                universe_teacher: universeTeacherSpec,
                chain_of_application: chainOfApplicationSpec,
                deep_lab_addons: deepLabAddons,
                licensing: 'MIT / CC-BY / OER',
                total_coverage: '3.2M+ pedagogical rows across 4 core domains'
            }),
            memory_type: 'technical_capability',
            source_attribution: 'Universe-Teacher Dataset Merge Specification (HuggingFace OER)',
            tier_level: 1,
            d2_modulation: 0.95,
            hemisphere: 'left',
            pruning_protection: true,
            version: '1.0',
            context: 'Immutable pedagogical grounding for BRONAS educational validation. Provides application-driven learning pathways without web dependency.',
            flux_integral_contribution: 0.85,
            gc_harmonization_weight: 0.9
        };

        // Pedagogical Validation Rules
        const pedagogicalRules = {
            memory_key: 'bronas_pedagogical_validation_rules',
            memory_content: JSON.stringify({
                rule_1: 'Always verify explanations follow intuition → formula → application → scaling pattern',
                rule_2: 'Cross-domain applications required for complex queries (link physics to biology, math to chemistry)',
                rule_3: 'Lab protocols must include measurement + perturbation methodology',
                rule_4: 'Difficulty ramps: K-12 → undergraduate → graduate → research frontier',
                rule_5: 'Real-world examples mandatory for abstract concepts'
            }),
            memory_type: 'architectural_principle',
            source_attribution: 'BRONAS Pedagogical Validation Framework',
            tier_level: 1,
            d2_modulation: 1.0,
            hemisphere: 'central',
            pruning_protection: true,
            version: '1.0',
            context: 'Validation rules for ensuring pedagogical rigor in BRONAS educational responses'
        };

        await base44.asServiceRole.entities.SystemMemory.bulkCreate([
            pedagogicalMemory,
            pedagogicalRules
        ]);

        addLog('✓ Pedagogical grounding stored in SystemMemory');

        addLog('=== PEDAGOGICAL GROUNDING INITIALIZATION COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Pedagogical grounding initialized successfully',
            statistics: {
                total_dataset_rows: '3.2M',
                domains_covered: 4,
                source_datasets: 4,
                deep_lab_addons: 3,
                validation_rules: 5
            },
            grounding_scope: {
                general_science: '1.1M rows',
                math_physics: '8.9k rows',
                physics: '54k rows',
                biology: '26k rows',
                lab_protocols: '12k rows',
                research_papers: '2M rows'
            },
            methodology: 'Universe-Teacher merge + Chain-of-Application wrapper',
            licensing: 'MIT / CC-BY / OER (no API keys required)',
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