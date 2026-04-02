import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Import du LogManager unifié
class LogManager {
    constructor(moduleName = 'System') {
        this.moduleName = moduleName;
        this.logs = [];
        this.startTime = Date.now();
    }

    _createEntry(level, message, metadata = {}) {
        const timestamp = Date.now() - this.startTime;
        const entry = {
            module: this.moduleName,
            timestamp,
            level,
            message,
            metadata,
            iso_time: new Date().toISOString()
        };
        
        this.logs.push(entry);
        
        const prefix = `[${timestamp}ms] [${this.moduleName}] [${level}]`;
        if (level === 'ERROR' || level === 'CRITICAL') {
            console.error(prefix, message, metadata);
        } else {
            console.log(prefix, message);
        }
        
        return entry;
    }

    info(m, d = {}) { return this._createEntry('INFO', m, d); }
    debug(m, d = {}) { return this._createEntry('DEBUG', m, d); }
    warning(m, d = {}) { return this._createEntry('WARNING', m, d); }
    error(m, d = {}) { return this._createEntry('ERROR', m, d); }
    critical(m, d = {}) { return this._createEntry('CRITICAL', m, d); }
    success(m, d = {}) { return this._createEntry('SUCCESS', m, d); }

    getFormattedLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}ms] [${log.module}] [${log.level}] ${log.message}${
                Object.keys(log.metadata).length > 0 ? ' | ' + JSON.stringify(log.metadata) : ''
            }`
        );
    }

    export() {
        return {
            module: this.moduleName,
            logs: this.logs,
            formatted: this.getFormattedLogs()
        };
    }
}

Deno.serve(async (req) => {
    const sessionId = `bench_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logger = new LogManager(`BenchmarkRunner_${sessionId}`);
    
    try {
        logger.info('=== BENCHMARK RUNNER STARTED ===', { sessionId });
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            logger.error('Unauthorized access attempt');
            return Response.json({ 
                error: 'Unauthorized', 
                success: false,
                logs: logger.getFormattedLogs()
            }, { status: 401 });
        }

        logger.info(`User authenticated: ${user.email}`);

        const { question_text, question_id, run_mode = 'ab_test' } = await req.json();

        if (!question_text) {
            logger.error('Missing question_text parameter');
            return Response.json({ 
                error: 'question_text required', 
                success: false,
                logs: logger.getFormattedLogs()
            }, { status: 400 });
        }

        logger.info(`Processing benchmark: ${question_id || 'custom'}`, { 
            run_mode, 
            prompt_length: question_text.length 
        });

        // Call Orchestrator
        logger.info('=== CALLING ORCHESTRATOR ===');
        const orchestratorStart = Date.now();

        let orchestratorResult;
        try {
            orchestratorResult = await base44.asServiceRole.functions.invoke('neuronasOrchestrator', {
                question_text,
                question_id: question_id || `Custom_${Date.now()}`,
                run_mode
            });

            const orchestratorTime = Date.now() - orchestratorStart;
            logger.success(`Orchestrator completed in ${orchestratorTime}ms`);

        } catch (orchError) {
            logger.critical('Orchestrator invocation failed', { 
                error: orchError.message,
                stack: orchError.stack
            });
            
            return Response.json({
                success: false,
                error: `Orchestrator failed: ${orchError.message}`,
                logs: logger.getFormattedLogs(),
                step_failed: 'orchestrator_invocation'
            }, { status: 500 });
        }

        const orchData = orchestratorResult.data;
        
        if (!orchData || !orchData.success) {
            logger.error('Orchestrator returned failure', { orchData });
            return Response.json({
                success: false,
                error: orchData?.error || 'Orchestrator failed',
                logs: [...logger.getFormattedLogs(), ...(orchData?.logs || [])],
                orchestrator_data: orchData
            }, { status: 500 });
        }

        logger.success('Orchestrator returned success');

        // Extract results
        const benchmarkResultId = orchData.benchmark_result_id;
        
        if (!benchmarkResultId) {
            logger.error('No benchmark_result_id in orchestrator response');
            return Response.json({
                success: false,
                error: 'No benchmark_result_id returned',
                logs: [...logger.getFormattedLogs(), ...(orchData.logs || [])],
                orchestrator_data: orchData
            }, { status: 500 });
        }

        logger.info(`Benchmark result created: ${benchmarkResultId}`);

        // Fetch the created benchmark
        logger.info('=== FETCHING BENCHMARK RESULT ===');
        let benchmarkRecord;
        
        try {
            benchmarkRecord = await base44.asServiceRole.entities.BenchmarkResult.get(benchmarkResultId);
            logger.success('Benchmark record fetched', {
                id: benchmarkRecord.id,
                scenario: benchmarkRecord.scenario_name,
                winner: benchmarkRecord.winner
            });
        } catch (fetchError) {
            logger.error('Failed to fetch benchmark record', {
                error: fetchError.message,
                benchmark_id: benchmarkResultId
            });
            
            return Response.json({
                success: true,
                benchmark_result_id: benchmarkResultId,
                warning: 'Benchmark created but fetch failed',
                logs: [...logger.getFormattedLogs(), ...(orchData.logs || [])],
                orchestrator_summary: {
                    winner: orchData.winner,
                    improvement: orchData.improvement
                }
            });
        }

        logger.success('=== BENCHMARK RUNNER COMPLETED ===');
        
        return Response.json({
            success: true,
            benchmark_result_id: benchmarkResultId,
            scenario_name: benchmarkRecord.scenario_name,
            winner: benchmarkRecord.winner,
            improvement: benchmarkRecord.performance_improvement,
            mode_a_response: benchmarkRecord.mode_a_response?.substring(0, 500),
            mode_b_response: benchmarkRecord.mode_b_response?.substring(0, 500),
            quality_scores: benchmarkRecord.quality_scores,
            mode_a_time_ms: benchmarkRecord.mode_a_time_ms,
            mode_b_time_ms: benchmarkRecord.mode_b_time_ms,
            mode_a_token_count: benchmarkRecord.mode_a_token_count,
            mode_b_token_count: benchmarkRecord.mode_b_token_count,
            logs: [...logger.getFormattedLogs(), ...(orchData.logs || [])],
            full_benchmark: benchmarkRecord
        });

    } catch (error) {
        logger.critical('BENCHMARK RUNNER CRASHED', {
            error: error.message,
            stack: error.stack
        });
        
        return Response.json({
            success: false,
            error: error.message,
            logs: logger.getFormattedLogs(),
            stack: error.stack
        }, { status: 500 });
    }
});