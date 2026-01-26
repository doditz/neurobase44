import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * STREAM TEST LOGS - Server-Sent Events (SSE) Endpoint
 * 
 * Provides real-time streaming of test execution logs.
 * Uses SSE (Server-Sent Events) to push log updates to the client.
 * 
 * Usage:
 *   GET /streamTestLogs?session_id=xxx - Connect to stream for a session
 *   POST /streamTestLogs - Create new session and start streaming test
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    let user;
    try {
        user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } catch (authError) {
        return Response.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const url = new URL(req.url);
    
    // Handle POST - Start a new streaming test
    if (req.method === 'POST') {
        const body = await req.json();
        const { question_text, question_id, run_mode = 'ab_test', orchestrator = 'benchmarkOrchestrator' } = body;

        if (!question_text) {
            return Response.json({ error: 'question_text is required' }, { status: 400 });
        }

        const sessionId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const encoder = new TextEncoder();

        // Create SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (event, data) => {
                    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(message));
                };

                try {
                    // Initial connection event
                    sendEvent('connected', { 
                        session_id: sessionId, 
                        timestamp: new Date().toISOString(),
                        user: user.email
                    });

                    // Phase 1: Initialization
                    sendEvent('log', { 
                        level: 'INFO', 
                        message: '🚀 Test initialization started...',
                        phase: 'init',
                        timestamp: Date.now()
                    });

                    // Load question if ID provided
                    let benchQuestion = null;
                    if (question_id) {
                        sendEvent('log', { 
                            level: 'DEBUG', 
                            message: `Loading question: ${question_id}`,
                            phase: 'init'
                        });
                        
                        try {
                            const questions = await base44.asServiceRole.entities.BenchmarkQuestion.filter({
                                question_id: question_id
                            });
                            if (questions?.length > 0) {
                                benchQuestion = questions[0];
                                sendEvent('log', { 
                                    level: 'SUCCESS', 
                                    message: `✅ Question loaded: ${benchQuestion.question_type}`,
                                    phase: 'init'
                                });
                            }
                        } catch (e) {
                            sendEvent('log', { 
                                level: 'WARNING', 
                                message: `⚠️ Could not load question: ${e.message}`,
                                phase: 'init'
                            });
                        }
                    }

                    // Phase 2: Mode A (Baseline)
                    sendEvent('phase', { phase: 'mode_a', status: 'starting' });
                    sendEvent('log', { 
                        level: 'INFO', 
                        message: '📝 Starting Mode A (Baseline LLM)...',
                        phase: 'mode_a'
                    });

                    const modeAStart = Date.now();
                    let mode_a_response = '';
                    let mode_a_tokens = 0;

                    try {
                        mode_a_response = await base44.integrations.Core.InvokeLLM({
                            prompt: question_text,
                            add_context_from_internet: false
                        });
                        mode_a_tokens = Math.ceil(mode_a_response.length / 4);
                        const modeATime = Date.now() - modeAStart;

                        sendEvent('log', { 
                            level: 'SUCCESS', 
                            message: `✅ Mode A completed: ${modeATime}ms, ~${mode_a_tokens} tokens`,
                            phase: 'mode_a',
                            metrics: { time_ms: modeATime, tokens: mode_a_tokens }
                        });
                        sendEvent('phase', { phase: 'mode_a', status: 'completed', time_ms: modeATime });

                    } catch (error) {
                        sendEvent('log', { 
                            level: 'ERROR', 
                            message: `❌ Mode A failed: ${error.message}`,
                            phase: 'mode_a'
                        });
                        sendEvent('error', { message: error.message, phase: 'mode_a' });
                        controller.close();
                        return;
                    }

                    // Phase 3: Mode B (Neuronas)
                    sendEvent('phase', { phase: 'mode_b', status: 'starting' });
                    sendEvent('log', { 
                        level: 'INFO', 
                        message: '🧠 Starting Mode B (Neuronas Stack)...',
                        phase: 'mode_b'
                    });

                    const modeBStart = Date.now();
                    let mode_b_response = '';
                    let mode_b_tokens = 0;
                    let mode_b_personas = [];

                    sendEvent('log', { 
                        level: 'DEBUG', 
                        message: '👥 Loading personas for debate...',
                        phase: 'mode_b'
                    });

                    try {
                        const { data } = await base44.asServiceRole.functions.invoke('chatOrchestrator', {
                            user_message: question_text,
                            conversation_id: `bench_${sessionId}`,
                            settings: {
                                temperature: 0.7,
                                maxPersonas: 5,
                                debateRounds: 3,
                                mode: 'balanced'
                            }
                        });

                        if (!data?.success) {
                            throw new Error(data?.error || 'Mode B failed');
                        }

                        mode_b_response = data.response || '';
                        mode_b_tokens = data.metadata?.estimated_tokens || Math.ceil(mode_b_response.length / 4);
                        mode_b_personas = data.metadata?.personas_used || [];
                        const modeBTime = Date.now() - modeBStart;

                        sendEvent('log', { 
                            level: 'SUCCESS', 
                            message: `✅ Mode B completed: ${modeBTime}ms, ~${mode_b_tokens} tokens, ${mode_b_personas.length} personas`,
                            phase: 'mode_b',
                            metrics: { time_ms: modeBTime, tokens: mode_b_tokens, personas: mode_b_personas.length }
                        });
                        sendEvent('phase', { phase: 'mode_b', status: 'completed', time_ms: modeBTime });

                    } catch (error) {
                        sendEvent('log', { 
                            level: 'ERROR', 
                            message: `❌ Mode B failed: ${error.message}`,
                            phase: 'mode_b'
                        });
                        sendEvent('error', { message: error.message, phase: 'mode_b' });
                        controller.close();
                        return;
                    }

                    // Phase 4: Evaluation
                    sendEvent('phase', { phase: 'evaluation', status: 'starting' });
                    sendEvent('log', { 
                        level: 'INFO', 
                        message: '🔍 Running LLM grader evaluation...',
                        phase: 'evaluation'
                    });

                    const mode_a_time = Date.now() - modeAStart;
                    const mode_b_time = Date.now() - modeBStart;
                    const cpu_reduction = mode_a_time > 0 ? ((mode_a_time - mode_b_time) / mode_a_time * 100) : 0;
                    const token_reduction = mode_a_tokens > 0 ? ((mode_a_tokens - mode_b_tokens) / mode_a_tokens * 100) : 0;

                    let winner = 'tie';
                    let quality_scores = {};
                    let grader_rationale = '';

                    try {
                        const { data: grader } = await base44.functions.invoke('evaluateResponseQuality', {
                            question_text,
                            output_naive: mode_a_response,
                            output_d3stib: mode_b_response,
                            cpu_reduction_percent: cpu_reduction,
                            ground_truth: benchQuestion?.ground_truth,
                            expected_key_points: benchQuestion?.expected_key_points || []
                        });

                        if (grader?.success) {
                            winner = grader.winner === 'A' ? 'mode_a' : 'mode_b';
                            quality_scores = grader.scores || {};
                            grader_rationale = grader.rationale || '';

                            sendEvent('log', { 
                                level: 'SUCCESS', 
                                message: `✅ Grader verdict: ${winner === 'mode_b' ? 'NEURONAS wins!' : winner === 'mode_a' ? 'Baseline wins' : 'Tie'}`,
                                phase: 'evaluation'
                            });
                        }
                    } catch (graderError) {
                        sendEvent('log', { 
                            level: 'WARNING', 
                            message: `⚠️ Grader error, using fallback: ${graderError.message}`,
                            phase: 'evaluation'
                        });
                        winner = mode_b_tokens < mode_a_tokens ? 'mode_b' : 'mode_a';
                    }

                    sendEvent('phase', { phase: 'evaluation', status: 'completed' });

                    // Phase 5: Save results
                    sendEvent('phase', { phase: 'saving', status: 'starting' });
                    sendEvent('log', { 
                        level: 'INFO', 
                        message: '💾 Saving benchmark results...',
                        phase: 'saving'
                    });

                    let benchmark_id = null;
                    try {
                        const benchmark = await base44.asServiceRole.entities.BenchmarkResult.create({
                            scenario_name: question_id || 'Custom Test',
                            scenario_category: benchQuestion?.question_type || 'custom',
                            test_prompt: question_text,
                            mode_a_response,
                            mode_a_time_ms: mode_a_time,
                            mode_a_token_count: mode_a_tokens,
                            mode_b_response,
                            mode_b_time_ms: mode_b_time,
                            mode_b_token_count: mode_b_tokens,
                            mode_b_personas_used: mode_b_personas,
                            mode_b_debate_rounds: 3,
                            quality_scores,
                            winner,
                            performance_improvement: cpu_reduction,
                            cpu_savings_percentage: cpu_reduction,
                            token_savings_percentage: token_reduction,
                            passed: winner === 'mode_b',
                            grader_rationale,
                            ground_truth_c: benchQuestion?.ground_truth,
                            expected_key_points: benchQuestion?.expected_key_points || [],
                            created_by: user.email
                        });

                        benchmark_id = benchmark.id;
                        sendEvent('log', { 
                            level: 'SUCCESS', 
                            message: `✅ Benchmark saved: ${benchmark_id}`,
                            phase: 'saving'
                        });

                    } catch (saveError) {
                        sendEvent('log', { 
                            level: 'ERROR', 
                            message: `❌ Failed to save: ${saveError.message}`,
                            phase: 'saving'
                        });
                    }

                    sendEvent('phase', { phase: 'saving', status: 'completed' });

                    // Phase 6: SPG Calculation
                    let spg = 0;
                    if (benchmark_id) {
                        sendEvent('log', { 
                            level: 'INFO', 
                            message: '📊 Calculating SPG...',
                            phase: 'spg'
                        });

                        try {
                            const { data: spgData } = await base44.functions.invoke('calculateSPG', {
                                benchmark_result_id: benchmark_id
                            });
                            if (spgData?.spg) {
                                spg = spgData.spg;
                                sendEvent('log', { 
                                    level: 'SUCCESS', 
                                    message: `✅ SPG: ${spg.toFixed(4)}`,
                                    phase: 'spg'
                                });
                            }
                        } catch (spgError) {
                            sendEvent('log', { 
                                level: 'WARNING', 
                                message: `⚠️ SPG calculation failed: ${spgError.message}`,
                                phase: 'spg'
                            });
                        }
                    }

                    // Final completion event
                    sendEvent('complete', {
                        success: true,
                        benchmark_id,
                        winner,
                        spg,
                        metrics: {
                            mode_a_time_ms: mode_a_time,
                            mode_a_tokens,
                            mode_b_time_ms: mode_b_time,
                            mode_b_tokens,
                            cpu_reduction,
                            token_reduction
                        },
                        quality_scores,
                        grader_rationale
                    });

                    sendEvent('log', { 
                        level: 'SYSTEM', 
                        message: '🎉 Test completed successfully!',
                        phase: 'complete'
                    });

                } catch (fatalError) {
                    sendEvent('error', { 
                        message: fatalError.message, 
                        fatal: true 
                    });
                } finally {
                    controller.close();
                }
            },
            cancel() {
                console.log('[StreamTestLogs] Stream cancelled by client');
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // Handle OPTIONS for CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
});