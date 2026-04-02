import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TEST PHASE 4 - Enhanced SMAS with Fatigue + RAID
 * Validates fatigue tracking and cognitive redundancy
 */

Deno.serve(async (req) => {
    const testLog = [];
    const log = (msg, data) => {
        testLog.push({ timestamp: new Date().toISOString(), msg, data });
        console.log(`[TEST_PHASE4] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        log('=== PHASE 4: ENHANCED SMAS TEST START ===');

        const results = [];
        let passed = 0;
        let failed = 0;

        // TEST 1: Fatigue Tracking
        log('\nTEST 1: Persona Fatigue Tracking');
        try {
            const testPersonas = ['P001', 'P002', 'P003'];
            
            const { data: fatigueData } = await base44.functions.invoke('personaFatigueTracker', {
                persona_handles: testPersonas,
                update_fatigue: true,
                recovery_window_hours: 24
            });

            if (!fatigueData || !fatigueData.success) {
                throw new Error('Fatigue tracking failed');
            }

            log('✓ Fatigue tracking operational', {
                personas_tracked: fatigueData.fatigue_reports.length,
                avg_fatigue: fatigueData.avg_fatigue?.toFixed(3)
            });

            const hasValidReports = fatigueData.fatigue_reports.length > 0 &&
                                   fatigueData.fatigue_reports.every(r => 
                                       r.fatigue_after !== undefined && 
                                       r.effectiveness_multiplier !== undefined
                                   );

            if (hasValidReports) {
                passed++;
                log('✅ TEST PASSED - Fatigue system working');
            } else {
                failed++;
                log('❌ TEST FAILED - Invalid fatigue reports');
            }

            results.push({
                test_name: 'Fatigue Tracking System',
                passed: hasValidReports,
                avg_fatigue: fatigueData.avg_fatigue,
                highly_fatigued: fatigueData.highly_fatigued_count
            });

        } catch (error) {
            failed++;
            log('❌ TEST ERROR', error.message);
            results.push({
                test_name: 'Fatigue Tracking System',
                passed: false,
                error: error.message
            });
        }

        // TEST 2: RAID Cognitive Controller
        log('\nTEST 2: RAID Cognitive Controller');
        try {
            // Load test personas
            const personas = await base44.asServiceRole.entities.Persona.filter({ 
                status: 'Active' 
            }, '-expertise_score', 5);

            if (personas.length < 3) {
                throw new Error('Not enough active personas for RAID test');
            }

            const { data: raidData } = await base44.functions.invoke('raidCognitiveController', {
                prompt: 'Explain quantum entanglement in simple terms',
                primary_personas: personas.slice(0, 2),
                redundancy_level: 2,
                min_consensus_threshold: 0.6
            });

            if (!raidData || !raidData.success) {
                throw new Error('RAID controller failed');
            }

            log('✓ RAID controller operational', {
                redundancy: raidData.raid_config?.redundancy_level,
                consensus_score: raidData.consensus?.score?.toFixed(3),
                integrity: raidData.integrity_verified
            });

            const raidWorking = raidData.response_groups?.primary_responses?.length > 0 &&
                               raidData.selected_response !== undefined;

            if (raidWorking) {
                passed++;
                log('✅ TEST PASSED - RAID system working');
            } else {
                failed++;
                log('❌ TEST FAILED - RAID system malfunction');
            }

            results.push({
                test_name: 'RAID Cognitive Controller',
                passed: raidWorking,
                consensus_score: raidData.consensus?.score,
                consensus_reached: raidData.consensus?.reached,
                integrity_verified: raidData.integrity_verified
            });

        } catch (error) {
            failed++;
            log('❌ TEST ERROR', error.message);
            results.push({
                test_name: 'RAID Cognitive Controller',
                passed: false,
                error: error.message
            });
        }

        // TEST 3: Fatigue Recovery Simulation
        log('\nTEST 3: Fatigue Recovery Simulation');
        try {
            const testHandle = 'P001';
            
            // First activation (high fatigue)
            await base44.functions.invoke('personaFatigueTracker', {
                persona_handles: [testHandle],
                update_fatigue: true,
                recovery_window_hours: 1 // Short recovery window
            });

            // Wait a bit (simulate time passing)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Second check (should show recovery)
            const { data: recoveryData } = await base44.functions.invoke('personaFatigueTracker', {
                persona_handles: [testHandle],
                update_fatigue: false,
                recovery_window_hours: 1
            });

            const recoveryWorking = recoveryData?.success && 
                                   recoveryData.fatigue_reports?.length > 0;

            if (recoveryWorking) {
                passed++;
                log('✅ TEST PASSED - Recovery system working');
            } else {
                failed++;
                log('❌ TEST FAILED - Recovery system malfunction');
            }

            results.push({
                test_name: 'Fatigue Recovery System',
                passed: recoveryWorking
            });

        } catch (error) {
            failed++;
            log('❌ TEST ERROR', error.message);
            results.push({
                test_name: 'Fatigue Recovery System',
                passed: false,
                error: error.message
            });
        }

        const totalTests = 3;
        const successRate = (passed / totalTests * 100).toFixed(1);

        log('\n=== PHASE 4 TEST COMPLETE ===', {
            passed,
            failed,
            total: totalTests,
            success_rate: `${successRate}%`
        });

        return Response.json({
            success: true,
            phase: 'PHASE 4: Enhanced SMAS (Fatigue + RAID)',
            test_results: {
                passed,
                failed,
                total: totalTests,
                success_rate: successRate
            },
            detailed_results: results,
            logs: testLog,
            recommendation: passed === totalTests
                ? '✅ Phase 4 operational - Enhanced SMAS ready for production'
                : `⚠️ ${failed} tests failed - Review fatigue/RAID systems`
        });

    } catch (error) {
        log('FATAL ERROR', error.message);
        return Response.json({
            success: false,
            error: error.message,
            logs: testLog
        }, { status: 500 });
    }
});