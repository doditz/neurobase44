import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AUTO-TUNING LOOP v4.5 - Sweet Spot Optimizer
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg) => {
        log.push(`[${Date.now()}] ${msg}`);
        console.log(`[AutoTune] ${msg}`);
    };

    try {
        addLog('=== AUTO-TUNING LOOP v4.5 ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            test_question_id,
            max_iterations = 10,
            convergence_threshold = 0.92,
            exploration_rate = 0.15,
            quality_floor = 0.85,
            efficiency_target = 0.50
        } = await req.json();

        if (!test_question_id) {
            return Response.json({
                success: false,
                error: 'test_question_id required'
            }, { status: 400 });
        }

        addLog(`Target: Quality>=${quality_floor}, Efficiency>=${efficiency_target*100}%`);
        addLog(`Max iterations: ${max_iterations}`);

        // Charger paramètres ajustables
        const tunableParams = await base44.asServiceRole.entities.TunableParameter.filter({
            is_locked: false
        });

        if (tunableParams.length === 0) {
            throw new Error('No tunable parameters found');
        }

        addLog(`Loaded ${tunableParams.length} tunable parameters`);

        let bestSPG = 0;
        let bestQuality = 0;
        let bestEfficiency = 0;
        let bestTokens = Infinity;
        let bestConfig = {};
        let bestBenchmarkId = null;
        let iteration = 0;
        let initialSPG = null;

        const startTime = Date.now();

        // Boucle d'optimisation
        while (iteration < max_iterations) {
            iteration++;
            addLog(`\n━━━ ITERATION ${iteration}/${max_iterations} ━━━`);

            // Configuration actuelle
            const currentConfig = {};
            for (const param of tunableParams) {
                currentConfig[param.parameter_name] = param.current_value;
            }

            addLog(`Config: ${JSON.stringify(currentConfig)}`);

            // Exécuter benchmark
            addLog('Running benchmark...');
            let benchmarkResult;
            
            try {
                const { data } = await base44.functions.invoke('benchmarkOrchestrator', {
                    question_text: test_question_id,
                    run_mode: 'ab_test'
                });

                if (!data.success) {
                    throw new Error(data.error || 'Benchmark failed');
                }

                benchmarkResult = data;
                addLog(`Benchmark completed`);

            } catch (benchError) {
                addLog(`ERROR: Benchmark failed: ${benchError.message}`);
                break;
            }

            // Extraire métriques - FIXED: correct property paths
            const spg = benchmarkResult.spg || 0;
            const tokens = benchmarkResult.benchmark_result?.mode_b?.tokens || benchmarkResult.mode_b_token_count || 0;
            const tokensA = benchmarkResult.benchmark_result?.mode_a?.tokens || benchmarkResult.mode_a_token_count || tokens;
            
            // Quality score extraction - try multiple paths
            let quality = 0;
            if (benchmarkResult.quality_scores) {
                quality = benchmarkResult.quality_scores.mode_b_ars_score || 
                         benchmarkResult.quality_scores.B?.relevance ||
                         benchmarkResult.quality_scores.overall || 
                         0;
            }
            // Fallback: estimate quality from winner
            if (quality === 0 && benchmarkResult.winner === 'mode_b') {
                quality = 0.8;
            } else if (quality === 0) {
                quality = 0.6;
            }

            const tokenEfficiency = tokensA > 0 ? ((tokensA - tokens) / tokensA) : 0;
            const overallEfficiency = Math.max(0, tokenEfficiency);

            addLog(`SPG=${spg.toFixed(3)}, Q=${quality.toFixed(2)}, Eff=${(overallEfficiency*100).toFixed(1)}%`);

            // Baseline
            if (iteration === 1) {
                initialSPG = spg;
                bestSPG = spg;
                bestQuality = quality;
                bestEfficiency = overallEfficiency;
                bestTokens = tokens;
                bestConfig = { ...currentConfig };
                bestBenchmarkId = benchmarkResult.benchmark_id;
                addLog(`Baseline: SPG=${initialSPG.toFixed(3)}`);
            }

            // Évaluation sweet spot
            const isInSweetSpot = quality >= quality_floor && overallEfficiency >= 0.3;
            const isBetter = isInSweetSpot && (
                spg > bestSPG || 
                (spg >= bestSPG * 0.98 && overallEfficiency > bestEfficiency)
            );

            if (isBetter) {
                bestSPG = spg;
                bestQuality = quality;
                bestEfficiency = overallEfficiency;
                bestTokens = tokens;
                bestConfig = { ...currentConfig };
                bestBenchmarkId = benchmarkResult.benchmark_id;
                
                addLog(`🎯 NEW BEST! SPG=${spg.toFixed(3)}, Q=${quality.toFixed(2)}`);
            }

            // Convergence check
            if (quality >= quality_floor && overallEfficiency >= efficiency_target && spg >= convergence_threshold) {
                addLog(`🏆 SWEET SPOT REACHED!`);
                break;
            }

            // Ajustements
            addLog('Adjusting parameters...');
            for (const param of tunableParams) {
                const paramName = param.parameter_name;
                let delta = 0;

                if (quality < quality_floor) {
                    // Boost quality
                    if (paramName === 'maxPersonas' || paramName === 'debateRounds') {
                        delta = param.adjustment_step;
                    }
                } else if (overallEfficiency < efficiency_target) {
                    // Boost efficiency
                    if (paramName === 'maxPersonas' || paramName === 'debateRounds') {
                        delta = -param.adjustment_step * 1.2;
                    } else if (paramName === 'semanticCompressionRatio') {
                        delta = param.adjustment_step * 1.2;
                    }
                } else {
                    // Fine-tuning
                    if (Math.random() < exploration_rate) {
                        delta = (Math.random() - 0.5) * param.adjustment_step * 0.5;
                    }
                }

                if (delta !== 0) {
                    let newValue = param.current_value + delta;
                    newValue = Math.max(param.min_bound, Math.min(param.max_bound, newValue));

                    if (!param.is_continuous && param.discrete_values?.length) {
                        newValue = param.discrete_values.reduce((prev, curr) =>
                            Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev
                        );
                    }

                    if (newValue !== param.current_value) {
                        await base44.asServiceRole.entities.TunableParameter.update(param.id, {
                            current_value: newValue,
                            last_adjusted: new Date().toISOString()
                        });
                        addLog(`  ${paramName}: ${param.current_value.toFixed(2)} → ${newValue.toFixed(2)}`);
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const totalTime = Date.now() - startTime;
        const improvement = initialSPG > 0 ? ((bestSPG - initialSPG) / initialSPG) : 0;

        addLog(`\n${'='.repeat(60)}`);
        addLog(`COMPLETED: ${iteration} iterations in ${(totalTime/1000).toFixed(1)}s`);
        addLog(`Best SPG: ${bestSPG.toFixed(3)} (+${(improvement*100).toFixed(1)}%)`);
        addLog(`Quality: ${bestQuality.toFixed(3)}, Efficiency: ${(bestEfficiency*100).toFixed(1)}%`);
        addLog(`${'='.repeat(60)}`);

        return Response.json({
            success: true,
            status: bestQuality >= quality_floor && bestEfficiency >= efficiency_target ? 'sweet_spot_reached' : 
                    bestSPG >= convergence_threshold ? 'converged' : 'max_iter',
            iterations: iteration,
            initial_spg: initialSPG,
            best_spg: bestSPG,
            best_metrics: {
                spg: bestSPG,
                quality: bestQuality,
                efficiency: bestEfficiency,
                tokens: bestTokens
            },
            improvements: {
                spg_improvement_percent: improvement * 100,
                efficiency_gain_percent: bestEfficiency * 100
            },
            improvement,
            best_configuration: bestConfig,
            best_benchmark_id: bestBenchmarkId,
            execution_time_ms: totalTime,
            sweet_spot_achieved: bestQuality >= quality_floor && bestEfficiency >= efficiency_target,
            log
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[AutoTune] Fatal:', error);

        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            log
        }, { status: 500 });
    }
});