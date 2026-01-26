/**
 * One-time migration script to copy all existing test results and logs
 * into the UnifiedLog entity for centralized data access.
 * 
 * Run with: { "entity": "benchmark" } or "devtest", "gauntlet", "alert", "validation", "resource"
 * Or run with: { "entity": "all", "batch_size": 50 } for all with smaller batches
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const entityType = body.entity || 'benchmark';
        const batchSize = body.batch_size || 100;
        const offset = body.offset || 0;

        const logs = [];
        const stats = {
            migrated: 0,
            skipped: 0,
            errors: []
        };

        logs.push(`[MIGRATION] Starting ${entityType} migration at ${new Date().toISOString()} (batch: ${batchSize}, offset: ${offset})`);

        // 1. Migrate BenchmarkResult
        logs.push('[MIGRATION] Fetching BenchmarkResult records...');
        try {
            const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 1000);
            logs.push(`[MIGRATION] Found ${benchmarks.length} BenchmarkResult records`);
            
            for (const b of benchmarks) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `benchmark_${b.id}`,
                        source_type: 'benchmark',
                        source_id: b.id,
                        execution_context: 'Benchmark',
                        config_version: b.spg_breakdown?.config_version || 'v1.0.0',
                        strategy_name: b.spg_breakdown?.active_strategy || 'default',
                        parameters_snapshot: {
                            temperature: b.mode_b_temperature,
                            debate_rounds: b.mode_b_debate_rounds,
                            personas_used: b.mode_b_personas_used,
                            d2_activation: b.mode_b_d2_activation,
                            complexity_score: b.mode_b_complexity_score
                        },
                        metrics: {
                            spg: b.global_score_performance || 0,
                            quality: b.quality_scores?.mode_b_ars_score || 0,
                            latency_ms: b.mode_b_time_ms || 0,
                            tokens: b.mode_b_token_count || 0,
                            efficiency: b.cpu_savings_percentage || 0,
                            pass_rate: b.passed ? 1 : 0,
                            improvement_percent: b.performance_improvement || 0
                        },
                        result_summary: `${b.scenario_name}: ${b.winner} won with SPG ${(b.global_score_performance || 0).toFixed(3)}`,
                        winner: b.winner || 'n/a',
                        status: b.passed ? 'success' : 'failed',
                        tags: [b.scenario_category, b.winner].filter(Boolean),
                        detailed_logs: b.full_debug_log || [],
                        execution_duration_ms: b.mode_b_time_ms || 0
                    });
                    stats.benchmarkResults++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`Benchmark ${b.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] BenchmarkResult migration failed: ${err.message}`);
            stats.errors.push(`BenchmarkResult: ${err.message}`);
        }

        // 2. Migrate DevTestResult
        logs.push('[MIGRATION] Fetching DevTestResult records...');
        try {
            const devtests = await base44.asServiceRole.entities.DevTestResult.list('-created_date', 1000);
            logs.push(`[MIGRATION] Found ${devtests.length} DevTestResult records`);
            
            for (const d of devtests) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `devtest_${d.id}`,
                        source_type: 'devtest',
                        source_id: d.id,
                        execution_context: 'DevTest',
                        config_version: d.spg_breakdown?.config_version || 'v1.0.0',
                        strategy_name: d.spg_breakdown?.active_strategy || 'default',
                        parameters_snapshot: {
                            temperature: d.mode_b_temperature,
                            debate_rounds: d.mode_b_debate_rounds,
                            personas_used: d.mode_b_personas_used,
                            d2_activation: d.mode_b_d2_activation,
                            complexity_score: d.mode_b_complexity_score,
                            smas_dynamics: d.mode_b_smas_dynamics
                        },
                        metrics: {
                            spg: d.global_score_performance || 0,
                            quality: d.quality_scores?.mode_b_ars_score || 0,
                            latency_ms: d.mode_b_time_ms || 0,
                            tokens: d.mode_b_token_count || 0,
                            efficiency: d.cpu_savings_percentage || 0,
                            pass_rate: d.passed ? 1 : 0,
                            improvement_percent: d.performance_improvement || 0
                        },
                        result_summary: `${d.scenario_name}: ${d.winner} won with SPG ${(d.global_score_performance || 0).toFixed(3)}`,
                        winner: d.winner || 'n/a',
                        status: d.passed ? 'success' : 'failed',
                        tags: [d.scenario_category, d.winner, 'devtest'].filter(Boolean),
                        detailed_logs: d.full_debug_log || [],
                        execution_duration_ms: d.mode_b_time_ms || 0
                    });
                    stats.devTestResults++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`DevTest ${d.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] DevTestResult migration failed: ${err.message}`);
            stats.errors.push(`DevTestResult: ${err.message}`);
        }

        // 3. Migrate GauntletResult
        logs.push('[MIGRATION] Fetching GauntletResult records...');
        try {
            const gauntlets = await base44.asServiceRole.entities.GauntletResult.list('-created_date', 500);
            logs.push(`[MIGRATION] Found ${gauntlets.length} GauntletResult records`);
            
            for (const g of gauntlets) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `gauntlet_${g.id}`,
                        source_type: 'gauntlet',
                        source_id: g.id,
                        execution_context: 'NeuronasGauntlet',
                        config_version: 'v1.0.0',
                        parameters_snapshot: {
                            d2_config: g.d2_config,
                            model_name: g.model_name
                        },
                        metrics: {
                            spg: (g.judge_score || 0) / 10,
                            quality: (g.judge_score || 0) / 10,
                            latency_ms: g.time_taken_ms || 0
                        },
                        result_summary: `Gauntlet Q: ${g.question?.substring(0, 50)}... Score: ${g.judge_score}/10`,
                        status: g.status === 'judged' ? 'success' : g.status === 'error' ? 'failed' : 'partial',
                        tags: ['gauntlet', g.status].filter(Boolean),
                        detailed_logs: g.judge_reasoning ? [g.judge_reasoning] : [],
                        error_message: g.error_message,
                        execution_duration_ms: g.time_taken_ms || 0
                    });
                    stats.gauntletResults++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`Gauntlet ${g.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] GauntletResult migration failed: ${err.message}`);
            stats.errors.push(`GauntletResult: ${err.message}`);
        }

        // 4. Migrate AlertHistory
        logs.push('[MIGRATION] Fetching AlertHistory records...');
        try {
            const alerts = await base44.asServiceRole.entities.AlertHistory.list('-created_date', 500);
            logs.push(`[MIGRATION] Found ${alerts.length} AlertHistory records`);
            
            for (const a of alerts) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `alert_${a.id}`,
                        source_type: 'alert',
                        source_id: a.id,
                        execution_context: 'AlertSystem',
                        metrics: {
                            spg: a.metric_value || 0
                        },
                        result_summary: a.message,
                        status: a.severity === 'critical' ? 'failed' : 'partial',
                        tags: ['alert', a.severity, a.metric_name].filter(Boolean),
                        detailed_logs: [`Threshold: ${a.threshold_value}`, `Value: ${a.metric_value}`, `Strategy: ${a.strategy_affected}`]
                    });
                    stats.alertHistory++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`Alert ${a.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] AlertHistory migration failed: ${err.message}`);
            stats.errors.push(`AlertHistory: ${err.message}`);
        }

        // 5. Migrate ValidationMetrics
        logs.push('[MIGRATION] Fetching ValidationMetrics records...');
        try {
            const metrics = await base44.asServiceRole.entities.ValidationMetrics.list('-created_date', 500);
            logs.push(`[MIGRATION] Found ${metrics.length} ValidationMetrics records`);
            
            for (const m of metrics) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `validation_${m.id}`,
                        source_type: 'system_diagnostic',
                        source_id: m.id,
                        execution_context: 'ValidationMetrics',
                        metrics: {
                            spg: m.observed_value || 0,
                            quality: m.is_passing ? 1 : 0
                        },
                        result_summary: `${m.metric_name}: ${m.observed_value} (target: ${m.target_value})`,
                        status: m.is_passing ? 'success' : 'failed',
                        tags: ['validation', m.metric_category, m.metric_name].filter(Boolean)
                    });
                    stats.validationMetrics++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`Validation ${m.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] ValidationMetrics migration failed: ${err.message}`);
            stats.errors.push(`ValidationMetrics: ${err.message}`);
        }

        // 6. Migrate ResourceUsage
        logs.push('[MIGRATION] Fetching ResourceUsage records...');
        try {
            const resources = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 500);
            logs.push(`[MIGRATION] Found ${resources.length} ResourceUsage records`);
            
            for (const r of resources) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.create({
                        log_id: `resource_${r.id}`,
                        source_type: 'chat',
                        source_id: r.conversation_id || r.id,
                        execution_context: r.agent_name || 'Chat',
                        parameters_snapshot: {
                            operation_type: r.operation_type,
                            mode_used: r.mode_used,
                            personas_activated: r.personas_activated,
                            debate_rounds: r.debate_rounds
                        },
                        metrics: {
                            tokens: r.tokens_used_estimated || 0,
                            latency_ms: r.processing_time_ms || 0,
                            efficiency: r.optimization_applied ? 1 : 0
                        },
                        result_summary: `${r.agent_name} - ${r.operation_type}: ${r.tokens_used_estimated} tokens, ${r.llm_calls_count} calls`,
                        status: 'success',
                        tags: ['resource', r.agent_name, r.operation_type, r.mode_used].filter(Boolean),
                        execution_duration_ms: r.processing_time_ms || 0
                    });
                    stats.resourceUsage++;
                } catch (err) {
                    if (!err.message?.includes('duplicate')) {
                        stats.errors.push(`Resource ${r.id}: ${err.message}`);
                    } else {
                        stats.skipped++;
                    }
                }
            }
        } catch (err) {
            logs.push(`[ERROR] ResourceUsage migration failed: ${err.message}`);
            stats.errors.push(`ResourceUsage: ${err.message}`);
        }

        logs.push(`[MIGRATION] Migration completed at ${new Date().toISOString()}`);
        logs.push(`[STATS] BenchmarkResults: ${stats.benchmarkResults}`);
        logs.push(`[STATS] DevTestResults: ${stats.devTestResults}`);
        logs.push(`[STATS] GauntletResults: ${stats.gauntletResults}`);
        logs.push(`[STATS] AlertHistory: ${stats.alertHistory}`);
        logs.push(`[STATS] ValidationMetrics: ${stats.validationMetrics}`);
        logs.push(`[STATS] ResourceUsage: ${stats.resourceUsage}`);
        logs.push(`[STATS] Skipped (duplicates): ${stats.skipped}`);
        logs.push(`[STATS] Errors: ${stats.errors.length}`);

        const totalMigrated = stats.benchmarkResults + stats.devTestResults + 
                            stats.gauntletResults + stats.alertHistory + 
                            stats.validationMetrics + stats.resourceUsage;

        return Response.json({
            success: true,
            message: `Migration completed. ${totalMigrated} records migrated to UnifiedLog.`,
            stats,
            logs
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});