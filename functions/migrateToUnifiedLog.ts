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

        // Helper to delay between operations
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Batch array into chunks
        const chunkArray = (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        // Bulk create with retry
        const bulkCreateWithRetry = async (records) => {
            if (records.length === 0) return;
            
            const chunks = chunkArray(records, 10); // 10 at a time
            
            for (const chunk of chunks) {
                try {
                    await base44.asServiceRole.entities.UnifiedLog.bulkCreate(chunk);
                    stats.migrated += chunk.length;
                } catch (err) {
                    // If bulk fails, try one by one
                    for (const record of chunk) {
                        try {
                            await base44.asServiceRole.entities.UnifiedLog.create(record);
                            stats.migrated++;
                        } catch (innerErr) {
                            if (innerErr.message?.includes('duplicate') || innerErr.message?.includes('already exists')) {
                                stats.skipped++;
                            } else {
                                stats.errors.push(`${record.source_type} ${record.source_id}: ${innerErr.message}`);
                            }
                        }
                        await delay(100); // Small delay between individual creates
                    }
                }
                await delay(500); // Delay between chunks
            }
        };

        // Migrate based on entity type - collect records first, then bulk create
        if (entityType === 'benchmark' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching BenchmarkResult records...');
            const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${benchmarks.length} BenchmarkResult records`);
            
            const records = benchmarks.map(b => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        if (entityType === 'devtest' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching DevTestResult records...');
            const devtests = await base44.asServiceRole.entities.DevTestResult.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${devtests.length} DevTestResult records`);
            
            const records = devtests.map(d => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        if (entityType === 'gauntlet' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching GauntletResult records...');
            const gauntlets = await base44.asServiceRole.entities.GauntletResult.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${gauntlets.length} GauntletResult records`);
            
            const records = gauntlets.map(g => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        if (entityType === 'alert' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching AlertHistory records...');
            const alerts = await base44.asServiceRole.entities.AlertHistory.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${alerts.length} AlertHistory records`);
            
            const records = alerts.map(a => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        if (entityType === 'validation' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching ValidationMetrics records...');
            const metrics = await base44.asServiceRole.entities.ValidationMetrics.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${metrics.length} ValidationMetrics records`);
            
            const records = metrics.map(m => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        if (entityType === 'resource' || entityType === 'all') {
            logs.push('[MIGRATION] Fetching ResourceUsage records...');
            const resources = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', batchSize);
            logs.push(`[MIGRATION] Found ${resources.length} ResourceUsage records`);
            
            const records = resources.map(r => ({
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
            }));
            await bulkCreateWithRetry(records);
        }

        logs.push(`[MIGRATION] ${entityType} migration completed at ${new Date().toISOString()}`);
        logs.push(`[STATS] Migrated: ${stats.migrated}`);
        logs.push(`[STATS] Skipped (duplicates): ${stats.skipped}`);
        logs.push(`[STATS] Errors: ${stats.errors.length}`);

        const totalMigrated = stats.migrated;

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