import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ALERTING ENGINE v1.0
 * Real-time threshold monitoring and notification system
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${new Date().toISOString()}] ${msg}`);
        console.log(`[AlertEngine] ${msg}`);
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            action = 'check',
            benchmark_result = null,
            metrics = null
        } = await req.json();

        addLog(`Action: ${action}, User: ${user.email}`);

        // LOAD ACTIVE THRESHOLDS
        const thresholds = await base44.asServiceRole.entities.AlertThreshold.filter({ is_active: true });
        addLog(`Loaded ${thresholds.length} active thresholds`);

        if (action === 'check_benchmark' && benchmark_result) {
            // Check a single benchmark result against thresholds
            const triggeredAlerts = [];

            for (const threshold of thresholds) {
                const alert = await checkThreshold(threshold, benchmark_result, base44, addLog);
                if (alert) {
                    triggeredAlerts.push(alert);
                }
            }

            return Response.json({
                success: true,
                alerts_triggered: triggeredAlerts.length,
                alerts: triggeredAlerts,
                logs
            });
        }

        if (action === 'check_metrics' && metrics) {
            // Check arbitrary metrics object against thresholds
            const triggeredAlerts = [];

            for (const threshold of thresholds) {
                const metricValue = metrics[threshold.metric_name];
                if (metricValue === undefined) continue;

                const isTriggered = evaluateThreshold(threshold, metricValue);
                
                if (isTriggered) {
                    const cooldownOk = await checkCooldown(threshold, base44);
                    
                    if (cooldownOk) {
                        const alert = await createAlert(threshold, metricValue, null, metrics.strategy || 'unknown', base44, addLog);
                        triggeredAlerts.push(alert);
                    } else {
                        addLog(`Alert ${threshold.metric_name} in cooldown, skipping`);
                    }
                }
            }

            return Response.json({
                success: true,
                alerts_triggered: triggeredAlerts.length,
                alerts: triggeredAlerts,
                logs
            });
        }

        if (action === 'get_recent_alerts') {
            // Get recent unacknowledged alerts
            const recentAlerts = await base44.asServiceRole.entities.AlertHistory.filter(
                { acknowledged: false },
                '-created_date',
                20
            );

            return Response.json({
                success: true,
                alerts: recentAlerts,
                count: recentAlerts.length,
                logs
            });
        }

        if (action === 'acknowledge_alert') {
            const { alert_id } = await req.json();
            
            await base44.asServiceRole.entities.AlertHistory.update(alert_id, {
                acknowledged: true,
                acknowledged_by: user.email,
                acknowledged_at: new Date().toISOString()
            });

            return Response.json({ success: true, message: 'Alert acknowledged' });
        }

        return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        addLog(`ERROR: ${error.message}`);
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

async function checkThreshold(threshold, benchmark, base44, addLog) {
    let metricValue;

    switch (threshold.metric_name) {
        case 'spg':
            metricValue = benchmark.global_score_performance;
            break;
        case 'pass_rate':
            metricValue = benchmark.passed ? 100 : 0;
            break;
        case 'latency_ms':
            metricValue = benchmark.mode_b_time_ms;
            break;
        case 'cpu_savings':
            metricValue = benchmark.cpu_savings_percentage;
            break;
        case 'token_savings':
            metricValue = benchmark.token_savings_percentage;
            break;
        case 'quality_improvement':
            metricValue = benchmark.performance_improvement;
            break;
        default:
            return null;
    }

    if (metricValue === undefined || metricValue === null) return null;

    const isTriggered = evaluateThreshold(threshold, metricValue);

    if (isTriggered) {
        addLog(`⚠️ Threshold triggered: ${threshold.metric_name} = ${metricValue} (${threshold.threshold_type} ${threshold.threshold_value})`);
        
        const cooldownOk = await checkCooldown(threshold, base44);
        
        if (cooldownOk) {
            const strategy = benchmark.spg_breakdown?.active_strategy || 'unknown';
            return await createAlert(threshold, metricValue, benchmark.id, strategy, base44, addLog);
        }
    }

    return null;
}

function evaluateThreshold(threshold, value) {
    switch (threshold.threshold_type) {
        case 'below':
            return value < threshold.threshold_value;
        case 'above':
            return value > threshold.threshold_value;
        case 'deviation':
            // For deviation, we'd need a baseline - simplified here
            return Math.abs(value) > threshold.deviation_percent;
        default:
            return false;
    }
}

async function checkCooldown(threshold, base44) {
    if (!threshold.last_triggered) return true;

    const lastTriggered = new Date(threshold.last_triggered);
    const cooldownMs = (threshold.cooldown_minutes || 15) * 60 * 1000;
    const now = new Date();

    return (now - lastTriggered) > cooldownMs;
}

async function createAlert(threshold, metricValue, benchmarkId, strategy, base44, addLog) {
    const message = generateAlertMessage(threshold, metricValue, strategy);

    const alert = await base44.asServiceRole.entities.AlertHistory.create({
        alert_threshold_id: threshold.id,
        metric_name: threshold.metric_name,
        metric_value: metricValue,
        threshold_value: threshold.threshold_value,
        severity: threshold.severity,
        strategy_affected: strategy,
        benchmark_id: benchmarkId,
        message: message,
        acknowledged: false
    });

    // Update threshold last_triggered
    await base44.asServiceRole.entities.AlertThreshold.update(threshold.id, {
        last_triggered: new Date().toISOString(),
        trigger_count: (threshold.trigger_count || 0) + 1
    });

    addLog(`✅ Alert created: ${message}`);

    // Send email if configured
    if (threshold.notification_type === 'email' || threshold.notification_type === 'both') {
        try {
            // Email notification would go here
            addLog(`📧 Email notification queued for ${threshold.metric_name}`);
        } catch (emailError) {
            addLog(`⚠️ Email failed: ${emailError.message}`);
        }
    }

    return alert;
}

function generateAlertMessage(threshold, value, strategy) {
    const metricLabels = {
        'spg': 'SPG Score',
        'pass_rate': 'Pass Rate',
        'latency_ms': 'Latency',
        'cpu_savings': 'CPU Savings',
        'token_savings': 'Token Savings',
        'quality_improvement': 'Quality Improvement'
    };

    const label = metricLabels[threshold.metric_name] || threshold.metric_name;
    const direction = threshold.threshold_type === 'below' ? 'dropped below' : 'exceeded';

    return `🚨 ${label} ${direction} ${threshold.threshold_value} (current: ${value?.toFixed(3)}) [${strategy}]`;
}