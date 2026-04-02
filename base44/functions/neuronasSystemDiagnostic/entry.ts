import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NEURONAS SYSTEM DIAGNOSTIC & AUTO-REPAIR
 * Autonomous system health check and repair engine
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[Diagnostic] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        addLog('=== NEURONAS SYSTEM DIAGNOSTIC START ===');

        const diagnosticResults = {
            timestamp: new Date().toISOString(),
            modules_tested: 0,
            modules_passed: 0,
            modules_failed: 0,
            auto_repairs_applied: 0,
            critical_issues: [],
            warnings: [],
            test_results: {}
        };

        // TEST 1: D²STIB Semantic Processor
        addLog('TEST 1: D²STIB Semantic Processor');
        try {
            const { data: dstibTest } = await base44.functions.invoke('dstibSemanticProcessor', {
                user_message: "This is a test message with semantic noise and redundant filler words that need filtering",
                sensitivity_1st: 0.03,
                sensitivity_2nd: 0.12,
                sensitivity_3rd: 0.10
            });

            diagnosticResults.modules_tested++;
            if (dstibTest && dstibTest.success) {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.dstib = {
                    status: 'PASS',
                    computational_savings: dstibTest.metrics?.computational_savings || 0
                };
                addLog('✓ D²STIB: PASS', { savings: dstibTest.metrics?.computational_savings });
            } else {
                throw new Error('D²STIB returned no success flag');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.critical_issues.push({
                module: 'D²STIB',
                error: error.message,
                severity: 'CRITICAL'
            });
            addLog('✗ D²STIB: FAIL', error.message);
        }

        // TEST 2: Grounding Validator
        addLog('TEST 2: Grounding Validator');
        try {
            const { data: groundingTest } = await base44.functions.invoke('groundingValidator', {
                user_message: "The Earth revolves around the Sun",
                enable_web_search: false,
                confidence_threshold: 0.7
            });

            diagnosticResults.modules_tested++;
            if (groundingTest && groundingTest.success) {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.grounding = {
                    status: 'PASS',
                    verification_status: groundingTest.verification_status
                };
                addLog('✓ Grounding: PASS');
            } else {
                throw new Error('Grounding validator failed');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.critical_issues.push({
                module: 'Grounding',
                error: error.message,
                severity: 'HIGH'
            });
            addLog('✗ Grounding: FAIL', error.message);
        }

        // TEST 3: Vector Similarity Router
        addLog('TEST 3: Vector Similarity Router');
        try {
            const { data: routerTest } = await base44.functions.invoke('vectorSimilarityRouter', {
                user_message: "Analyze the mathematical proof of the Pythagorean theorem",
                fallback_to_keywords: true
            });

            diagnosticResults.modules_tested++;
            if (routerTest && routerTest.success) {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.routing = {
                    status: 'PASS',
                    tier: routerTest.routing_result?.semantic_tier,
                    confidence: routerTest.routing_result?.routing_confidence
                };
                addLog('✓ Routing: PASS', { tier: routerTest.routing_result?.semantic_tier });
            } else {
                throw new Error('Router failed');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.warnings.push({
                module: 'Routing',
                error: error.message,
                severity: 'MEDIUM'
            });
            addLog('⚠️ Routing: FAIL', error.message);
        }

        // TEST 4: BRONAS Ethical Validator
        addLog('TEST 4: BRONAS Ethical Validator');
        try {
            const { data: bronasTest } = await base44.functions.invoke('bronasEthicalValidator', {
                response_content: "This is a safe and ethical response for testing purposes.",
                user_message: "Test ethical validation",
                strict_mode: true
            });

            diagnosticResults.modules_tested++;
            if (bronasTest && bronasTest.success && bronasTest.status === 'APPROVED') {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.bronas = {
                    status: 'PASS',
                    ethical_status: bronasTest.status
                };
                addLog('✓ BRONAS: PASS');
            } else {
                throw new Error('BRONAS validation failed or rejected safe content');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.critical_issues.push({
                module: 'BRONAS',
                error: error.message,
                severity: 'CRITICAL'
            });
            addLog('✗ BRONAS: FAIL', error.message);
        }

        // TEST 5: SMAS Hemispheric Debate
        addLog('TEST 5: SMAS Hemispheric Debate');
        try {
            const { data: smasTest } = await base44.functions.invoke('smasHemisphericDebate', {
                user_message: "What is the meaning of creativity?",
                filtered_message: "What is creativity?",
                complexity_score: 0.6,
                max_personas: 3,
                debate_rounds: 1,
                omega_t: 0.5
            });

            diagnosticResults.modules_tested++;
            if (smasTest && smasTest.success) {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.smas = {
                    status: 'PASS',
                    debate_rounds: smasTest.debate_rounds_executed
                };
                addLog('✓ SMAS: PASS');
            } else {
                throw new Error('SMAS debate failed');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.critical_issues.push({
                module: 'SMAS',
                error: error.message,
                severity: 'HIGH'
            });
            addLog('✗ SMAS: FAIL', error.message);
        }

        // TEST 6: QRONAS Dispatcher Integration
        addLog('TEST 6: QRONAS Dispatcher v4.7');
        try {
            const { data: qronasTest } = await base44.functions.invoke('qronasDispatcherV47', {
                user_message: "Test the complete NEURONAS pipeline",
                conversation_history: [],
                settings: { enable_web_search: false }
            });

            diagnosticResults.modules_tested++;
            if (qronasTest && qronasTest.success) {
                diagnosticResults.modules_passed++;
                diagnosticResults.test_results.qronas = {
                    status: 'PASS',
                    pipeline_version: qronasTest.dispatcher_version
                };
                addLog('✓ QRONAS: PASS', { version: qronasTest.dispatcher_version });
            } else {
                throw new Error('QRONAS dispatcher failed');
            }
        } catch (error) {
            diagnosticResults.modules_tested++;
            diagnosticResults.modules_failed++;
            diagnosticResults.critical_issues.push({
                module: 'QRONAS',
                error: error.message,
                severity: 'CRITICAL'
            });
            addLog('✗ QRONAS: FAIL', error.message);
        }

        // AUTO-REPAIR: Generate repair recommendations
        const repairs = [];

        if (diagnosticResults.critical_issues.length > 0) {
            for (const issue of diagnosticResults.critical_issues) {
                if (issue.module === 'D²STIB' && issue.error.includes('generateEmbedding')) {
                    repairs.push({
                        module: 'D²STIB',
                        action: 'RETRY_WITH_FALLBACK',
                        recommendation: 'Use keyword-based fallback if embedding generation fails'
                    });
                }
                
                if (issue.module === 'BRONAS' && issue.error.includes('InvokeLLM')) {
                    repairs.push({
                        module: 'BRONAS',
                        action: 'SIMPLIFY_CHECKS',
                        recommendation: 'Use heuristic-based checks for bias detection instead of LLM'
                    });
                }

                if (issue.module === 'SMAS' && issue.error.includes('Persona')) {
                    repairs.push({
                        module: 'SMAS',
                        action: 'CHECK_PERSONAS',
                        recommendation: 'Ensure Active personas exist in database'
                    });
                }
            }
        }

        // Calculate health score
        const healthScore = diagnosticResults.modules_tested > 0 
            ? (diagnosticResults.modules_passed / diagnosticResults.modules_tested) * 100 
            : 0;

        diagnosticResults.health_score = parseFloat(healthScore.toFixed(2));
        diagnosticResults.system_status = healthScore >= 80 ? 'HEALTHY' : 
                                          healthScore >= 50 ? 'DEGRADED' : 'CRITICAL';
        diagnosticResults.auto_repair_recommendations = repairs;

        addLog('=== DIAGNOSTIC COMPLETE ===', {
            health_score: diagnosticResults.health_score,
            status: diagnosticResults.system_status,
            passed: `${diagnosticResults.modules_passed}/${diagnosticResults.modules_tested}`
        });

        return Response.json({
            success: true,
            diagnostic_results: diagnosticResults,
            logs: log
        });

    } catch (error) {
        addLog('DIAGNOSTIC ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});