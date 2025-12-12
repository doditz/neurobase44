
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SCHEDULED HEALTH CHECK - Vérification Périodique Automatique
 * Fonction à appeler via un cron job pour surveillance continue
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[ScheduledCheck] ${msg}`);
    };

    try {
        addLog('=== SCHEDULED HEALTH CHECK START ===');
        
        const base44 = createClientFromRequest(req);

        // 1. Run anomaly detection
        addLog('Running anomaly detection...');
        let anomalyData = null;
        try {
            const { data } = await base44.functions.invoke('anomalyDetector', {
                metrics_to_check: ['all'],
                lookback_days: 7,
                sensitivity: 'medium',
                create_baseline: true
            });
            anomalyData = data;
            addLog(`Anomaly detection: ${data?.anomalies_detected || 0} anomaly(ies) found`);
        } catch (error) {
            addLog(`Anomaly detection failed: ${error.message}`);
        }

        // 2. Run predictive analysis
        addLog('Running predictive analysis...');
        let predictionData = null;
        try {
            const { data } = await base44.functions.invoke('performancePredictor', {
                prediction_horizon_hours: 24,
                confidence_threshold: 0.7
            });
            predictionData = data;
            addLog(`Predictions: ${data?.predictions_count || 0} generated`);
        } catch (error) {
            addLog(`Prediction failed: ${error.message}`);
        }

        // 3. Execute health check
        addLog('Running system health monitor...');
        const { data: healthData } = await base44.functions.invoke('systemHealthMonitor', {});

        if (!healthData || !healthData.success) {
            throw new Error('Health check failed: ' + (healthData?.error || 'Unknown error'));
        }

        const healthReport = healthData.health_report;
        addLog(`Health status: ${healthReport.status}`);

        // 4. Check for critical alerts
        const criticalIssues = healthReport.issues.filter(i => 
            i.severity === 'critical' || i.severity === 'high'
        );

        const criticalAnomalies = anomalyData?.anomalies?.filter(a => 
            a.severity === 'critical'
        ) || [];

        const highSeverityPredictions = predictionData?.predictions?.filter(p => 
            p.severity === 'high'
        ) || [];

        // 5. Run RCA if critical issues detected
        let rcaData = null;
        if (criticalIssues.length > 0 || criticalAnomalies.length > 0) {
            addLog(`Running RCA for ${criticalIssues.length + criticalAnomalies.length} critical issue(s)`);
            
            try {
                const { data } = await base44.functions.invoke('rootCauseAnalyzer', {
                    incident_id: `scheduled-check-${Date.now()}`,
                    incident_type: 'system_health_degraded',
                    severity: 'high',
                    lookback_hours: 24,
                    auto_remediate: true
                });
                rcaData = data;
                addLog(`RCA completed: ${rcaData?.root_cause || 'No specific root cause identified'}`);
            } catch (error) {
                addLog(`RCA failed: ${error.message}`);
            }
        }

        // 6. Send alerts if necessary
        if (criticalIssues.length > 0 || criticalAnomalies.length > 0 || highSeverityPredictions.length > 0) {
            addLog('Sending critical alerts to admins...');
            
            const alertMessage = [
                criticalIssues.length > 0 ? `${criticalIssues.length} critical health issue(s)` : null,
                criticalAnomalies.length > 0 ? `${criticalAnomalies.length} critical anomaly(ies)` : null,
                highSeverityPredictions.length > 0 ? `${highSeverityPredictions.length} high-severity prediction(s)` : null
            ].filter(Boolean).join(', ');
            
            try {
                await base44.functions.invoke('alertingService', {
                    alert_type: 'scheduled_check_critical',
                    severity: 'high',
                    message: `Critical issues detected: ${alertMessage}`,
                    details: JSON.stringify({
                        health_issues: criticalIssues.map(i => i.message),
                        anomalies: criticalAnomalies.map(a => `${a.metric_name}: ${a.anomaly_type}`),
                        predictions: highSeverityPredictions.map(p => p.message),
                        rca_available: !!rcaData,
                        rca_result: rcaData // Include RCA result for more context
                    }),
                    affected_resources: [
                        ...criticalIssues.flatMap(i => i.affected_ids || []),
                        ...criticalAnomalies.map(a => a.id)
                    ]
                });
                addLog('Alert sent to admins');
            } catch (alertError) {
                addLog(`Failed to send alert: ${alertError.message}`);
            }
        }

        // 7. Auto-repair if necessary
        if (healthReport.status === 'degraded' || healthReport.status === 'unhealthy') {
            const autoRepairableIssues = healthReport.issues.filter(i => i.auto_repair_available);
            
            if (autoRepairableIssues.length > 0) {
                addLog(`Attempting auto-repair for ${autoRepairableIssues.length} issue(s)...`);
                
                try {
                    const { data: repairData } = await base44.functions.invoke('autoRepairService', {
                        issue_type: 'all'
                    });

                    if (repairData && repairData.success) {
                        addLog(`Auto-repair completed: ${repairData.repair_report.repairs_successful} successful`);
                        
                        if (repairData.repair_report.repairs_successful > 0) {
                            await base44.functions.invoke('alertingService', {
                                alert_type: 'auto_repair_success',
                                severity: 'medium',
                                message: `Auto-repair successful: ${repairData.repair_report.repairs_successful} issue(s) resolved`,
                                details: JSON.stringify(repairData.repair_report.details)
                            });
                            addLog('Auto-repair success notification sent');
                        }
                    } else {
                        addLog(`Auto-repair failed: ${repairData?.error || 'Unknown error'}`);
                    }
                } catch (repairError) {
                    addLog(`Auto-repair failed: ${repairError.message}`);
                }
            }
        }

        addLog('Health check cycle complete');

        return Response.json({
            success: true,
            timestamp: new Date().toISOString(),
            health_status: healthReport.status,
            issues_found: healthReport.issues.length,
            critical_issues: criticalIssues.length,
            anomalies_detected: anomalyData?.anomalies_detected || 0,
            critical_anomalies: criticalAnomalies.length,
            predictions_generated: predictionData?.predictions_count || 0,
            high_severity_predictions: highSeverityPredictions.length,
            rca_executed: !!rcaData,
            alerts_sent: (criticalIssues.length > 0 || criticalAnomalies.length > 0 || highSeverityPredictions.length > 0),
            auto_repair_attempted: healthReport.status !== 'healthy',
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[ScheduledCheck] Fatal error:', error);
        
        // Tenter d'envoyer une alerte d'erreur critique
        try {
            const base44 = createClientFromRequest(req); // Re-initialize base44 client in case of early error
            await base44.functions.invoke('alertingService', {
                alert_type: 'scheduled_check_failure',
                severity: 'critical',
                message: 'Scheduled health check failed',
                details: error.message
            });
            addLog('Critical failure alert sent');
        } catch (alertError) {
            console.error('[ScheduledCheck] Failed to send critical alert:', alertError);
            addLog(`Failed to send critical alert: ${alertError.message}`);
        }
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});
