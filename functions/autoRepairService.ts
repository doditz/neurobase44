import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AUTO REPAIR SERVICE v4 - Enhanced Detailed Logging
 * Verbose real-time feedback for admin review
 */

Deno.serve(async (req) => {
    const logs = [];
    const detailedLogs = []; // Separate detailed logs
    
    const addLog = (msg, level = 'INFO', details = null) => {
        const timestamp = Date.now();
        const entry = `[${new Date(timestamp).toISOString()}] [${level}] ${msg}`;
        logs.push(entry);
        
        // Add detailed log entry with structured data
        if (details) {
            detailedLogs.push({
                timestamp,
                level,
                message: msg,
                details,
                iso_time: new Date(timestamp).toISOString()
            });
        }
        
        if (level === 'ERROR' || level === 'CRITICAL') {
            console.error(`[AutoRepair] ${entry}`);
        } else if (level === 'SUCCESS') {
            console.log(`[AutoRepair] ✅ ${msg}`);
        } else if (level === 'WARNING') {
            console.warn(`[AutoRepair] ⚠️ ${msg}`);
        } else if (level === 'PROGRESS') {
            console.log(`[AutoRepair] 🔄 ${msg}`);
        } else {
            console.log(`[AutoRepair] ${entry}`);
        }
    };

    try {
        addLog('=== AUTO REPAIR SERVICE v4 START ===', 'SYSTEM');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            addLog('Unauthorized access attempt', 'ERROR');
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        addLog(`Initiated by: ${user.email}`, 'INFO');

        const { 
            issue_type = 'all',
            issue_ids = [],
            max_repairs_per_call = 20,
            skip_count = 0
        } = await req.json();

        addLog(`Configuration: type=${issue_type}, max_per_call=${max_repairs_per_call}, skip=${skip_count}`, 'INFO', {
            issue_type,
            max_repairs_per_call,
            skip_count
        });

        const repairReport = {
            repairs_attempted: 0,
            repairs_successful: 0,
            repairs_failed: 0,
            details: [],
            errors: [],
            has_more: false,
            next_skip: skip_count,
            processing_stats: {
                start_time: Date.now(),
                benchmarks_inspected: 0,
                skipped_already_has_spg: 0,
                processed: 0
            }
        };

        // 1. REPAIR MISSING SPG (LIMITÉ)
        if (issue_type === 'all' || issue_type === 'missing_spg') {
            addLog('=== REPAIRING MISSING SPG (CHUNKED WITH VERBOSE LOGGING) ===', 'SYSTEM');
            
            try {
                const fetchStart = Date.now();
                const allBenchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 500);
                const fetchTime = Date.now() - fetchStart;
                
                addLog(`✓ Loaded ${allBenchmarks.length} benchmarks in ${fetchTime}ms`, 'SUCCESS', {
                    total_count: allBenchmarks.length,
                    fetch_time_ms: fetchTime
                });
                
                repairReport.processing_stats.benchmarks_inspected = allBenchmarks.length;
                
                const missingSpg = allBenchmarks.filter(b => 
                    !b.global_score_performance || b.global_score_performance === 0
                );

                const hasSpgCount = allBenchmarks.length - missingSpg.length;
                addLog(`Analysis: ${hasSpgCount} have SPG, ${missingSpg.length} MISSING SPG`, 'WARNING', {
                    total: allBenchmarks.length,
                    with_spg: hasSpgCount,
                    without_spg: missingSpg.length,
                    percentage_missing: ((missingSpg.length / allBenchmarks.length) * 100).toFixed(1)
                });

                if (missingSpg.length > 0) {
                    const toProcess = missingSpg.slice(skip_count, skip_count + max_repairs_per_call);
                    const remaining = missingSpg.length - (skip_count + toProcess.length);

                    addLog(`📦 Processing chunk: ${toProcess.length} benchmarks (${remaining} remaining after this chunk)`, 'PROGRESS', {
                        chunk_size: toProcess.length,
                        remaining_after: remaining,
                        total_missing: missingSpg.length,
                        skip_count,
                        progress_percentage: ((skip_count / missingSpg.length) * 100).toFixed(1)
                    });
                    
                    repairReport.has_more = remaining > 0;
                    repairReport.next_skip = skip_count + toProcess.length;

                    for (let i = 0; i < toProcess.length; i++) {
                        const benchmark = toProcess[i];
                        const globalIndex = skip_count + i + 1;
                        repairReport.repairs_attempted++;
                        repairReport.processing_stats.processed++;

                        addLog(`[${i + 1}/${toProcess.length}] [Global: ${globalIndex}/${missingSpg.length}] Processing ${benchmark.id.substring(0, 12)}...`, 'PROGRESS', {
                            local_index: i + 1,
                            local_total: toProcess.length,
                            global_index: globalIndex,
                            global_total: missingSpg.length,
                            benchmark_id: benchmark.id,
                            scenario: benchmark.scenario_name,
                            created_date: benchmark.created_date
                        });

                        const repairStart = Date.now();

                        try {
                            addLog(`  ↳ Calling calculateSPG for ${benchmark.scenario_name || 'unnamed'}...`, 'INFO');
                            
                            const { data: spgResponse } = await base44.functions.invoke('calculateSPG', {
                                benchmark_result_id: benchmark.id
                            });

                            const repairTime = Date.now() - repairStart;

                            if (!spgResponse) {
                                throw new Error('calculateSPG returned null/undefined response');
                            }

                            if (spgResponse.success === false) {
                                const errorMsg = spgResponse.message || spgResponse.err || 'Unknown error';
                                const errorDetails = spgResponse.details || '';
                                const suggestion = spgResponse.suggestion || '';
                                
                                addLog(`  ✗ calculateSPG FAILED: ${errorMsg}`, 'ERROR', {
                                    benchmark_id: benchmark.id,
                                    error_type: spgResponse.err,
                                    message: errorMsg,
                                    details: errorDetails,
                                    suggestion,
                                    repair_time_ms: repairTime
                                });
                                
                                if (errorDetails) addLog(`    └─ Details: ${errorDetails}`, 'ERROR');
                                if (suggestion) addLog(`    └─ Suggestion: ${suggestion}`, 'WARNING');
                                
                                throw new Error(`${errorMsg}${errorDetails ? ' - ' + errorDetails : ''}`);
                            }

                            if (spgResponse.success && spgResponse.spg) {
                                addLog(`  ✓ SPG CALCULATED: ${spgResponse.spg.toFixed(4)} (${repairTime}ms)`, 'SUCCESS', {
                                    benchmark_id: benchmark.id,
                                    spg_value: spgResponse.spg,
                                    breakdown: spgResponse.breakdown,
                                    config_version: spgResponse.config_version,
                                    repair_time_ms: repairTime,
                                    scenario: benchmark.scenario_name
                                });
                                
                                // Show breakdown details
                                if (spgResponse.breakdown) {
                                    const b = spgResponse.breakdown;
                                    addLog(`    └─ Breakdown: Q=${b.quality?.toFixed(3)}, E=${b.efficiency?.toFixed(3)}, C=${b.complexity?.toFixed(3)}`, 'INFO');
                                }
                                
                                repairReport.repairs_successful++;
                                repairReport.details.push({
                                    type: 'missing_spg',
                                    benchmark_id: benchmark.id,
                                    scenario_name: benchmark.scenario_name,
                                    action: `SPG calculated: ${spgResponse.spg.toFixed(4)}`,
                                    success: true,
                                    config_version: spgResponse.config_version,
                                    repair_time_ms: repairTime,
                                    spg_breakdown: spgResponse.breakdown
                                });
                            } else {
                                throw new Error('SPG calculation returned success but no SPG value');
                            }
                        } catch (spgError) {
                            const repairTime = Date.now() - repairStart;
                            const errorMessage = spgError.message || 'Unknown error';
                            
                            addLog(`  ✗ REPAIR FAILED: ${errorMessage} (${repairTime}ms)`, 'ERROR', {
                                benchmark_id: benchmark.id,
                                error_message: errorMessage,
                                error_stack: spgError.stack,
                                repair_time_ms: repairTime,
                                scenario: benchmark.scenario_name
                            });
                            
                            repairReport.repairs_failed++;
                            repairReport.errors.push({
                                benchmark_id: benchmark.id,
                                scenario_name: benchmark.scenario_name,
                                error: errorMessage,
                                type: 'missing_spg',
                                timestamp: new Date().toISOString(),
                                repair_time_ms: repairTime
                            });
                            repairReport.details.push({
                                type: 'missing_spg',
                                benchmark_id: benchmark.id,
                                scenario_name: benchmark.scenario_name,
                                action: 'SPG calculation failed',
                                success: false,
                                error: errorMessage,
                                repair_time_ms: repairTime
                            });
                        }

                        // Progress report every 5 items
                        if ((i + 1) % 5 === 0) {
                            const progressPct = ((i + 1) / toProcess.length * 100).toFixed(1);
                            const successRate = repairReport.repairs_attempted > 0 
                                ? ((repairReport.repairs_successful / repairReport.repairs_attempted) * 100).toFixed(1)
                                : 0;
                            
                            addLog(`🔄 Progress: ${i + 1}/${toProcess.length} (${progressPct}%) | Success Rate: ${successRate}%`, 'PROGRESS', {
                                processed: i + 1,
                                total: toProcess.length,
                                progress_percentage: progressPct,
                                success_rate: successRate,
                                successful: repairReport.repairs_successful,
                                failed: repairReport.repairs_failed
                            });
                            
                            // Petit délai pour éviter surcharge
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }

                    const chunkSuccessRate = repairReport.repairs_attempted > 0
                        ? ((repairReport.repairs_successful / repairReport.repairs_attempted) * 100).toFixed(1)
                        : 0;

                    addLog(`📊 Chunk Complete: ${repairReport.repairs_successful}✓ / ${repairReport.repairs_failed}✗ (${chunkSuccessRate}% success) | ${remaining} remaining`, 'SYSTEM', {
                        successful: repairReport.repairs_successful,
                        failed: repairReport.repairs_failed,
                        success_rate: chunkSuccessRate,
                        remaining_benchmarks: remaining,
                        has_more: remaining > 0
                    });
                }
            } catch (error) {
                addLog(`CRITICAL ERROR in SPG repair: ${error.message}`, 'CRITICAL', {
                    error_message: error.message,
                    error_stack: error.stack
                });
                repairReport.errors.push({
                    type: 'missing_spg',
                    error: error.message,
                    stack: error.stack
                });
            }
        }

        // 2. REPAIR STUCK BATCH RUNS
        if (issue_type === 'all' || issue_type === 'stuck_batches') {
            addLog('=== REPAIRING STUCK BATCHES ===', 'SYSTEM');
            
            try {
                const batches = await base44.asServiceRole.entities.BatchRunProgress.list('-start_time', 100);
                const now = Date.now();
                const STUCK_THRESHOLD = 30 * 60 * 1000;

                const stuckBatches = batches.filter(b => {
                    if (b.status !== 'running') return false;
                    const elapsed = now - new Date(b.start_time).getTime();
                    return elapsed > STUCK_THRESHOLD;
                });

                addLog(`Found ${stuckBatches.length} stuck batches (>30min)`, 'WARNING', {
                    total_batches: batches.length,
                    stuck_count: stuckBatches.length
                });

                for (const batch of stuckBatches) {
                    repairReport.repairs_attempted++;
                    
                    try {
                        const elapsed = now - new Date(batch.start_time).getTime();
                        const elapsedMin = Math.floor(elapsed / 60000);
                        
                        addLog(`  ↳ Marking batch ${batch.run_id} as failed (stuck ${elapsedMin}min)...`, 'INFO', {
                            batch_id: batch.id,
                            run_id: batch.run_id,
                            elapsed_minutes: elapsedMin
                        });
                        
                        await base44.asServiceRole.entities.BatchRunProgress.update(batch.id, {
                            status: 'failed',
                            end_time: new Date().toISOString(),
                            error_message: `Auto-repair: Batch stuck >${elapsedMin}min, marked as failed`
                        });

                        addLog(`  ✓ Batch ${batch.run_id} marked as failed`, 'SUCCESS');
                        
                        repairReport.repairs_successful++;
                        repairReport.details.push({
                            type: 'stuck_batch',
                            batch_id: batch.id,
                            run_id: batch.run_id,
                            action: `Marked as failed (stuck ${elapsedMin}min)`,
                            success: true
                        });
                    } catch (error) {
                        addLog(`  ✗ ERROR marking batch: ${error.message}`, 'ERROR');
                        
                        repairReport.repairs_failed++;
                        repairReport.errors.push({
                            batch_id: batch.id,
                            error: error.message
                        });
                    }
                }
            } catch (error) {
                addLog(`ERROR in batch repair: ${error.message}`, 'ERROR');
                repairReport.errors.push({
                    type: 'stuck_batches',
                    error: error.message
                });
            }
        }

        // 3. REPAIR STALE SYSTEM LOCKS
        if (issue_type === 'all' || issue_type === 'stale_locks') {
            addLog('=== REPAIRING STALE LOCKS ===', 'SYSTEM');
            
            try {
                const systemStates = await base44.asServiceRole.entities.SystemState.list();
                const activeLocks = systemStates.filter(s => s.is_active);
                const now = Date.now();
                const STALE_THRESHOLD = 60 * 60 * 1000;

                const staleLocks = activeLocks.filter(lock => {
                    const startTime = new Date(lock.started_at).getTime();
                    return (now - startTime) > STALE_THRESHOLD;
                });

                addLog(`Found ${staleLocks.length} stale locks (>1h)`, 'WARNING', {
                    total_locks: systemStates.length,
                    active_locks: activeLocks.length,
                    stale_locks: staleLocks.length
                });

                for (const lock of staleLocks) {
                    repairReport.repairs_attempted++;
                    
                    try {
                        const elapsed = now - new Date(lock.started_at).getTime();
                        const elapsedHours = (elapsed / 3600000).toFixed(1);
                        
                        addLog(`  ↳ Releasing lock ${lock.state_key} (${elapsedHours}h old)...`, 'INFO', {
                            lock_id: lock.id,
                            state_key: lock.state_key,
                            elapsed_hours: elapsedHours
                        });
                        
                        await base44.asServiceRole.entities.SystemState.update(lock.id, {
                            is_active: false,
                            progress_percentage: 0,
                            metadata: {
                                ...lock.metadata,
                                auto_released_at: new Date().toISOString(),
                                auto_release_reason: `Stale lock >${elapsedHours} hours`
                            }
                        });

                        addLog(`  ✓ Lock ${lock.state_key} released`, 'SUCCESS');
                        
                        repairReport.repairs_successful++;
                        repairReport.details.push({
                            type: 'stale_lock',
                            lock_key: lock.state_key,
                            action: `Released (${elapsedHours}h old)`,
                            success: true
                        });
                    } catch (error) {
                        addLog(`  ✗ ERROR releasing lock: ${error.message}`, 'ERROR');
                        
                        repairReport.repairs_failed++;
                        repairReport.errors.push({
                            lock_id: lock.id,
                            error: error.message
                        });
                    }
                }
            } catch (error) {
                addLog(`ERROR in lock repair: ${error.message}`, 'ERROR');
                repairReport.errors.push({
                    type: 'stale_locks',
                    error: error.message
                });
            }
        }

        // 4. FINAL SUMMARY
        const totalTime = Date.now() - repairReport.processing_stats.start_time;
        repairReport.processing_stats.end_time = Date.now();
        repairReport.processing_stats.total_time_ms = totalTime;
        
        addLog('=== REPAIR SUMMARY ===', 'SYSTEM');
        addLog(`⏱️  Total Time: ${(totalTime / 1000).toFixed(1)}s`, 'INFO');
        addLog(`📊 Total Attempted: ${repairReport.repairs_attempted}`, 'INFO');
        addLog(`✅ Successful: ${repairReport.repairs_successful}`, 'SUCCESS');
        addLog(`❌ Failed: ${repairReport.repairs_failed}`, 'WARNING');
        addLog(`🚨 Errors Logged: ${repairReport.errors.length}`, 'INFO');
        
        if (repairReport.has_more) {
            addLog(`⚠️  MORE REPAIRS NEEDED - Next skip: ${repairReport.next_skip}`, 'WARNING');
        } else {
            addLog('✅ All repairs completed (or no more items)', 'SUCCESS');
        }
        
        const successRate = repairReport.repairs_attempted > 0 
            ? (repairReport.repairs_successful / repairReport.repairs_attempted * 100).toFixed(1)
            : 0;
        
        addLog(`📈 Success Rate: ${successRate}%`, 'INFO');
        addLog('=== AUTO REPAIR COMPLETE ===', 'SYSTEM');

        return Response.json({
            success: true,
            repair_report: repairReport,
            summary: {
                total_attempted: repairReport.repairs_attempted,
                successful: repairReport.repairs_successful,
                failed: repairReport.repairs_failed,
                success_rate_percent: parseFloat(successRate),
                errors_count: repairReport.errors.length,
                has_more: repairReport.has_more,
                next_skip: repairReport.next_skip,
                total_time_ms: totalTime,
                processing_stats: repairReport.processing_stats
            },
            detailed_logs: detailedLogs, // Structured logs with timestamps and details
            logs // Simple string logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`, 'CRITICAL');
        addLog(`Stack: ${error.stack}`, 'DEBUG');
        console.error('[AutoRepair] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs,
            detailed_logs: detailedLogs
        }, { status: 500 });
    }
});