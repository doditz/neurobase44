import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ROOT CAUSE ANALYZER - Analyse Intelligente des Causes Racines
 * Utilise l'IA pour identifier les causes racines des incidents système
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[RCA] ${msg}`);
    };

    try {
        addLog('=== ROOT CAUSE ANALYSIS START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            incident_id,
            incident_type,
            severity = 'medium',
            lookback_hours = 24,
            auto_remediate = false
        } = await req.json();

        if (!incident_id) {
            return Response.json({ error: 'incident_id required' }, { status: 400 });
        }

        addLog(`Analyzing incident: ${incident_id} (${incident_type})`);

        // 1. COLLECT EVIDENCE FROM MULTIPLE SOURCES
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - lookback_hours);
        
        const evidence = {
            health_checks: [],
            benchmarks: [],
            resource_usage: [],
            batch_runs: [],
            anomalies: [],
            system_states: [],
            logs: []
        };

        // Collecter health checks
        try {
            const { data: healthData } = await base44.functions.invoke('systemHealthMonitor', {});
            if (healthData?.success) {
                evidence.health_checks.push(healthData.health_report);
            }
        } catch (error) {
            addLog(`Failed to get health data: ${error.message}`);
        }

        // Collecter benchmarks récents
        try {
            const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 50);
            evidence.benchmarks = benchmarks.filter(b => 
                new Date(b.created_date) > cutoffTime
            );
        } catch (error) {
            addLog(`Failed to get benchmarks: ${error.message}`);
        }

        // Collecter resource usage
        try {
            const usage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 100);
            evidence.resource_usage = usage.filter(u => 
                new Date(u.created_date) > cutoffTime
            );
        } catch (error) {
            addLog(`Failed to get resource usage: ${error.message}`);
        }

        // Collecter batch runs
        try {
            const batches = await base44.asServiceRole.entities.BatchRunProgress.list('-created_date', 20);
            evidence.batch_runs = batches.filter(b => 
                new Date(b.start_time) > cutoffTime
            );
        } catch (error) {
            addLog(`Failed to get batch runs: ${error.message}`);
        }

        // Collecter anomalies
        try {
            const anomalies = await base44.asServiceRole.entities.AnomalyDetection.list('-detected_at', 50);
            evidence.anomalies = anomalies.filter(a => 
                new Date(a.detected_at) > cutoffTime
            );
        } catch (error) {
            addLog(`Anomalies entity might not exist yet`);
        }

        addLog(`Evidence collected: ${Object.keys(evidence).map(k => `${k}=${evidence[k].length}`).join(', ')}`);

        // 2. ANALYZE PATTERNS AND BUILD EVIDENCE CHAIN
        const evidenceChain = [];
        let rootCauseSummary = '';
        let rootCauseCategory = 'unknown';
        let confidenceScore = 0.5;

        // Analyser les anomalies temporelles
        if (evidence.anomalies.length > 0) {
            const criticalAnomalies = evidence.anomalies.filter(a => a.severity === 'critical');
            if (criticalAnomalies.length > 0) {
                evidenceChain.push({
                    timestamp: criticalAnomalies[0].detected_at,
                    event_type: 'anomaly_detected',
                    description: `Critical anomaly in ${criticalAnomalies[0].metric_name}: ${criticalAnomalies[0].anomaly_type}`,
                    relevance_score: 0.9
                });
            }
        }

        // Analyser les batch stuck
        const stuckBatches = evidence.batch_runs.filter(b => {
            if (b.status !== 'running') return false;
            const runningTime = Date.now() - new Date(b.start_time).getTime();
            return runningTime > (30 * 60 * 1000);
        });

        if (stuckBatches.length > 0) {
            evidenceChain.push({
                timestamp: stuckBatches[0].start_time,
                event_type: 'batch_stuck',
                description: `Batch ${stuckBatches[0].run_id} stuck for >30min`,
                relevance_score: 0.85
            });
        }

        // Analyser les métriques de performance
        if (evidence.benchmarks.length > 5) {
            const avgSpg = evidence.benchmarks.reduce((sum, b) => 
                sum + (b.global_score_performance || 0), 0) / evidence.benchmarks.length;
            
            if (avgSpg < 0.7) {
                evidenceChain.push({
                    timestamp: new Date().toISOString(),
                    event_type: 'performance_degradation',
                    description: `Average SPG dropped to ${avgSpg.toFixed(3)} (target: >0.85)`,
                    relevance_score: 0.8
                });
            }
        }

        // Analyser les patterns de ressources
        if (evidence.resource_usage.length > 10) {
            const avgTokens = evidence.resource_usage.reduce((sum, r) => 
                sum + (r.tokens_used_estimated || 0), 0) / evidence.resource_usage.length;
            
            const recentTokens = evidence.resource_usage.slice(0, 5).reduce((sum, r) => 
                sum + (r.tokens_used_estimated || 0), 0) / 5;
            
            if (recentTokens > avgTokens * 2) {
                evidenceChain.push({
                    timestamp: new Date().toISOString(),
                    event_type: 'resource_spike',
                    description: `Token usage spiked to ${Math.round(recentTokens)} (avg: ${Math.round(avgTokens)})`,
                    relevance_score: 0.75
                });
            }
        }

        // 3. USE LLM FOR INTELLIGENT ANALYSIS
        addLog('Performing AI-powered root cause analysis...');
        
        const analysisPrompt = `You are an expert system reliability engineer analyzing a critical incident.

INCIDENT DETAILS:
- ID: ${incident_id}
- Type: ${incident_type}
- Severity: ${severity}
- Lookback period: ${lookback_hours} hours

EVIDENCE COLLECTED:
${JSON.stringify({
    health_status: evidence.health_checks[0]?.status || 'unknown',
    issues_detected: evidence.health_checks[0]?.issues?.length || 0,
    recent_benchmarks: evidence.benchmarks.length,
    avg_spg: evidence.benchmarks.length > 0 
        ? (evidence.benchmarks.reduce((s, b) => s + (b.global_score_performance || 0), 0) / evidence.benchmarks.length).toFixed(3)
        : 'N/A',
    stuck_batches: stuckBatches.length,
    critical_anomalies: evidence.anomalies.filter(a => a.severity === 'critical').length,
    resource_usage_samples: evidence.resource_usage.length
}, null, 2)}

EVIDENCE CHAIN:
${evidenceChain.map((e, i) => `${i + 1}. [${e.timestamp}] ${e.event_type}: ${e.description} (relevance: ${e.relevance_score})`).join('\n')}

Based on this evidence, provide a ROOT CAUSE ANALYSIS with:
1. Most probable root cause (be specific)
2. Category (configuration_issue, code_bug, resource_constraint, external_dependency, data_corruption, cascading_failure, human_error)
3. Confidence score (0-1)
4. Step-by-step remediation actions
5. Suggested configuration changes (if applicable)
6. Prevention recommendations

Respond in JSON format.`;

        let aiAnalysis;
        try {
            aiAnalysis = await base44.integrations.Core.InvokeLLM({
                prompt: analysisPrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        root_cause: { type: 'string' },
                        category: { type: 'string' },
                        confidence: { type: 'number' },
                        remediation_steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    step: { type: 'string' },
                                    priority: { type: 'string' },
                                    manual: { type: 'boolean' }
                                }
                            }
                        },
                        config_changes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    parameter: { type: 'string' },
                                    suggested_value: { type: 'string' },
                                    reasoning: { type: 'string' }
                                }
                            }
                        },
                        prevention: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                }
            });

            rootCauseSummary = aiAnalysis.root_cause;
            rootCauseCategory = aiAnalysis.category;
            confidenceScore = aiAnalysis.confidence;
            
            addLog(`AI Analysis complete. Root cause: ${rootCauseSummary}`);
        } catch (error) {
            addLog(`AI analysis failed: ${error.message}`);
            aiAnalysis = {
                root_cause: 'Analysis failed - manual investigation required',
                category: 'unknown',
                confidence: 0.3,
                remediation_steps: [],
                config_changes: [],
                prevention: []
            };
        }

        // 4. CREATE RCA RECORD
        const rcaData = {
            incident_id,
            incident_type,
            severity,
            detected_at: new Date().toISOString(),
            analysis_completed_at: new Date().toISOString(),
            root_cause_summary: rootCauseSummary,
            root_cause_category: rootCauseCategory,
            confidence_score: confidenceScore,
            evidence_chain: evidenceChain,
            affected_components: [
                ...new Set([
                    ...(stuckBatches.length > 0 ? ['batch_processing'] : []),
                    ...(evidence.anomalies.length > 0 ? ['performance_monitoring'] : []),
                    ...(evidence.health_checks[0]?.status === 'unhealthy' ? ['system_health'] : [])
                ])
            ],
            metric_changes: {
                avg_spg: evidence.benchmarks.length > 0
                    ? (evidence.benchmarks.reduce((s, b) => s + (b.global_score_performance || 0), 0) / evidence.benchmarks.length)
                    : null,
                stuck_batches: stuckBatches.length,
                critical_anomalies: evidence.anomalies.filter(a => a.severity === 'critical').length
            },
            log_patterns: logs.slice(-20),
            remediation_steps: aiAnalysis.remediation_steps.map((step, i) => ({
                step_number: i + 1,
                action: step.step,
                priority: step.priority || 'medium',
                estimated_time: '5-15 min',
                requires_manual_intervention: step.manual || false
            })),
            configuration_changes_suggested: aiAnalysis.config_changes,
            prevention_recommendations: aiAnalysis.prevention,
            full_analysis_report: `
ROOT CAUSE ANALYSIS REPORT
==========================

Incident: ${incident_id}
Type: ${incident_type}
Severity: ${severity}
Analyzed: ${new Date().toLocaleString('fr-FR')}

ROOT CAUSE:
${rootCauseSummary}

CONFIDENCE: ${(confidenceScore * 100).toFixed(0)}%
CATEGORY: ${rootCauseCategory}

EVIDENCE CHAIN:
${evidenceChain.map((e, i) => `${i + 1}. [${e.timestamp}] ${e.event_type}
   ${e.description}
   Relevance: ${(e.relevance_score * 100).toFixed(0)}%`).join('\n\n')}

REMEDIATION STEPS:
${aiAnalysis.remediation_steps.map((s, i) => `${i + 1}. [${s.priority.toUpperCase()}] ${s.step}${s.manual ? ' (Manual)' : ''}`).join('\n')}

PREVENTION:
${aiAnalysis.prevention.map((p, i) => `${i + 1}. ${p}`).join('\n')}
            `.trim(),
            status: 'completed'
        };

        const rca = await base44.asServiceRole.entities.RootCauseAnalysis.create(rcaData);
        addLog(`RCA created: ${rca.id}`);

        // 5. AUTO-REMEDIATION (si activé)
        let remediationResult = null;
        if (auto_remediate) {
            addLog('Attempting auto-remediation...');
            try {
                const { data: repairData } = await base44.functions.invoke('autoRepairService', {
                    issue_type: 'all'
                });
                remediationResult = repairData;
                addLog(`Auto-remediation: ${repairData.repair_report.repairs_successful} successful`);
            } catch (error) {
                addLog(`Auto-remediation failed: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            rca_id: rca.id,
            root_cause: rootCauseSummary,
            category: rootCauseCategory,
            confidence: confidenceScore,
            remediation_steps: aiAnalysis.remediation_steps,
            auto_remediation_applied: auto_remediate,
            remediation_result: remediationResult,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[RCA] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});