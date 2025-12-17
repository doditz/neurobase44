import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-REPAIR ENGINE
 * Autonomous system repair based on diagnostic results
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[AutoRepair] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { diagnostic_results } = await req.json();

        addLog('=== AUTO-REPAIR ENGINE START ===');

        const repairs = [];

        // REPAIR 1: Ensure Active Personas exist
        addLog('REPAIR 1: Checking personas...');
        const personas = await base44.asServiceRole.entities.Persona.filter({ 
            status: 'Active' 
        });

        if (personas.length === 0) {
            addLog('⚠️ No active personas found - creating default set');
            
            const defaultPersonas = [
                {
                    handle: 'P001',
                    name: 'LogicalAnalyzer',
                    system: 'SMAS',
                    category: 'Core',
                    hemisphere: 'Left',
                    domain: 'Logic & Analysis',
                    capabilities: 'Analytical reasoning, evidence-based arguments, logical deduction',
                    expertise_score: 0.85,
                    priority_level: 10,
                    status: 'Active',
                    d2_sensitivity: 0.3
                },
                {
                    handle: 'P002',
                    name: 'CreativeExplorer',
                    system: 'SMAS',
                    category: 'Core',
                    hemisphere: 'Right',
                    domain: 'Creativity & Intuition',
                    capabilities: 'Creative thinking, metaphorical reasoning, contextual understanding',
                    expertise_score: 0.82,
                    priority_level: 10,
                    status: 'Active',
                    d2_sensitivity: -0.3
                },
                {
                    handle: 'P003',
                    name: 'EthicalMediator',
                    system: 'SMAS',
                    category: 'Core',
                    hemisphere: 'Central',
                    domain: 'Ethics & Balance',
                    capabilities: 'Ethical reasoning, cultural sensitivity, balanced synthesis',
                    expertise_score: 0.88,
                    priority_level: 10,
                    status: 'Active',
                    d2_sensitivity: 0.0
                }
            ];

            for (const persona of defaultPersonas) {
                await base44.asServiceRole.entities.Persona.create(persona);
            }

            repairs.push({
                action: 'CREATE_DEFAULT_PERSONAS',
                status: 'SUCCESS',
                count: defaultPersonas.length
            });
            addLog('✓ Created default personas');
        } else {
            addLog('✓ Personas OK', { count: personas.length });
        }

        // REPAIR 2: Ensure DSTIB Config exists
        addLog('REPAIR 2: Checking DSTIB config...');
        const dstibConfigs = await base44.asServiceRole.entities.DSTIBConfig.filter({ 
            is_active: true 
        });

        if (dstibConfigs.length === 0) {
            addLog('⚠️ No active DSTIB config - creating default');
            
            await base44.asServiceRole.entities.DSTIBConfig.create({
                config_name: 'Default DSTIB v4.3',
                is_active: true,
                sensitivity_1st_derivative: 0.03,
                sensitivity_2nd_derivative: 0.12,
                sensitivity_3rd_derivative: 0.10,
                semantic_tier_keywords: {
                    L1_literal: ['fact', 'data', 'define', 'what is', 'calculate'],
                    L2_analytical: ['analyze', 'compare', 'proof', 'why', 'how'],
                    R2_creative: ['imagine', 'create', 'story', 'art', 'design'],
                    R3_L3_synthesis: ['synthesize', 'integrate', 'ethical', 'philosophy', 'paradox']
                },
                query_type_weighting: {
                    L1_literal: { omega_target: 0.8, d2_profile: 'D2Stim', routing_layer: 'Fast' },
                    L2_analytical: { omega_target: 0.7, d2_profile: 'D2Stim', routing_layer: 'Moderate' },
                    R2_creative: { omega_target: 0.3, d2_profile: 'D2Pin', routing_layer: 'Moderate' },
                    R3_L3_synthesis: { omega_target: 0.5, d2_profile: 'Balanced', routing_layer: 'Deep' }
                }
            });

            repairs.push({
                action: 'CREATE_DSTIB_CONFIG',
                status: 'SUCCESS'
            });
            addLog('✓ Created DSTIB config');
        } else {
            addLog('✓ DSTIB config OK');
        }

        // REPAIR 3: Verify BRONAS rules exist
        addLog('REPAIR 3: Checking BRONAS rules...');
        const bronasRules = await base44.asServiceRole.entities.BronasValidationRules.filter({ 
            is_active: true 
        });

        if (bronasRules.length === 0) {
            addLog('⚠️ No BRONAS rules - creating core directives');
            
            const coreRules = [
                {
                    rule_key: 'human_safety_check',
                    rule_name: 'Directive 1: Human Safety',
                    target_context_field: 'raw_llm_output_a',
                    validation_logic_json: {
                        danger_keywords: ['kill', 'murder', 'harm', 'suicide', 'violence']
                    },
                    action_on_failure: 'HALT_AND_REPORT',
                    severity: 'critical',
                    description: 'Quantum Human Safety - Reject harmful content',
                    is_active: true
                },
                {
                    rule_key: 'bias_detection',
                    rule_name: 'Directive 2: Bias Balance',
                    target_context_field: 'processed_llm_output_b',
                    validation_logic_json: {
                        bias_threshold: 0.12
                    },
                    action_on_failure: 'FLAG_AND_CONTINUE',
                    severity: 'high',
                    description: 'Ethical Balance - Detect discriminatory bias',
                    is_active: true
                }
            ];

            for (const rule of coreRules) {
                await base44.asServiceRole.entities.BronasValidationRules.create(rule);
            }

            repairs.push({
                action: 'CREATE_BRONAS_RULES',
                status: 'SUCCESS',
                count: coreRules.length
            });
            addLog('✓ Created BRONAS rules');
        } else {
            addLog('✓ BRONAS rules OK', { count: bronasRules.length });
        }

        addLog('=== AUTO-REPAIR COMPLETE ===', { repairs_applied: repairs.length });

        return Response.json({
            success: true,
            repairs_applied: repairs.length,
            repairs: repairs,
            message: 'Auto-repair completed successfully',
            logs: log
        });

    } catch (error) {
        addLog('AUTO-REPAIR ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});