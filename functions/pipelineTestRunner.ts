import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PIPELINE TEST RUNNER - Autonomous Pipeline Validation
 * Tests all Neuronas 4.7 modules sequentially: SMARCE → DSTIB → D2STIM → QRONAS → BRONAS → Validator
 */

Deno.serve(async (req) => {
    const testLog = [];
    const log = (level, module, message, data = {}) => {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            data,
            success: level === 'SUCCESS'
        };
        testLog.push(entry);
        console.log(`[${level}][${module}] ${message}`, data);
    };

    const testResults = {
        started_at: new Date().toISOString(),
        modules_tested: [],
        total_tests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        execution_time_ms: 0
    };

    const startTime = Date.now();

    try {
        log('SYSTEM', 'INIT', '=== NEURONAS 4.7 PIPELINE TEST START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized', logs: testLog }, { status: 401 });
        }

        const { test_prompt = 'Explain the ethical implications of AI in healthcare and propose a framework for responsible deployment.' } = await req.json();
        
        log('INFO', 'INIT', 'Test configuration', { user: user.email, test_prompt: test_prompt.substring(0, 100) });

        // TEST 1: SMARCE Scorer
        log('SYSTEM', 'SMARCE', '--- Testing SMARCE Scorer ---');
        let smarceResult = null;
        try {
            const { data } = await base44.functions.invoke('smarceScorer', {
                user_message: test_prompt,
                agent_name: 'smas_debater',
                settings: {}
            });
            
            if (data.success && data.complexity_score !== undefined) {
                smarceResult = data;
                log('SUCCESS', 'SMARCE', '✅ SMARCE test passed', {
                    complexity: data.complexity_score,
                    archetype: data.archetype_detected,
                    hemisphere: data.dominant_hemisphere
                });
                testResults.passed++;
            } else {
                throw new Error('SMARCE returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'SMARCE', `❌ SMARCE test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('SMARCE');

        // TEST 2: DSTIB-Hebden Router
        log('SYSTEM', 'DSTIB', '--- Testing DSTIB-Hebden Router ---');
        let dstibResult = null;
        try {
            const { data } = await base44.functions.invoke('dstibHebdenRouter', {
                user_message: test_prompt
            });
            
            if (data.success && data.routing_result) {
                dstibResult = data.routing_result;
                log('SUCCESS', 'DSTIB', '✅ DSTIB test passed', {
                    semantic_tier: dstibResult.semantic_tier,
                    routing_layer: dstibResult.routing_layer,
                    target_omega: dstibResult.target_omega,
                    d2_profile: dstibResult.d2_profile
                });
                testResults.passed++;
            } else {
                throw new Error('DSTIB returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'DSTIB', `❌ DSTIB test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('DSTIB');

        // TEST 3: D2STIM Modulator
        log('SYSTEM', 'D2STIM', '--- Testing D2STIM Modulator ---');
        let d2stimResult = null;
        try {
            const { data } = await base44.functions.invoke('d2stimModulator', {
                complexity_score: smarceResult?.complexity_score || 0.7,
                archetype: smarceResult?.archetype_detected || 'balanced',
                dominant_hemisphere: smarceResult?.dominant_hemisphere || 'central',
                user_settings: { temperature: 0.7, max_personas: 5, debate_rounds: 3 },
                dstib_routing: dstibResult,
                fact_check_available: true,
                citation_count: 5
            });
            
            if (data.success && data.d2_activation !== undefined) {
                d2stimResult = data;
                log('SUCCESS', 'D2STIM', '✅ D2STIM test passed', {
                    d2_activation: data.d2_activation,
                    temperature: data.config.temperature,
                    max_personas: data.config.max_personas,
                    debate_rounds: data.config.debate_rounds
                });
                testResults.passed++;
            } else {
                throw new Error('D2STIM returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'D2STIM', `❌ D2STIM test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('D2STIM');

        // TEST 4: Persona Team Optimizer
        log('SYSTEM', 'PERSONAS', '--- Testing Persona Team Optimizer ---');
        let personasResult = null;
        try {
            const { data } = await base44.functions.invoke('personaTeamOptimizer', {
                user_message: test_prompt,
                agent_name: 'smas_debater',
                archetype: smarceResult?.archetype_detected || 'balanced',
                dominant_hemisphere: smarceResult?.dominant_hemisphere || 'central',
                max_personas: d2stimResult?.config?.max_personas || 5,
                settings: { dstib_routing: dstibResult }
            });
            
            if (data.success && Array.isArray(data.team)) {
                personasResult = data;
                log('SUCCESS', 'PERSONAS', '✅ Persona Team test passed', {
                    personas_count: data.team.length,
                    personas: data.team.map(p => p.name)
                });
                testResults.passed++;
            } else {
                throw new Error('Persona Team returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'PERSONAS', `❌ Persona Team test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('PERSONAS');

        // TEST 5: QRONAS Engine (Mini-debate)
        log('SYSTEM', 'QRONAS', '--- Testing QRONAS Engine ---');
        let qronasResult = null;
        try {
            const { data } = await base44.functions.invoke('qronasEngine', {
                prompt: test_prompt,
                agent_name: 'smas_debater',
                agent_instructions: 'Test agent instructions for pipeline validation',
                max_paths: Math.min(3, personasResult?.team?.length || 3), // Limit for test
                debate_rounds: 2, // Short debate for test
                temperature: d2stimResult?.config?.temperature || 0.7,
                archetype: smarceResult?.archetype_detected || 'balanced',
                dominant_hemisphere: smarceResult?.dominant_hemisphere || 'central',
                needs_citations: true,
                settings: {
                    complexity_score: smarceResult?.complexity_score || 0.7,
                    dstib_routing: dstibResult,
                    d2_activation: d2stimResult?.d2_activation || 0.7
                }
            });
            
            if (data.success && data.synthesis) {
                qronasResult = data;
                log('SUCCESS', 'QRONAS', '✅ QRONAS test passed', {
                    synthesis_length: data.synthesis.length,
                    personas_used: data.personas_count,
                    rounds_executed: data.rounds_executed,
                    citations_found: data.citations?.length || 0,
                    final_G_t: data.smas_dynamics?.final_G_t,
                    final_D_t: data.smas_dynamics?.final_D_t,
                    final_omega_t: data.smas_dynamics?.final_omega_t
                });
                testResults.passed++;
            } else {
                throw new Error('QRONAS returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'QRONAS', `❌ QRONAS test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('QRONAS');

        // TEST 6: BRONAS Validator
        log('SYSTEM', 'BRONAS', '--- Testing BRONAS Validator ---');
        let bronasResult = null;
        try {
            const { data } = await base44.functions.invoke('bronasValidator', {
                response_text: qronasResult?.synthesis || 'Test response for validation',
                debate_history: qronasResult?.debate_history || [],
                omega_t: qronasResult?.smas_dynamics?.final_omega_t || 0.5,
                dopamine_t: qronasResult?.smas_dynamics?.final_D_t || 0.5
            });
            
            if (data.success && data.bronas_score !== undefined) {
                bronasResult = data;
                log('SUCCESS', 'BRONAS', '✅ BRONAS test passed', {
                    bronas_score: data.bronas_score,
                    validation_passed: data.validation_passed,
                    ethical_checkpoints: data.ethical_checkpoint_status,
                    smrce_breakdown: data.smrce_breakdown
                });
                testResults.passed++;
            } else {
                throw new Error('BRONAS returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'BRONAS', `❌ BRONAS test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('BRONAS');

        // TEST 7: Cognitive Validator
        log('SYSTEM', 'VALIDATOR', '--- Testing Cognitive Validator ---');
        let validatorResult = null;
        try {
            const { data } = await base44.functions.invoke('cognitiveValidator', {
                response_text: qronasResult?.synthesis || 'Test response',
                debate_history: qronasResult?.debate_history || [],
                personas_used: qronasResult?.personas_used || [],
                gc_score: qronasResult?.smas_dynamics?.final_G_t || 0.7,
                omega_t: qronasResult?.smas_dynamics?.final_omega_t || 0.5,
                dopamine_t: qronasResult?.smas_dynamics?.final_D_t || 0.5,
                flux_integral: 0.0,
                complexity_score: smarceResult?.complexity_score || 0.7
            });
            
            if (data.success && data.validation_result) {
                validatorResult = data.validation_result;
                log('SUCCESS', 'VALIDATOR', '✅ Cognitive Validator test passed', {
                    verdict: validatorResult.verdict,
                    validation_score: validatorResult.validation_score,
                    checks_passed: Object.values(validatorResult.checks).filter(Boolean).length,
                    total_checks: Object.keys(validatorResult.checks).length
                });
                testResults.passed++;
            } else {
                throw new Error('Cognitive Validator returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'VALIDATOR', `❌ Cognitive Validator test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('VALIDATOR');

        // TEST 8: Memory System (Manager + Semantic Search)
        log('SYSTEM', 'MEMORY', '--- Testing Memory System ---');
        try {
            // Test 8A: Memory Manager (7-tier retrieval)
            const { data: memData } = await base44.functions.invoke('smasMemoryManager', {
                user_message: test_prompt,
                conversation_id: 'test_pipeline',
                enable_intent_based_retrieval: true,
                omega_t: qronasResult?.smas_dynamics?.final_omega_t || 0.5,
                dopamine_t: qronasResult?.smas_dynamics?.final_D_t || 0.7
            });
            
            if (memData.success) {
                log('SUCCESS', 'MEMORY', '✅ Memory Manager test passed', {
                    memories_retrieved: memData.memory_stats?.total_retrieved || 0,
                    pathway: memData.pathway
                });
                testResults.passed++;
            } else {
                throw new Error('Memory Manager returned invalid data');
            }
            
            // Test 8B: Semantic Search
            const { data: searchData } = await base44.functions.invoke('memorySemanticSearch', {
                query: test_prompt,
                max_results: 5,
                use_ai_embeddings: true
            });
            
            if (searchData.success) {
                log('SUCCESS', 'MEMORY_SEARCH', '✅ Semantic Search test passed', {
                    matches_found: searchData.matches?.length || 0
                });
                testResults.passed++;
            } else {
                throw new Error('Semantic Search returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'MEMORY', `❌ Memory tests failed: ${error.message}`);
            testResults.failed += 2;
        }
        testResults.total_tests += 2;
        testResults.modules_tested.push('MEMORY_MANAGER');
        testResults.modules_tested.push('SEMANTIC_SEARCH');

        // TEST 9: Memory Tier Promotion & Pruning
        log('SYSTEM', 'MEMORY_OPS', '--- Testing Memory Promotion & Pruning ---');
        try {
            const { data: promData } = await base44.functions.invoke('memoryTierPromotion', {
                auto_promote: true,
                decay_inactive: true,
                smart_pruning: true
            });
            
            if (promData.success) {
                log('SUCCESS', 'MEMORY_OPS', '✅ Memory operations test passed', {
                    promotions: promData.promotions,
                    decays: promData.decays,
                    pruned: promData.pruned
                });
                testResults.passed++;
            } else {
                throw new Error('Memory operations returned invalid data');
            }
        } catch (error) {
            log('ERROR', 'MEMORY_OPS', `❌ Memory operations test failed: ${error.message}`);
            testResults.failed++;
        }
        testResults.total_tests++;
        testResults.modules_tested.push('MEMORY_OPERATIONS');

        // FINAL SUMMARY
        testResults.execution_time_ms = Date.now() - startTime;
        testResults.completed_at = new Date().toISOString();
        testResults.success_rate = (testResults.passed / testResults.total_tests * 100).toFixed(2);

        log('SYSTEM', 'SUMMARY', '=== PIPELINE TEST COMPLETE ===', {
            total_tests: testResults.total_tests,
            passed: testResults.passed,
            failed: testResults.failed,
            success_rate: `${testResults.success_rate}%`,
            execution_time: `${(testResults.execution_time_ms / 1000).toFixed(2)}s`
        });

        // Detailed pipeline flow summary
        const pipelineFlow = {
            smarce_output: smarceResult ? {
                complexity: smarceResult.complexity_score,
                archetype: smarceResult.archetype_detected
            } : null,
            dstib_output: dstibResult ? {
                semantic_tier: dstibResult.semantic_tier,
                routing_layer: dstibResult.routing_layer
            } : null,
            d2stim_output: d2stimResult ? {
                d2_activation: d2stimResult.d2_activation,
                config: d2stimResult.config
            } : null,
            personas_output: personasResult ? {
                count: personasResult.team.length,
                names: personasResult.team.map(p => p.name)
            } : null,
            qronas_output: qronasResult ? {
                synthesis_length: qronasResult.synthesis.length,
                citations: qronasResult.citations?.length || 0,
                dynamics: qronasResult.smas_dynamics
            } : null,
            bronas_output: bronasResult ? {
                score: bronasResult.bronas_score,
                passed: bronasResult.validation_passed
            } : null,
            validator_output: validatorResult ? {
                verdict: validatorResult.verdict,
                score: validatorResult.validation_score
            } : null
        };

        return Response.json({
            success: true,
            test_results: testResults,
            pipeline_flow: pipelineFlow,
            test_logs: testLog,
            recommendation: testResults.failed === 0 
                ? '✅ All pipeline modules operational - System ready for production'
                : `⚠️ ${testResults.failed} module(s) failed - Review logs for debugging`
        });

    } catch (error) {
        log('ERROR', 'FATAL', `Pipeline test crashed: ${error.message}`, { stack: error.stack });
        testResults.execution_time_ms = Date.now() - startTime;
        
        return Response.json({
            success: false,
            error: error.message,
            test_results: testResults,
            test_logs: testLog,
            stack: error.stack
        }, { status: 500 });
    }
});