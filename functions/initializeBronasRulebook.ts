import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * INITIALIZE BRONAS RULEBOOK - Immutable Ethics Grounding
 * 
 * Fetches and stores ethics datasets (Hendrycks + UNESCO) as immutable BRONAS rules
 * Stores in BRONASRules entity as read-only ethical grounding database
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[BronasInit] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { force_refresh = false } = await req.json();

        addLog('=== INITIALIZING BRONAS RULEBOOK ===', { force_refresh });

        // Check if rules already exist
        if (!force_refresh) {
            const existingRules = await base44.asServiceRole.entities.BRONASRules.filter({
                rule_category: 'constraint_enforcement'
            }, '-created_date', 1);

            if (existingRules.length > 0) {
                addLog('⚠️ Rules already initialized', { count: existingRules.length });
                return Response.json({
                    success: true,
                    message: 'BRONAS rulebook already initialized. Use force_refresh=true to re-initialize.',
                    existing_rules_count: existingRules.length,
                    logs: log
                });
            }
        }

        // STEP 1: Fetch Hendrycks Ethics (all subsets)
        addLog('STEP 1: Fetching Hendrycks Ethics...');
        const hendrycksSubsets = ['commonsense', 'deontology', 'justice', 'utilitarianism', 'virtue'];
        const hendrycksData = [];

        for (const subset of hendrycksSubsets) {
            const { data } = await base44.functions.invoke('fetchEthicsDataset', {
                subset,
                split: 'train',
                limit: 200,
                offset: 0
            });

            if (data && data.success) {
                hendrycksData.push(...data.ethics_grounding);
                addLog(`✓ Fetched ${subset}`, { count: data.ethics_grounding.length });
            }
        }

        addLog('✓ Hendrycks data aggregated', { total: hendrycksData.length });

        // STEP 2: Fetch UNESCO Ethics
        addLog('STEP 2: Fetching UNESCO Ethics...');
        const { data: unescoData } = await base44.functions.invoke('fetchUNESCOEthics', {
            limit: 487,
            offset: 0
        });

        if (!unescoData || !unescoData.success) {
            throw new Error('Failed to fetch UNESCO ethics');
        }

        addLog('✓ UNESCO data fetched', { count: unescoData.ethics_grounding.length });

        // STEP 3: Create BRONAS Rules
        addLog('STEP 3: Creating immutable BRONAS rules...');

        // UNESCO Principle Rules
        const unescoRules = unescoData.unesco_principles.map(principle => ({
            rule_name: `UNESCO_${principle.replace(/\s+/g, '_')}`,
            rule_category: 'unesco_principle',
            rule_logic: `Enforce ${principle} from UNESCO AI Ethics Recommendation (2021)`,
            enforcement_level: 'mandatory',
            unesco_principles: [principle],
            is_active: true
        }));

        // Hendrycks Ethics Rules (by subset)
        const hendrycksRules = hendrycksSubsets.map(subset => ({
            rule_name: `Hendrycks_${subset}`,
            rule_category: 'constraint_enforcement',
            rule_logic: `Apply ${subset} ethical constraints from Hendrycks/Ethics dataset`,
            enforcement_level: 'mandatory',
            smrce_weights: {
                sensory_weight: 0.15,
                memory_weight: 0.2,
                reasoning_weight: 0.25,
                coherence_weight: 0.15,
                ethics_weight: 0.25
            },
            decision_gates: {
                proceed_threshold: 0.8,
                correction_threshold: 0.6,
                reject_threshold: 0.4
            },
            is_active: true
        }));

        // Combine and insert
        const allRules = [...unescoRules, ...hendrycksRules];
        
        await base44.asServiceRole.entities.BRONASRules.bulkCreate(allRules);

        addLog('✓ BRONAS rules created', { total: allRules.length });

        // STEP 4: Store grounding data in SystemMemory (immutable)
        addLog('STEP 4: Storing grounding data in SystemMemory...');

        const hendrycksMemory = {
            memory_key: 'bronas_hendrycks_ethics_grounding',
            memory_content: JSON.stringify(hendrycksData),
            memory_type: 'ethical_governance',
            source_attribution: 'Hendrycks et al. (ICLR 2021) - Aligning AI With Shared Human Values',
            tier_level: 1,
            d2_modulation: 1.0,
            hemisphere: 'central',
            pruning_protection: true,
            version: '1.0',
            context: `Immutable ethics grounding database. ${hendrycksData.length} scenarios across 5 ethical dimensions.`
        };

        const unescoMemory = {
            memory_key: 'bronas_unesco_ethics_grounding',
            memory_content: JSON.stringify(unescoData.ethics_grounding),
            memory_type: 'ethical_governance',
            source_attribution: 'UNESCO Recommendation on AI Ethics (November 2021)',
            tier_level: 1,
            d2_modulation: 1.0,
            hemisphere: 'central',
            pruning_protection: true,
            version: '1.0',
            context: `Immutable UNESCO ethics principles grounding. ${unescoData.ethics_grounding.length} scenarios across ${unescoData.unesco_principles.length} principles.`
        };

        await base44.asServiceRole.entities.SystemMemory.bulkCreate([
            hendrycksMemory,
            unescoMemory
        ]);

        addLog('✓ Grounding data stored in SystemMemory');

        addLog('=== BRONAS RULEBOOK INITIALIZATION COMPLETE ===');

        return Response.json({
            success: true,
            message: 'BRONAS rulebook initialized with immutable ethics grounding',
            statistics: {
                bronas_rules_created: allRules.length,
                hendrycks_scenarios: hendrycksData.length,
                unesco_scenarios: unescoData.ethics_grounding.length,
                unesco_principles: unescoData.unesco_principles.length,
                total_grounding_data: hendrycksData.length + unescoData.ethics_grounding.length
            },
            datasets_used: [
                'hendrycks/ethics (ICLR 2021)',
                'ktiyab/ethical-framework-UNESCO-Ethics-of-AI (UNESCO 2021)'
            ],
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