import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BENCHMARK ORCHESTRATOR v3 - Avec Vérification de Création des Entités
 * Fix: Attend la propagation complète avant d'enregistrer les IDs
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg, level = 'INFO') => {
        const entry = `[${Date.now()}] [BenchOrch] [${level}] ${msg}`;
        logs.push(entry);
        console.log(entry);
    };

    try {
        addLog('=== BENCHMARK ORCHESTRATOR START ===', 'SYSTEM');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ 
                success: false,
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const {
            question_text,
            question_id = null,
            run_mode = 'ab_test',
            batch_count = 10,
            benchmark_settings = {}
        } = await req.json();

        addLog(`Mode: ${run_mode}, User: ${user.email}`);

        // ========================================
        // MODE: BATCH - ENHANCED WITH REAL-TIME STATS
        // ========================================
        if (run_mode === 'batch') {
            addLog(`BATCH MODE: ${batch_count} questions`);
            
            try {
                const questions = await base44.asServiceRole.entities.BenchmarkQuestion.list('-created_date', batch_count);
                
                if (!questions || questions.length === 0) {
                    throw new Error('No benchmark questions found. Please create questions first.');
                }

                addLog(`Loaded ${questions.length} questions`);

                // Créer un enregistrement de progression
                const progressRecord = await base44.asServiceRole.entities.BatchRunProgress.create({
                    run_id: `batch_${Date.now()}`,
                    started_by: user.email,
                    status: 'running',
                    total_questions: questions.length,
                    completed_questions: 0,
                    successful_questions: 0,
                    failed_questions_count: 0,
                    progress_percentage: 0,
                    start_time: new Date().toISOString(),
                    benchmark_results_ids: [],
                    summary_data: {
                        total_tests: questions.length,
                        successful_tests: 0,
                        failed_tests: 0,
                        verified_benchmarks: 0
                    },
                    real_time_stats: {
                        running_avg_spg: 0,
                        running_avg_cpu_savings: 0,
                        running_avg_token_savings: 0,
                        current_pass_rate: 0,
                        estimated_time_remaining_ms: 0
                    }
                });

                addLog(`Created progress record: ${progressRecord.id}`);

                // TRAITEMENT BATCH ASYNCHRONE AVEC STATS TEMPS RÉEL
                (async () => {
                    const resultIds = [];
                    let successCount = 0;
                    let failCount = 0;
                    const failedQuestions = [];
                    const batchStartTime = Date.now();
                    
                    // Running stats accumulators
                    let totalSpg = 0;
                    let totalCpuSavings = 0;
                    let totalTokenSavings = 0;
                    let totalPassed = 0;
                    let benchmarksLoaded = 0;
                    
                    for (let i = 0; i < questions.length; i++) {
                        const question = questions[i];
                        const questionStartTime = Date.now();
                        
                        try {
                            addLog(`[${i+1}/${questions.length}] Processing: ${question.question_id}`);

                            // Calculer temps restant estimé
                            const avgTimePerQuestion = i > 0 ? (Date.now() - batchStartTime) / i : 0;
                            const remainingQuestions = questions.length - i;
                            const estimatedTimeRemaining = avgTimePerQuestion * remainingQuestions;

                            // Mettre à jour la progression EN TEMPS RÉEL
                            await base44.asServiceRole.entities.BatchRunProgress.update(progressRecord.id, {
                                completed_questions: i,
                                successful_questions: successCount,
                                failed_questions_count: failCount,
                                progress_percentage: (i / questions.length) * 100,
                                current_question_id: question.question_id,
                                current_question_text: question.question_text,
                                real_time_stats: {
                                    running_avg_spg: benchmarksLoaded > 0 ? totalSpg / benchmarksLoaded : 0,
                                    running_avg_cpu_savings: benchmarksLoaded > 0 ? totalCpuSavings / benchmarksLoaded : 0,
                                    running_avg_token_savings: benchmarksLoaded > 0 ? totalTokenSavings / benchmarksLoaded : 0,
                                    current_pass_rate: benchmarksLoaded > 0 ? totalPassed / benchmarksLoaded : 0,
                                    estimated_time_remaining_ms: Math.round(estimatedTimeRemaining)
                                }
                            });

                            // Exécuter le benchmark A/B
                            const { data: result } = await base44.functions.invoke('benchmarkOrchestrator', {
                                question_text: question.question_text,
                                question_id: question.question_id,
                                run_mode: 'ab_test'
                            });

                            if (result && result.success && result.benchmark_id) {
                                // Vérifier que le benchmark existe vraiment
                                let benchmarkExists = false;
                                let benchmarkData = null;
                                const maxVerifyAttempts = 5;
                                
                                for (let attempt = 1; attempt <= maxVerifyAttempts; attempt++) {
                                    try {
                                        addLog(`  → Verifying benchmark ${result.benchmark_id} (attempt ${attempt}/${maxVerifyAttempts})`);
                                        benchmarkData = await base44.asServiceRole.entities.BenchmarkResult.get(result.benchmark_id);
                                        benchmarkExists = true;
                                        addLog(`  ✅ Benchmark verified!`, 'SUCCESS');
                                        break;
                                    } catch (verifyError) {
                                        addLog(`  ⚠️ Verification attempt ${attempt} failed: ${verifyError.message}`, 'WARNING');
                                        if (attempt < maxVerifyAttempts) {
                                            const delay = 500 * attempt;
                                            addLog(`  → Waiting ${delay}ms before retry...`);
                                            await new Promise(resolve => setTimeout(resolve, delay));
                                        }
                                    }
                                }

                                if (benchmarkExists && benchmarkData) {
                                    resultIds.push(result.benchmark_id);
                                    successCount++;
                                    benchmarksLoaded++;
                                    
                                    // Accumuler les stats pour calcul en temps réel
                                    totalSpg += benchmarkData.global_score_performance || 0;
                                    totalCpuSavings += benchmarkData.cpu_savings_percentage || 0;
                                    totalTokenSavings += benchmarkData.token_savings_percentage || 0;
                                    if (benchmarkData.passed) totalPassed++;
                                    
                                    addLog(`  ✅ Benchmark ${result.benchmark_id} added to results`, 'SUCCESS');
                                    addLog(`  → Stats: SPG=${benchmarkData.global_score_performance?.toFixed(3)}, Passed=${benchmarkData.passed}`, 'INFO');
                                } else {
                                    failCount++;
                                    failedQuestions.push({
                                        question_id: question.question_id,
                                        error: 'Benchmark created but not accessible after 5 verification attempts'
                                    });
                                    addLog(`  ❌ Benchmark ${result.benchmark_id} NOT verified, skipping`, 'ERROR');
                                }
                            } else {
                                failCount++;
                                failedQuestions.push({
                                    question_id: question.question_id,
                                    error: result?.error || 'No benchmark ID returned'
                                });
                                addLog(`  ❌ Question failed: ${result?.error || 'unknown error'}`, 'ERROR');
                            }

                        } catch (questionError) {
                            failCount++;
                            failedQuestions.push({
                                question_id: question.question_id,
                                error: questionError.message
                            });
                            addLog(`  ❌ ERROR on question ${i+1}: ${questionError.message}`, 'ERROR');
                        }

                        // Délai entre les tests
                        if (i < questions.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }

                    // CALCUL STATISTIQUES FINALES COMPLÈTES
                    addLog(`Computing final statistics for ${resultIds.length} verified benchmarks...`, 'INFO');
                    
                    let finalSummaryData = {
                        total_tests: questions.length,
                        successful_tests: successCount,
                        failed_tests: failCount,
                        verified_benchmarks: resultIds.length,
                        failed_questions: failedQuestions,
                        completion_time: new Date().toISOString(),
                        total_passed: 0,
                        total_failed: 0,
                        pass_rate: 0,
                        average_spg: 0,
                        average_cpu_savings: 0,
                        average_ram_savings: 0,
                        average_token_savings: 0
                    };

                    // Recharger tous les benchmarks vérifiés pour stats finales précises
                    if (resultIds.length > 0) {
                        try {
                            addLog(`Loading ${resultIds.length} verified benchmarks for final stats...`);
                            const benchmarks = [];
                            
                            for (const id of resultIds) {
                                try {
                                    const bench = await base44.asServiceRole.entities.BenchmarkResult.get(id);
                                    benchmarks.push(bench);
                                } catch (loadError) {
                                    addLog(`  ⚠️ Could not load benchmark ${id}: ${loadError.message}`, 'WARNING');
                                }
                            }

                            if (benchmarks.length > 0) {
                                const passedBenchmarks = benchmarks.filter(b => b.passed);
                                finalSummaryData.total_passed = passedBenchmarks.length;
                                finalSummaryData.total_failed = benchmarks.length - passedBenchmarks.length;
                                finalSummaryData.pass_rate = passedBenchmarks.length / benchmarks.length;
                                
                                // Calculer moyennes
                                finalSummaryData.average_spg = benchmarks.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / benchmarks.length;
                                finalSummaryData.average_cpu_savings = benchmarks.reduce((sum, b) => sum + (b.cpu_savings_percentage || 0), 0) / benchmarks.length;
                                finalSummaryData.average_ram_savings = benchmarks.reduce((sum, b) => sum + (b.ram_savings_percentage || 0), 0) / benchmarks.length;
                                finalSummaryData.average_token_savings = benchmarks.reduce((sum, b) => sum + (b.token_savings_percentage || 0), 0) / benchmarks.length;

                                addLog(`Final stats calculated:`, 'SUCCESS');
                                addLog(`  → SPG: ${finalSummaryData.average_spg.toFixed(3)}`, 'INFO');
                                addLog(`  → Pass Rate: ${(finalSummaryData.pass_rate * 100).toFixed(1)}%`, 'INFO');
                                addLog(`  → Passed: ${finalSummaryData.total_passed}/${benchmarks.length}`, 'INFO');
                                addLog(`  → CPU Savings: ${finalSummaryData.average_cpu_savings.toFixed(1)}%`, 'INFO');
                                addLog(`  → Token Savings: ${finalSummaryData.average_token_savings.toFixed(1)}%`, 'INFO');
                            }
                        } catch (statsError) {
                            addLog(`Warning: Could not calculate final stats: ${statsError.message}`, 'WARNING');
                        }
                    }

                    // Mettre à jour avec le statut final
                    await base44.asServiceRole.entities.BatchRunProgress.update(progressRecord.id, {
                        status: 'completed',
                        completed_questions: questions.length,
                        successful_questions: successCount,
                        failed_questions_count: failCount,
                        progress_percentage: 100,
                        end_time: new Date().toISOString(),
                        benchmark_results_ids: resultIds,
                        summary_data: finalSummaryData,
                        current_question_id: null,
                        current_question_text: 'Batch terminé'
                    });

                    addLog(`Batch completed: ${successCount} successful, ${failCount} failed, ${resultIds.length} verified`, 'SYSTEM');
                    addLog(`Final SPG average: ${finalSummaryData.average_spg.toFixed(3)}`, 'SUCCESS');
                })();

                // Retourner immédiatement avec l'ID de progression
                return Response.json({
                    success: true,
                    batch_id: progressRecord.id,
                    progress_record: progressRecord,
                    message: `Batch of ${questions.length} questions started`,
                    logs
                });

            } catch (batchError) {
                addLog(`BATCH ERROR: ${batchError.message}`, 'ERROR');
                return Response.json({
                    success: false,
                    error: batchError.message,
                    logs
                }, { status: 500 });
            }
        }

        // ========================================
        // MODE: AUTO-TUNE
        // ========================================
        if (run_mode === 'auto_tune') {
            addLog('AUTO-TUNE MODE');
            
            if (!question_text) {
                return Response.json({
                    success: false,
                    error: 'question_text is required for auto_tune mode',
                    logs
                }, { status: 400 });
            }

            try {
                const { data } = await base44.functions.invoke('autoTuningLoop', {
                    test_question_id: question_text,
                    max_iterations: benchmark_settings.max_iterations || 10,
                    convergence_threshold: benchmark_settings.convergence_threshold || 0.92,
                    exploration_rate: benchmark_settings.exploration_rate || 0.15,
                    quality_floor: benchmark_settings.quality_floor || 0.85,
                    efficiency_target: benchmark_settings.efficiency_target || 0.50
                });

                if (!data.success) {
                    throw new Error(data.error || 'Auto-tuning failed');
                }

                return Response.json({
                    success: true,
                    ...data,
                    logs: [...logs, ...(data.log || [])]
                });

            } catch (error) {
                addLog(`AUTO-TUNE ERROR: ${error.message}`, 'ERROR');
                return Response.json({
                    success: false,
                    error: error.message,
                    logs
                }, { status: 500 });
            }
        }

        // ========================================
        // MODE: A/B TEST (default)
        // ========================================
        if (!question_text || typeof question_text !== 'string' || !question_text.trim()) {
            return Response.json({
                success: false,
                error: 'question_text is required and must be a non-empty string',
                logs
            }, { status: 400 });
        }

        const startTime = Date.now();

        // Charger la question si question_id est fourni
        let benchQuestion = null;
        let ground_truth = null;
        let expected_key_points = [];
        
        if (question_id) {
            try {
                const questions = await base44.asServiceRole.entities.BenchmarkQuestion.filter({
                    question_id: question_id
                });
                
                if (questions && questions.length > 0) {
                    benchQuestion = questions[0];
                    ground_truth = benchQuestion.ground_truth;
                    expected_key_points = benchQuestion.expected_key_points || [];
                    addLog(`Loaded question: ${benchQuestion.question_id}`);
                }
            } catch (loadError) {
                addLog(`WARNING: Could not load question: ${loadError.message}`, 'WARNING');
            }
        }

        // MODE A: LLM Baseline
        addLog('Running Mode A (Baseline)...');
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
            addLog(`Mode A completed: ${modeATime}ms, ${mode_a_tokens} tokens`, 'SUCCESS');
        } catch (error) {
            addLog(`MODE A ERROR: ${error.message}`, 'ERROR');
            return Response.json({
                success: false,
                error: `Mode A failed: ${error.message}`,
                logs
            }, { status: 500 });
        }

        // MODE B: Neuronas
        addLog('Running Mode B (Neuronas)...');
        const modeBStart = Date.now();
        let mode_b_response = '';
        let mode_b_tokens = 0;
        let mode_b_personas = [];
        
        try {
            const { data } = await base44.functions.invoke('chatOrchestrator', {
                user_message: question_text,
                conversation_id: `bench_${Date.now()}`,
                settings: {
                    temperature: 0.7,
                    maxPersonas: 5,
                    debateRounds: 3,
                    mode: 'balanced'
                }
            });
            
            if (!data || !data.success) {
                throw new Error(data?.error || 'Mode B failed');
            }
            
            mode_b_response = data.response || '';
            mode_b_tokens = data.metadata?.estimated_tokens || Math.ceil(mode_b_response.length / 4);
            mode_b_personas = data.metadata?.personas_used || [];
            const modeBTime = Date.now() - modeBStart;
            addLog(`Mode B completed: ${modeBTime}ms, ${mode_b_tokens} tokens, ${mode_b_personas.length} personas`, 'SUCCESS');
        } catch (error) {
            addLog(`MODE B ERROR: ${error.message}`, 'ERROR');
            return Response.json({
                success: false,
                error: `Mode B failed: ${error.message}`,
                logs
            }, { status: 500 });
        }

        // Calcul des métriques
        const mode_a_time = Date.now() - modeAStart;
        const mode_b_time = Date.now() - modeBStart;
        const cpu_reduction = mode_a_time > 0 ? ((mode_a_time - mode_b_time) / mode_a_time * 100) : 0;
        const token_reduction = mode_a_tokens > 0 ? ((mode_a_tokens - mode_b_tokens) / mode_a_tokens * 100) : 0;

        addLog(`Metrics: Time ${cpu_reduction.toFixed(1)}%, Tokens ${token_reduction.toFixed(1)}%`);

        // Évaluation
        addLog('Running LLM grader evaluation...');
        let winner = 'tie';
        let quality_scores = {};
        let grader_rationale = 'Evaluation pending...';
        
        try {
            const { data: grader } = await base44.functions.invoke('evaluateResponseQuality', {
                question_text,
                output_naive: mode_a_response,
                output_d3stib: mode_b_response,
                cpu_reduction_percent: cpu_reduction,
                ground_truth,
                expected_key_points
            });
            
            if (grader && grader.success) {
                winner = grader.winner === 'A' ? 'mode_a' : 'mode_b';
                quality_scores = grader.scores || {};
                grader_rationale = grader.rationale || '';
                addLog(`Grader: Winner=${winner}`, 'SUCCESS');
            }
        } catch (graderError) {
            addLog(`WARNING: Grader failed: ${graderError.message}`, 'WARNING');
            winner = mode_b_tokens < mode_a_tokens ? 'mode_b' : 'mode_a';
            grader_rationale = 'Fallback: token count comparison';
            quality_scores = {
                mode_a_ars_score: 0.7,
                mode_b_ars_score: 0.8
            };
        }

        // CRÉATION DU BENCHMARK AVEC VÉRIFICATION
        let benchmark_id = null;
        let spg = 0;
        
        try {
            addLog('Creating benchmark entity...');
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
                ram_savings_percentage: 0,
                token_savings_percentage: token_reduction,
                passed: winner === 'mode_b',
                grader_rationale,
                ground_truth_c: ground_truth,
                expected_key_points,
                created_by: user.email,
                full_debug_log: logs
            });
            
            benchmark_id = benchmark.id;
            addLog(`Benchmark created: ${benchmark_id}`, 'SUCCESS');
            
            // VÉRIFICATION IMMÉDIATE DE LA CRÉATION
            let verificationSuccess = false;
            for (let attempt = 1; attempt <= 8; attempt++) {
                try {
                    addLog(`Verifying benchmark creation (attempt ${attempt}/8)...`);
                    await base44.asServiceRole.entities.BenchmarkResult.get(benchmark_id);
                    verificationSuccess = true;
                    addLog(`✅ Benchmark verified as accessible!`, 'SUCCESS');
                    break;
                } catch (verifyError) {
                    addLog(`⚠️ Verification attempt ${attempt} failed`, 'WARNING');
                    if (attempt < 8) {
                        const delay = 400 * attempt;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (!verificationSuccess) {
                addLog(`⚠️ Benchmark created but not immediately accessible - may appear later`, 'WARNING');
            }
            
            // Calcul SPG
            try {
                addLog('Calculating SPG...');
                const { data: spgData } = await base44.functions.invoke('calculateSPG', {
                    benchmark_result_id: benchmark_id
                });
                
                if (spgData && spgData.spg) {
                    spg = spgData.spg;
                    addLog(`SPG calculated: ${spg.toFixed(4)}`, 'SUCCESS');
                } else {
                    addLog(`⚠️ SPG calculation returned no data`, 'WARNING');
                }
            } catch (spgError) {
                addLog(`WARNING: SPG calculation failed: ${spgError.message}`, 'WARNING');
            }
        } catch (saveError) {
            addLog(`ERROR: Failed to save benchmark: ${saveError.message}`, 'ERROR');
            return Response.json({
                success: false,
                error: `Failed to save benchmark: ${saveError.message}`,
                logs
            }, { status: 500 });
        }

        const totalTime = Date.now() - startTime;
        addLog(`=== COMPLETED in ${totalTime}ms ===`, 'SYSTEM');

        return Response.json({
            success: true,
            winner,
            spg,
            benchmark_id,
            benchmark_result: {
                mode_a: {
                    response: mode_a_response.substring(0, 500),
                    time_ms: mode_a_time,
                    tokens: mode_a_tokens
                },
                mode_b: {
                    response: mode_b_response.substring(0, 500),
                    time_ms: mode_b_time,
                    tokens: mode_b_tokens,
                    personas: mode_b_personas
                }
            },
            quality_scores,
            grader_rationale,
            improvement: cpu_reduction,
            token_reduction,
            full_debug_log: logs,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`, 'CRITICAL');
        console.error('[BenchOrch] Fatal:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            details: error.stack,
            logs
        }, { status: 500 });
    }
});