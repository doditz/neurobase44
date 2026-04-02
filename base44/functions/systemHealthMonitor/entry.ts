import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SYSTEM HEALTH MONITOR - Surveillance Continue & Diagnostics
 * Surveille la santé globale du système et détecte les anomalies
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        const entry = `[${Date.now()}] ${msg}`;
        logs.push(entry);
        console.log(`[HealthMonitor] ${entry}`);
    };

    try {
        addLog('=== SYSTEM HEALTH MONITOR START ===');
        
        const base44 = createClientFromRequest(req);
        
        // Service role pour accès complet
        const healthReport = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            issues: [],
            metrics: {},
            recommendations: []
        };

        // 1. CHECK BATCH RUNS STUCK
        addLog('Checking for stuck batch runs...');
        try {
            const batchRuns = await base44.asServiceRole.entities.BatchRunProgress.list('-created_date', 50);
            const now = Date.now();
            const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
            
            const stuckRuns = batchRuns.filter(run => {
                if (run.status !== 'running') return false;
                const startTime = new Date(run.start_time).getTime();
                return (now - startTime) > STUCK_THRESHOLD_MS;
            });

            if (stuckRuns.length > 0) {
                healthReport.issues.push({
                    severity: 'high',
                    category: 'batch_processing',
                    message: `${stuckRuns.length} batch run(s) stuck for >30min`,
                    affected_ids: stuckRuns.map(r => r.id),
                    auto_repair_available: true
                });
                healthReport.status = 'degraded';
                addLog(`WARNING: Found ${stuckRuns.length} stuck batch runs`);
            }

            healthReport.metrics.batch_runs = {
                total: batchRuns.length,
                running: batchRuns.filter(r => r.status === 'running').length,
                completed: batchRuns.filter(r => r.status === 'completed').length,
                failed: batchRuns.filter(r => r.status === 'failed').length,
                stuck: stuckRuns.length
            };
        } catch (error) {
            addLog(`ERROR checking batch runs: ${error.message}`);
            healthReport.issues.push({
                severity: 'medium',
                category: 'monitoring',
                message: `Failed to check batch runs: ${error.message}`
            });
        }

        // 2. CHECK BENCHMARK RESULTS INTEGRITY
        addLog('Checking benchmark results integrity...');
        try {
            const recentBenchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 100);
            
            let missingSpg = 0;
            let missingQuality = 0;
            let orphanedResults = 0;

            for (const benchmark of recentBenchmarks) {
                if (!benchmark.global_score_performance) missingSpg++;
                if (!benchmark.quality_scores) missingQuality++;
                // Check if referenced in any batch but batch not found
                // (This would require cross-checking with BatchRunProgress)
            }

            if (missingSpg > 0 || missingQuality > 0) {
                healthReport.issues.push({
                    severity: 'medium',
                    category: 'data_integrity',
                    message: `${missingSpg} benchmarks missing SPG, ${missingQuality} missing quality scores`,
                    auto_repair_available: true
                });
            }

            healthReport.metrics.benchmarks = {
                total: recentBenchmarks.length,
                missing_spg: missingSpg,
                missing_quality: missingQuality,
                orphaned: orphanedResults
            };
        } catch (error) {
            addLog(`ERROR checking benchmarks: ${error.message}`);
            healthReport.issues.push({
                severity: 'medium',
                category: 'monitoring',
                message: `Failed to check benchmarks: ${error.message}`
            });
        }

        // 3. CHECK SYSTEM STATE LOCKS
        addLog('Checking system state locks...');
        try {
            const systemStates = await base44.asServiceRole.entities.SystemState.list();
            const activeLocks = systemStates.filter(s => s.is_active);
            
            const now = Date.now();
            const STALE_LOCK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
            
            const staleLocks = activeLocks.filter(lock => {
                const startTime = new Date(lock.started_at).getTime();
                return (now - startTime) > STALE_LOCK_THRESHOLD_MS;
            });

            if (staleLocks.length > 0) {
                healthReport.issues.push({
                    severity: 'high',
                    category: 'system_locks',
                    message: `${staleLocks.length} stale system lock(s) detected (>1 hour old)`,
                    affected_ids: staleLocks.map(l => l.id),
                    auto_repair_available: true
                });
                healthReport.status = 'degraded';
                addLog(`WARNING: Found ${staleLocks.length} stale locks`);
            }

            healthReport.metrics.system_locks = {
                total_active: activeLocks.length,
                stale: staleLocks.length
            };
        } catch (error) {
            addLog(`ERROR checking system locks: ${error.message}`);
        }

        // 4. CHECK RESOURCE USAGE PATTERNS
        addLog('Analyzing resource usage...');
        try {
            const recentUsage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 100);
            
            if (recentUsage.length > 0) {
                const avgTokens = recentUsage.reduce((sum, r) => sum + (r.tokens_used_estimated || 0), 0) / recentUsage.length;
                const avgTime = recentUsage.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / recentUsage.length;
                const avgCost = recentUsage.reduce((sum, r) => sum + (r.cost_estimated || 0), 0) / recentUsage.length;

                healthReport.metrics.resource_usage = {
                    avg_tokens_per_operation: Math.round(avgTokens),
                    avg_time_ms_per_operation: Math.round(avgTime),
                    avg_cost_per_operation: avgCost.toFixed(4),
                    total_operations: recentUsage.length
                };

                // Detect anomalies
                const highCostOps = recentUsage.filter(r => (r.cost_estimated || 0) > avgCost * 3);
                if (highCostOps.length > 5) {
                    healthReport.recommendations.push({
                        category: 'optimization',
                        message: `${highCostOps.length} operations with 3x higher cost than average detected`,
                        action: 'Consider enabling auto-optimization or reviewing complexity settings'
                    });
                }
            }
        } catch (error) {
            addLog(`ERROR analyzing resource usage: ${error.message}`);
        }

        // 5. CHECK CONFIGURATION COHERENCE
        addLog('Checking configuration coherence...');
        try {
            const spgConfigs = await base44.asServiceRole.entities.SPGConfiguration.filter({ is_active: true });
            const tunableParams = await base44.asServiceRole.entities.TunableParameter.list();
            const strategies = await base44.asServiceRole.entities.OptimizationStrategy.filter({ is_active: true });

            if (spgConfigs.length === 0) {
                healthReport.issues.push({
                    severity: 'high',
                    category: 'configuration',
                    message: 'No active SPG configuration found',
                    auto_repair_available: false
                });
                healthReport.status = 'unhealthy';
            } else if (spgConfigs.length > 1) {
                healthReport.issues.push({
                    severity: 'medium',
                    category: 'configuration',
                    message: `Multiple active SPG configurations (${spgConfigs.length}) - may cause conflicts`,
                    auto_repair_available: true
                });
            }

            healthReport.metrics.configuration = {
                active_spg_configs: spgConfigs.length,
                tunable_parameters: tunableParams.length,
                active_strategies: strategies.length,
                locked_parameters: tunableParams.filter(p => p.is_locked).length
            };
        } catch (error) {
            addLog(`ERROR checking configuration: ${error.message}`);
        }

        // 6. GENERATE RECOMMENDATIONS
        if (healthReport.issues.length === 0) {
            healthReport.recommendations.push({
                category: 'maintenance',
                message: 'System operating normally. Consider scheduling preventive maintenance.',
                action: 'Review logs weekly and run batch health check monthly'
            });
        } else {
            const autoRepairableIssues = healthReport.issues.filter(i => i.auto_repair_available);
            if (autoRepairableIssues.length > 0) {
                healthReport.recommendations.push({
                    category: 'auto_repair',
                    message: `${autoRepairableIssues.length} issue(s) can be auto-repaired`,
                    action: 'Run autoRepairService function to attempt automatic fixes'
                });
            }
        }

        // Determine overall status
        const criticalIssues = healthReport.issues.filter(i => i.severity === 'high' || i.severity === 'critical');
        if (criticalIssues.length > 0) {
            healthReport.status = 'unhealthy';
        } else if (healthReport.issues.length > 0) {
            healthReport.status = 'degraded';
        }

        addLog(`Health check complete. Status: ${healthReport.status}, Issues: ${healthReport.issues.length}`);

        return Response.json({
            success: true,
            health_report: healthReport,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[HealthMonitor] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs
        }, { status: 500 });
    }
});