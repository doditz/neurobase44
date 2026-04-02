import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNOSTIC REPORT GENERATOR
 * Comprehensive app health check and issue detection
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg, level = 'INFO') => {
        const entry = `[${new Date().toISOString()}] [${level}] ${msg}`;
        logs.push(entry);
        console.log(`[Diagnostic] ${entry}`);
    };

    try {
        addLog('=== NEURONAS DIAGNOSTIC REPORT START ===', 'SYSTEM');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const report = {
            timestamp: new Date().toISOString(),
            user: user.email,
            issues: [],
            warnings: [],
            health_metrics: {},
            entity_audits: {},
            function_status: {},
            data_integrity: {}
        };

        // 1. AUDIT ENTITIES
        addLog('Auditing entities...');
        
        const entities = [
            'DevTestResult',
            'DevTestQuestion', 
            'Debate',
            'Persona',
            'BatchRunProgress',
            'UserMemory',
            'TunableParameter'
        ];

        for (const entityName of entities) {
            try {
                const count = (await base44.asServiceRole.entities[entityName].list('-created_date', 1)).length;
                const totalEstimate = count > 0 ? await countEntity(base44, entityName) : 0;
                
                report.entity_audits[entityName] = {
                    status: 'OK',
                    record_count: totalEstimate,
                    accessible: true
                };
                
                addLog(`✅ ${entityName}: ${totalEstimate} records`);
            } catch (error) {
                report.entity_audits[entityName] = {
                    status: 'ERROR',
                    error: error.message,
                    accessible: false
                };
                report.issues.push({
                    type: 'entity_access',
                    entity: entityName,
                    error: error.message
                });
                addLog(`❌ ${entityName}: ${error.message}`, 'ERROR');
            }
        }

        // 2. CHECK FOR ORPHANED DATA
        addLog('Checking for orphaned data...');
        
        try {
            const debates = await base44.asServiceRole.entities.Debate.list('-created_date', 100);
            const orphanedDebates = debates.filter(d => 
                !d.conversation_id || 
                d.conversation_id === 'pending' || 
                d.conversation_id.length < 10
            );
            
            if (orphanedDebates.length > 0) {
                report.warnings.push({
                    type: 'orphaned_debates',
                    count: orphanedDebates.length,
                    message: `${orphanedDebates.length} debate(s) sans conversation_id valide`,
                    ids: orphanedDebates.map(d => d.id).slice(0, 10)
                });
                addLog(`⚠️ Found ${orphanedDebates.length} orphaned debates`, 'WARNING');
            }
        } catch (error) {
            addLog(`Failed to check orphaned debates: ${error.message}`, 'WARNING');
        }

        // 3. CHECK BATCH PROGRESS STUCK JOBS
        addLog('Checking batch progress...');
        
        try {
            const batches = await base44.asServiceRole.entities.BatchRunProgress.list('-created_date', 20);
            const stuckBatches = batches.filter(b => 
                b.status === 'running' && 
                new Date() - new Date(b.start_time) > 30 * 60 * 1000 // > 30 min
            );
            
            if (stuckBatches.length > 0) {
                report.issues.push({
                    type: 'stuck_batches',
                    count: stuckBatches.length,
                    message: `${stuckBatches.length} batch(es) bloqué(s) depuis >30min`,
                    ids: stuckBatches.map(b => b.id)
                });
                addLog(`❌ Found ${stuckBatches.length} stuck batches`, 'ERROR');
            }
            
            const completedBatches = batches.filter(b => b.status === 'completed');
            report.health_metrics.batch_completion_rate = batches.length > 0
                ? (completedBatches.length / batches.length * 100).toFixed(1)
                : 0;
        } catch (error) {
            addLog(`Failed to check batches: ${error.message}`, 'WARNING');
        }

        // 4. CHECK ENTITY NAMING MISMATCHES
        addLog('Checking for entity naming mismatches...');
        
        const namingIssues = [];
        
        // Check if BenchmarkResult/BenchmarkQuestion still exist (should be DevTest*)
        try {
            await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 1);
            namingIssues.push({
                entity: 'BenchmarkResult',
                issue: 'Old entity name still exists, should be DevTestResult',
                severity: 'HIGH'
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                addLog('✅ BenchmarkResult correctly removed');
            }
        }
        
        try {
            await base44.asServiceRole.entities.BenchmarkQuestion.list('-created_date', 1);
            namingIssues.push({
                entity: 'BenchmarkQuestion',
                issue: 'Old entity name still exists, should be DevTestQuestion',
                severity: 'HIGH'
            });
        } catch (error) {
            if (error.message.includes('not found')) {
                addLog('✅ BenchmarkQuestion correctly removed');
            }
        }

        if (namingIssues.length > 0) {
            report.issues.push({
                type: 'entity_naming_mismatch',
                details: namingIssues
            });
        }

        // 5. CHECK DATA INTEGRITY
        addLog('Checking data integrity...');
        
        try {
            const testResults = await base44.asServiceRole.entities.DevTestResult.list('-created_date', 50);
            const incompleteResults = testResults.filter(r => 
                !r.mode_a_response || 
                !r.mode_b_response || 
                r.global_score_performance === null ||
                r.global_score_performance === undefined
            );
            
            if (incompleteResults.length > 0) {
                report.warnings.push({
                    type: 'incomplete_test_results',
                    count: incompleteResults.length,
                    message: `${incompleteResults.length} test(s) incomplet(s)`,
                    ids: incompleteResults.map(r => r.id).slice(0, 10)
                });
            }
            
            report.data_integrity.test_results = {
                total: testResults.length,
                complete: testResults.length - incompleteResults.length,
                incomplete: incompleteResults.length,
                completion_rate: ((testResults.length - incompleteResults.length) / testResults.length * 100).toFixed(1)
            };
        } catch (error) {
            addLog(`Data integrity check failed: ${error.message}`, 'WARNING');
        }

        // 6. OVERALL HEALTH SCORE
        const totalIssues = report.issues.length;
        const totalWarnings = report.warnings.length;
        let healthScore = 100;
        
        healthScore -= (totalIssues * 15);
        healthScore -= (totalWarnings * 5);
        healthScore = Math.max(0, healthScore);
        
        report.health_metrics.overall_score = healthScore;
        report.health_metrics.status = healthScore >= 80 ? 'HEALTHY' : 
                                       healthScore >= 60 ? 'WARNING' : 
                                       healthScore >= 40 ? 'DEGRADED' : 'CRITICAL';
        
        report.health_metrics.total_issues = totalIssues;
        report.health_metrics.total_warnings = totalWarnings;

        addLog(`=== DIAGNOSTIC COMPLETE: ${report.health_metrics.status} (${healthScore}/100) ===`, 'SYSTEM');
        addLog(`Issues: ${totalIssues}, Warnings: ${totalWarnings}`);

        return Response.json({
            success: true,
            report,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`, 'CRITICAL');
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

async function countEntity(base44, entityName) {
    try {
        const batch = await base44.asServiceRole.entities[entityName].list('-created_date', 500);
        return batch.length;
    } catch (error) {
        return 0;
    }
}