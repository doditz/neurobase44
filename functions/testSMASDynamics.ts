import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TEST SMAS DYNAMICS v4.3 → v4.7 VALIDATION
 * Tests all 4 SMAS equation functions before upgrade
 */

Deno.serve(async (req) => {
    const testLog = [];
    const log = (msg, data) => {
        testLog.push({ timestamp: new Date().toISOString(), msg, data });
        console.log(`[SMAS_TEST] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        log('=== SMAS DYNAMICS TEST v4.3 ===');

        // Mock test data
        const testPersonas = ['P001', 'P002', 'P003'];
        const testComplexity = 0.7;
        const testDebateHistory = [
            { round: 1, response: 'Test response', complexity_score: 0.6 }
        ];

        // TEST 1: Hemisphere Dynamics
        log('TEST 1: hemisphereDynamics');
        const hemisphereResult = await base44.functions.invoke('hemisphereDynamics', {
            personas_active: testPersonas,
            prompt_complexity: testComplexity,
            debate_history: testDebateHistory
        });
        
        const { F_L, F_R } = hemisphereResult.data || {};
        log('✓ F_L:', F_L?.toFixed(3), 'F_R:', F_R?.toFixed(3));

        // TEST 2: Dopamine Modulator
        log('TEST 2: dopamineModulator');
        const dopamineResult = await base44.functions.invoke('dopamineModulator', {
            D_current: 0.5,
            D_history: [0.5, 0.55],
            events: [
                { time: Date.now() - 1000, magnitude: 0.8, type: 'success' }
            ]
        });
        
        const D_t = dopamineResult.data?.D_t;
        log('✓ D(t):', D_t?.toFixed(3));

        // TEST 3: Bias Reward Calculator
        log('TEST 3: biasRewardCalculator');
        const biasResult = await base44.functions.invoke('biasRewardCalculator', {
            personas_active: testPersonas,
            debate_round_contributions: [
                { persona_handle: 'P001', quality_score: 0.8, relevance: 0.7 }
            ]
        });
        
        const B_t = biasResult.data?.B_t;
        log('✓ B(t):', B_t?.toFixed(3));

        // TEST 4: Global State Calculator
        log('TEST 4: globalStateCalculator');
        const globalResult = await base44.functions.invoke('globalStateCalculator', {
            F_L: F_L || 0.5,
            F_R: F_R || 0.5,
            B_t: B_t || 0,
            D_t: D_t || 0.5,
            omega_current: 0.5,
            Phi_t: 0
        });
        
        const { G_t, omega } = globalResult.data || {};
        log('✓ G(t):', G_t?.toFixed(3), 'ω(t):', omega?.toFixed(3));

        // VALIDATION
        const allTestsPassed = F_L !== undefined && D_t !== undefined && B_t !== undefined && G_t !== undefined;

        log('=== RESULTS ===', {
            passed: allTestsPassed,
            F_L, F_R, D_t, B_t, G_t, omega
        });

        return Response.json({
            success: true,
            test_results: {
                F_L, F_R, D_t, B_t, G_t, omega,
                all_tests_passed: allTestsPassed
            },
            logs: testLog,
            recommendation: allTestsPassed 
                ? '✅ v4.3 SMAS functions operational - Ready for v4.7 upgrade'
                : '❌ Some functions failed - Review logs'
        });

    } catch (error) {
        log('ERROR:', error.message);
        return Response.json({
            success: false,
            error: error.message,
            logs: testLog
        }, { status: 500 });
    }
});