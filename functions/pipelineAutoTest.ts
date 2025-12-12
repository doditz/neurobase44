import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PIPELINE AUTO-TEST v1.0 - Complete Neuronas 4.7 Pipeline Testing
 * Tests all modules autonomously: SMARCE → DSTIB → D2STIM → Memory → Personas → QRONAS → Validation → BRONAS
 */

Deno.serve(async (req) => {
    const logs = [];
    const results = {};
    const errors = [];
    
    const log = (module, status, message, data = {}) => {
        const entry = {
            module,
            status,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        logs.push(entry);
        console.log(`[PipelineTest][${module}][${status}] ${message}`, data);
    };

    try {
        log('SYSTEM', 'INFO', '=== NEURONAS 4.7 PIPELINE AUTO-TEST START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized', logs }, { status: 401 });
        }

        const { test_question = null, full_pipeline = true } = await req.json();
        
        const testPrompt = test_question || "Explique l'impact de l'intelligence artificielle sur l'éthique médicale moderne, en citant des exemples concrets.";
        
        log('SYSTEM', 'INFO', 'Test prompt loaded', { 
            prompt: testPrompt.substring(0, 100) + '...',
            full_pipeline 
        });

        const startTime = Date.now();

        // ===================================================================
        // MODULE 1: SMARCE SCORER (Complexity Assessment)
        // ===================================================================
        log('SMARCE', 'INFO', '▶ Testing SMARCE Scorer...');
        try {
            const { data: smarceData } = await base44.functions.invoke('smarceScorer', {
                user_message: testPrompt,
                conversation_id: 'test_pipeline',
                agent_name: 'smas_debater',
                settings: {}
            });

            if (smarceData?.success) {
                results.smarce = {
                    status: 'PASS',
                    complexity_score: smarceData.complexity_score,
                    archetype: smarceData.archetype_detected,
                    dominant_hemisphere: smarceData.dominant_hemisphere
                };
                log('SMARCE', 'SUCCESS', '✓ SMARCE Scorer passed', results.smarce);
            } else {
                throw new Error(smarceData?.error || 'SMARCE returned no data');
            }
        } catch (error) {
            results.smarce = { status: 'FAIL', error: error.message };
            errors.push({ module: 'SMARCE', error: error.message });
            log('SMARCE', 'ERROR', '✗ SMARCE Scorer failed', { error: error.message });
        }

        // ===================================================================
        // MODULE 2: DSTIB-HEBDEN ROUTER (Semantic Routing)
        // ===================================================================
        log('DSTIB', 'INFO', '▶ Testing DSTIB-Hebden Router...');
        try {
            const { data: dstibData } = await base44.functions.invoke('dstibHebdenRouter', {
                user_message: testPrompt,
                context: null
            });

            if (dstibData?.success) {
                results.dstib = {
                    status: 'PASS',
                    routing_result: dstibData.routing_result
                };
                log('DSTIB', 'SUCCESS', '✓ DSTIB Router passed', {
                    semantic_tier: dstibData.routing_result.semantic_tier,
                    routing_layer: dstibData.routing_result.routing_layer,
                    target_omega: dstibData.routing_result.target_omega
                });
            } else {
                throw new Error(dstibData?.error || 'DSTIB returned no data');
            }
        } catch (error) {
            results.dstib = { status: 'FAIL', error: error.message };
            errors.push({ module: 'DSTIB', error: error.message });
            log('DSTIB', 'ERROR', '✗ DSTIB Router failed', { error: error.message });
        }

        // ===================================================================
        // MODULE 3: D2STIM MODULATOR (Dopaminergic Modulation)
        // ===================================================================
        log('D2STIM', 'INFO', '▶ Testing D2STIM Modulator...');
        try {
            const { data: d2Data } = await base44.functions.invoke('d2stimModulator', {
                complexity_score: results.smarce?.complexity_score || 0.5,
                archetype: results.smarce?.archetype || 'balanced',
                dominant_hemisphere: results.smarce?.dominant_hemisphere || 'central',
                user_settings: {},
                dstib_routing: results.dstib?.routing_result || null,
                fact_check_available: false,
                citation_count: 0
            });

            if (d2Data?.success) {
                results.d2stim = {
                    status: 'PASS',
                    d2_activation: d2Data.d2_activation,
                    config: d2Data.config
                };
                log('D2STIM', 'SUCCESS', '✓ D2STIM Modulator passed', {
                    d2_activation: d2Data.d2_activation,
                    temperature: d2Data.config.temperature,
                    max_personas: d2Data.config.max_personas
                });
            } else {
                throw new Error(d2Data?.error || 'D2STIM returned no data');
            }
        } catch (error) {
            results.d2stim = { status: 'FAIL', error: error.message };
            errors.push({ module: 'D2STIM', error: error.message });
            log('D2STIM', 'ERROR', '✗ D2STIM Modulator failed', { error: error.message });
        }

        // ===================================================================
        // MODULE 4: MEMORY MANAGER (7-DB Tiered Memory)
        // ===================================================================
        log('MEMORY', 'INFO', '▶ Testing SMAS Memory Manager...');
        try {
            const omega_t = results.dstib?.routing_result?.target_omega || 0.5;
            const dopamine_t = results.d2stim?.d2_activation || 0.5;

            const { data: memoryData } = await base44.functions.invoke('smasMemoryManager', {
                user_message: testPrompt,
                conversation_id: 'test_pipeline',
                enable_intent_based_retrieval: true,
                omega_t,
                dopamine_t,
                flux_integral: 0.0
            });

            if (memoryData?.full_context) {
                results.memory = {
                    status: 'PASS',
                    context_length: memoryData.full_context.length,
                    pathway: memoryData.pathway,
                    stats: memoryData.memory_stats
                };
                log('MEMORY', 'SUCCESS', '✓ Memory Manager passed', {
                    pathway: memoryData.pathway,
                    context_length: memoryData.full_context.length
                });
            } else {
                throw new Error('Memory Manager returned no context');
            }
        } catch (error) {
            results.memory = { status: 'FAIL', error: error.message };
            errors.push({ module: 'MEMORY', error: error.message });
            log('MEMORY', 'ERROR', '✗ Memory Manager failed', { error: error.message });
        }

        // ===================================================================
        // MODULE 5: PERSONA TEAM OPTIMIZER (Persona Selection)
        // ===================================================================
        log('PERSONAS', 'INFO', '▶ Testing Persona Team Optimizer...');
        try {
            const { data: personaData } = await base44.functions.invoke('personaTeamOptimizer', {
                user_message: testPrompt,
                agent_name: 'smas_debater',
                archetype: results.smarce?.archetype || 'balanced',
                dominant_hemisphere: results.smarce?.dominant_hemisphere || 'central',
                max_personas: results.d2stim?.config?.max_personas || 5,
                settings: {
                    dstib_routing: results.dstib?.routing_result,
                    suggested_personas: results.dstib?.routing_result?.suggested_personas || []
                }
            });

            if (personaData?.success && personaData?.team) {
                results.personas = {
                    status: 'PASS',
                    team_size: personaData.team.length,
                    personas: personaData.team.map(p => p.name)
                };
                log('PERSONAS', 'SUCCESS', '✓ Persona Optimizer passed', {
                    team_size: personaData.team.length,
                    personas: personaData.team.map(p => p.name)
                });
            } else {
                throw new Error(personaData?.error || 'Persona Optimizer returned no team');
            }
        } catch (error) {
            results.personas = { status: 'FAIL', error: error.message };
            errors.push({ module: 'PERSONAS', error: error.message });
            log('PERSONAS', 'ERROR', '✗ Persona Optimizer failed', { error: error.message });
        }

        // ===================================================================
        // MODULE 6: QRONAS ENGINE (Multi-Round Debate) - LIGHTWEIGHT TEST
        // ===================================================================
        if (full_pipeline) {
            log('QRONAS', 'INFO', '▶ Testing QRONAS Engine (lightweight)...');
            try {
                const { data: qronasData } = await base44.functions.invoke('qronasEngine', {
                    prompt: testPrompt,
                    agent_name: 'smas_debater',
                    agent_instructions: 'Test mode - provide concise analysis.',
                    max_paths: 3, // Reduced for test speed
                    debate_rounds: 1, // Reduced for test speed
                    temperature: 0.7,
                    archetype: results.smarce?.archetype || 'balanced',
                    dominant_hemisphere: results.smarce?.dominant_hemisphere || 'central',
                    needs_citations: false,
                    citation_enforcement_strict: false,
                    settings: {
                        complexity_score: results.smarce?.complexity_score || 0.5,
                        d2_activation: results.d2stim?.d2_activation || 0.5
                    }
                });

                if (qronasData?.success && qronasData?.synthesis) {
                    results.qronas = {
                        status: 'PASS',
                        synthesis_length: qronasData.synthesis.length,
                        personas_used: qronasData.personas_used,
                        rounds_executed: qronasData.rounds_executed,
                        smas_dynamics: qronasData.smas_dynamics
                    };
                    log('QRONAS', 'SUCCESS', '✓ QRONAS Engine passed', {
                        synthesis_length: qronasData.synthesis.length,
                        personas_count: qronasData.personas_count,
                        rounds: qronasData.rounds_executed
                    });
                } else {
                    throw new Error(qronasData?.error || 'QRONAS returned no synthesis');
                }
            } catch (error) {
                results.qronas = { status: 'FAIL', error: error.message };
                errors.push({ module: 'QRONAS', error: error.message });
                log('QRONAS', 'ERROR', '✗ QRONAS Engine failed', { error: error.message });
            }
        } else {
            log('QRONAS', 'INFO', '⊘ QRONAS skipped (full_pipeline=false)');
            results.qronas = { status: 'SKIPPED' };
        }

        // ===================================================================
        // MODULE 7: COGNITIVE VALIDATOR (Validation Pipeline)
        // ===================================================================
        if (full_pipeline && results.qronas?.status === 'PASS') {
            log('VALIDATOR', 'INFO', '▶ Testing Cognitive Validator...');
            try {
                const { data: validatorData } = await base44.functions.invoke('cognitiveValidator', {
                    response_text: results.qronas?.synthesis_length > 0 ? 'Test synthesis response' : 'Fallback test',
                    debate_history: [],
                    personas_used: results.qronas?.personas_used || [],
                    gc_score: results.qronas?.smas_dynamics?.final_G_t || 0.7,
                    omega_t: results.qronas?.smas_dynamics?.final_omega_t || 0.5,
                    dopamine_t: results.qronas?.smas_dynamics?.final_D_t || 0.5,
                    flux_integral: 0.0,
                    complexity_score: results.smarce?.complexity_score || 0.5
                });

                if (validatorData?.success) {
                    results.validator = {
                        status: 'PASS',
                        verdict: validatorData.validation_result?.verdict,
                        validation_score: validatorData.validation_result?.validation_score,
                        checks: validatorData.validation_result?.checks
                    };
                    log('VALIDATOR', 'SUCCESS', '✓ Cognitive Validator passed', {
                        verdict: validatorData.validation_result?.verdict,
                        score: validatorData.validation_result?.validation_score
                    });
                } else {
                    throw new Error(validatorData?.error || 'Validator returned no result');
                }
            } catch (error) {
                results.validator = { status: 'FAIL', error: error.message };
                errors.push({ module: 'VALIDATOR', error: error.message });
                log('VALIDATOR', 'ERROR', '✗ Cognitive Validator failed', { error: error.message });
            }
        } else {
            log('VALIDATOR', 'INFO', '⊘ Validator skipped (dependencies not met)');
            results.validator = { status: 'SKIPPED' };
        }

        // ===================================================================
        // MODULE 8: BRONAS VALIDATOR (Ethical Validation)
        // ===================================================================
        if (full_pipeline && results.qronas?.status === 'PASS') {
            log('BRONAS', 'INFO', '▶ Testing BRONAS Validator...');
            try {
                const { data: bronasData } = await base44.functions.invoke('bronasValidator', {
                    response_text: 'Test ethical validation response',
                    debate_history: [],
                    omega_t: results.qronas?.smas_dynamics?.final_omega_t || 0.5,
                    dopamine_t: results.qronas?.smas_dynamics?.final_D_t || 0.5
                });

                if (bronasData?.success) {
                    results.bronas = {
                        status: 'PASS',
                        bronas_score: bronasData.bronas_score,
                        smrce_breakdown: bronasData.smrce_breakdown,
                        verdict: bronasData.verdict
                    };
                    log('BRONAS', 'SUCCESS', '✓ BRONAS Validator passed', {
                        bronas_score: bronasData.bronas_score,
                        verdict: bronasData.verdict
                    });
                } else {
                    throw new Error(bronasData?.error || 'BRONAS returned no result');
                }
            } catch (error) {
                results.bronas = { status: 'FAIL', error: error.message };
                errors.push({ module: 'BRONAS', error: error.message });
                log('BRONAS', 'ERROR', '✗ BRONAS Validator failed', { error: error.message });
            }
        } else {
            log('BRONAS', 'INFO', '⊘ BRONAS skipped (dependencies not met)');
            results.bronas = { status: 'SKIPPED' };
        }

        // ===================================================================
        // FINAL REPORT
        // ===================================================================
        const totalTime = Date.now() - startTime;
        const modulesRun = Object.keys(results).length;
        const modulesPassed = Object.values(results).filter(r => r.status === 'PASS').length;
        const modulesFailed = errors.length;
        const modulesSkipped = Object.values(results).filter(r => r.status === 'SKIPPED').length;
        
        const overallStatus = modulesFailed === 0 ? 'ALL_PASS' : 
                             modulesPassed > modulesFailed ? 'PARTIAL_PASS' : 'CRITICAL_FAIL';

        log('SYSTEM', 'INFO', '=== PIPELINE TEST COMPLETE ===', {
            overall_status: overallStatus,
            total_time_ms: totalTime,
            modules_run: modulesRun,
            modules_passed: modulesPassed,
            modules_failed: modulesFailed,
            modules_skipped: modulesSkipped
        });

        return Response.json({
            success: modulesFailed === 0,
            overall_status: overallStatus,
            summary: {
                total_time_ms: totalTime,
                modules_run: modulesRun,
                modules_passed: modulesPassed,
                modules_failed: modulesFailed,
                modules_skipped: modulesSkipped,
                pass_rate: modulesRun > 0 ? (modulesPassed / modulesRun * 100).toFixed(1) + '%' : '0%'
            },
            results,
            errors,
            logs
        });

    } catch (error) {
        log('SYSTEM', 'ERROR', `FATAL: ${error.message}`, { stack: error.stack });
        return Response.json({ 
            success: false, 
            error: error.message, 
            results,
            errors,
            logs 
        }, { status: 500 });
    }
});