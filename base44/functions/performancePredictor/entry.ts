
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PERFORMANCE PREDICTOR - Prédiction ML des Problèmes Futurs
 * Utilise des modèles de prédiction pour anticiper les problèmes
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[Predictor] ${msg}`);
    };

    try {
        addLog('=== PERFORMANCE PREDICTION START ===');
        
        const base44 = createClientFromRequest(req);

        const { 
            prediction_horizon_hours = 24,
            confidence_threshold = 0.7,
            use_ensemble = true,
            enable_proactive_alerts = true,
            trigger_auto_optimization = false
        } = await req.json();

        const predictions = [];
        const warnings = [];
        const alertsTriggered = [];

        // 1. UTILISER ENSEMBLE PREDICTION pour SPG et Token Usage
        if (use_ensemble) {
            addLog('Running ensemble prediction for SPG...');
            try {
                const { data: ensembleData } = await base44.functions.invoke('ensemblePredictionEngine', {
                    metric_name: 'spg',
                    lookback_window: 100,
                    prediction_horizon: Math.ceil(prediction_horizon_hours / 24),
                    ensemble_methods: ['statistical', 'exponential_smoothing', 'pattern_matching', 'autoregressive']
                });

                if (ensembleData && ensembleData.success) {
                    const ensemble = ensembleData.ensemble_results;
                    const risk = ensembleData.risk_assessment;

                    // SEUILS CRITIQUES DYNAMIQUES
                    const CRITICAL_SPG_THRESHOLD = 0.85;
                    const WARNING_SPG_THRESHOLD = 0.90;
                    const IMMEDIATE_ACTION_WINDOW_HOURS = 6;

                    const predictedValue = ensemble.ensemble_prediction.value;
                    const willBreachCritical = predictedValue < CRITICAL_SPG_THRESHOLD;
                    const willBreachWarning = predictedValue < WARNING_SPG_THRESHOLD;

                    if (willBreachCritical || willBreachWarning) {
                        const estimatedHours = risk.percentage_change !== 0 && risk.trend_direction === 'decreasing'
                            ? Math.abs((CRITICAL_SPG_THRESHOLD - risk.current_value) / (risk.percentage_change / 100 * (24 / prediction_horizon_hours))) // Adjusted for prediction horizon and daily change
                            : prediction_horizon_hours;

                        const predictedSeverity = willBreachCritical ? 'high' : 'medium';
                        const isImmediate = estimatedHours < IMMEDIATE_ACTION_WINDOW_HOURS;

                        predictions.push({
                            metric: 'spg',
                            prediction_type: 'ensemble_forecast',
                            severity: isImmediate ? 'high' : predictedSeverity,
                            confidence: ensemble.ensemble_prediction.confidence,
                            current_value: risk.current_value,
                            predicted_value: predictedValue,
                            confidence_interval: ensemble.ensemble_prediction.confidence_interval_95,
                            percentage_change: risk.percentage_change,
                            estimated_time_to_breach: estimatedHours,
                            threshold: willBreachCritical ? CRITICAL_SPG_THRESHOLD : WARNING_SPG_THRESHOLD,
                            message: `🚨 SPG predicted to ${willBreachCritical ? 'drop below CRITICAL 0.85' : 'approach warning 0.90'} in ~${Math.round(estimatedHours)}h`,
                            recommended_actions: [
                                isImmediate ? '🚨 IMMEDIATE: Enable auto-optimization NOW' : 'Enable auto-optimization',
                                'Increase max_personas parameter to 7-8',
                                'Review recent configuration changes',
                                'Check for stuck batch runs',
                                ...(ensembleData.recommendation || [])
                            ],
                            ensemble_methods_used: ensemble.individual_predictions.map(p => p.method),
                            method_weights: ensemble.method_weights,
                            correlation_with_anomalies: ensemble.correlation_analysis?.correlation_strength || 0,
                            requires_immediate_action: isImmediate
                        });

                        // DÉCLENCHER ALERTE PROACTIVE
                        if (enable_proactive_alerts && (isImmediate || willBreachCritical)) {
                            addLog(`🚨 TRIGGERING PROACTIVE ALERT: SPG breach predicted in ${Math.round(estimatedHours)}h`);
                            
                            try {
                                await base44.functions.invoke('alertingService', {
                                    alert_type: 'prediction_based_alert',
                                    severity: isImmediate ? 'critical' : 'high',
                                    message: `SPG predicted to drop below ${willBreachCritical ? '0.85 (CRITICAL)' : '0.90 (WARNING)'} in ${Math.round(estimatedHours)} hours`,
                                    prediction_data: {
                                        current_value: risk.current_value,
                                        predicted_value: predictedValue,
                                        percentage_change: risk.percentage_change,
                                        confidence: ensemble.ensemble_prediction.confidence,
                                        threshold: willBreachCritical ? CRITICAL_SPG_THRESHOLD : WARNING_SPG_THRESHOLD
                                    },
                                    ensemble_data: {
                                        methods_used: ensemble.individual_predictions.map(p => p.method),
                                        risk_level: risk.risk_level,
                                        adjusted_confidence: ensemble.correlation_analysis?.anomaly_adjusted_confidence,
                                        correlation_strength: ensemble.correlation_analysis?.correlation_strength
                                    },
                                    recommended_actions: predictions[predictions.length - 1].recommended_actions,
                                    estimated_time_to_breach: estimatedHours
                                });
                                
                                alertsTriggered.push('spg_prediction_alert');
                                addLog('✅ Proactive alert sent successfully');
                            } catch (alertError) {
                                addLog(`❌ Failed to send proactive alert: ${alertError.message}`);
                            }
                        }

                        // DÉCLENCHER AUTO-OPTIMIZATION PRÉVENTIVE (si activé)
                        if (trigger_auto_optimization && isImmediate && willBreachCritical) {
                            addLog('🔧 TRIGGERING PRE-EMPTIVE AUTO-OPTIMIZATION');
                            
                            try {
                                const { data: optData } = await base44.functions.invoke('applyOptimizationStrategy', {
                                    strategy_name: 'EMERGENCY_QUALITY_BOOST',
                                    reason: 'Predicted SPG drop below 0.85',
                                    auto_apply: true
                                });
                                
                                if (optData && optData.success) {
                                    addLog('✅ Pre-emptive optimization applied');
                                    predictions[predictions.length - 1].auto_optimization_triggered = true;
                                }
                            } catch (optError) {
                                addLog(`❌ Auto-optimization failed: ${optError.message}`);
                            }
                        }

                        addLog(`Ensemble SPG prediction: ${predictedValue.toFixed(3)} (confidence: ${ensemble.ensemble_prediction.confidence.toFixed(3)})`);
                    }
                }
            } catch (error) {
                addLog(`Ensemble SPG prediction failed: ${error.message}`);
            }

            // Token usage ensemble prediction
            addLog('Running ensemble prediction for token usage...');
            try {
                const { data: ensembleData } = await base44.functions.invoke('ensemblePredictionEngine', {
                    metric_name: 'token_usage',
                    lookback_window: 100,
                    prediction_horizon: Math.ceil(prediction_horizon_hours / 24),
                    ensemble_methods: ['statistical', 'exponential_smoothing', 'pattern_matching']
                });

                if (ensembleData && ensembleData.success) {
                    const risk = ensembleData.risk_assessment;
                    const ensemble = ensembleData.ensemble_results;
                    
                    // Vérifier si dépassement de baseline
                    const baseline = await base44.asServiceRole.entities.PerformanceBaseline.filter({
                        metric_name: 'token_usage',
                        is_active: true
                    });

                    if (baseline.length > 0 && risk.predicted_value > baseline[0].threshold_upper) {
                        // A more robust estimation for time to breach would need to consider the actual rate of increase
                        // For now, using a simplified estimation if predicted value already exceeds threshold
                        const estimatedHours = risk.current_value < baseline[0].threshold_upper
                            ? Math.abs((baseline[0].threshold_upper - risk.current_value) / (risk.percentage_change / 100 * (24 / prediction_horizon_hours)))
                            : 0; // Already breached or will breach immediately

                        predictions.push({
                            metric: 'token_usage',
                            prediction_type: 'ensemble_forecast',
                            severity: 'medium',
                            confidence: ensemble.ensemble_prediction.confidence,
                            current_value: risk.current_value,
                            predicted_value: risk.predicted_value,
                            estimated_time_to_breach: estimatedHours,
                            threshold: baseline[0].threshold_upper,
                            message: `Token usage forecast: ${risk.trend_direction} by ${Math.abs(risk.percentage_change).toFixed(1)}% (will exceed baseline)`,
                            recommended_actions: [
                                'Enable semantic compression',
                                'Review recent high-token operations',
                                'Consider implementing rate limiting',
                                ...(ensembleData.recommendation || [])
                            ]
                        });

                        // Alerte si ressource critique
                        if (enable_proactive_alerts && risk.risk_level === 'high') {
                            try {
                                await base44.functions.invoke('alertingService', {
                                    alert_type: 'ensemble_prediction_alert',
                                    severity: 'medium',
                                    message: `Token usage predicted to exceed normal range in ${Math.round(estimatedHours)}h`,
                                    prediction_data: {
                                        current_value: risk.current_value,
                                        predicted_value: risk.predicted_value,
                                        percentage_change: risk.percentage_change,
                                        confidence: ensemble.ensemble_prediction.confidence,
                                        threshold: baseline[0].threshold_upper
                                    },
                                    recommended_actions: predictions[predictions.length - 1].recommended_actions
                                });
                                alertsTriggered.push('token_usage_prediction_alert');
                                addLog('✅ Token usage alert sent successfully');
                            } catch (alertError) {
                                addLog(`❌ Failed to send token usage alert: ${alertError.message}`);
                            }
                        }
                    }
                }
            } catch (error) {
                addLog(`Token ensemble prediction failed: ${error.message}`);
            }
        }

        // 2. ANALYSER LES TENDANCES SPG (fallback classique)
        addLog('Analyzing SPG trends (classical method)...');
        try {
            const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 100);
            
            if (benchmarks.length >= 20) {
                const spgValues = benchmarks.slice(0, 20).map(b => b.global_score_performance || 0);
                const trend = calculateTrend(spgValues);
                
                if (trend.slope < -0.01 && trend.r_squared > 0.5) { // Trending down significantly and with good confidence
                    const hoursToThreshold = Math.abs((0.85 - spgValues[0]) / (trend.slope / 24)); // Estimate hours to reach 0.85
                    
                    if (hoursToThreshold < prediction_horizon_hours) {
                        predictions.push({
                            metric: 'spg',
                            prediction_type: 'threshold_breach',
                            severity: 'high',
                            confidence: trend.r_squared,
                            estimated_time_to_breach: hoursToThreshold,
                            current_value: spgValues[0],
                            predicted_value: spgValues[0] + (trend.slope * hoursToThreshold),
                            threshold: 0.85,
                            message: `SPG predicted to drop below 0.85 in ${Math.round(hoursToThreshold)} hours`,
                            recommended_actions: [
                                'Enable auto-optimization immediately',
                                'Increase max_personas parameter',
                                'Review recent configuration changes'
                            ]
                        });
                        
                        warnings.push({
                            type: 'quality_degradation',
                            urgency: hoursToThreshold < 6 ? 'immediate' : 'high',
                            message: `Quality degradation predicted in ${Math.round(hoursToThreshold)}h`
                        });
                    }
                }
                
                addLog(`SPG classical trend: slope=${trend.slope.toFixed(4)}, r²=${trend.r_squared.toFixed(3)}`);
            }
        } catch (error) {
            addLog(`Error analyzing SPG: ${error.message}`);
        }

        // 3. ANALYSER LES PATTERNS DE RESSOURCES
        addLog('Analyzing resource usage patterns...');
        try {
            const usage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 100);
            
            if (usage.length >= 20) {
                const tokenValues = usage.slice(0, 20).map(u => u.tokens_used_estimated || 0);
                const trend = calculateTrend(tokenValues);
                
                if (trend.slope > 100) { // Trending up significantly
                    const baseline = await base44.asServiceRole.entities.PerformanceBaseline.filter({
                        metric_name: 'token_usage',
                        is_active: true
                    });
                    
                    if (baseline.length > 0) {
                        const currentRate = tokenValues[0];
                        const upperThreshold = baseline[0].threshold_upper;
                        
                        // Predict if threshold will be breached within the prediction horizon
                        if (currentRate + (trend.slope * prediction_horizon_hours) > upperThreshold) {
                            // Estimate time to breach: (upperThreshold - currentRate) / (slope / hours_per_unit_in_slope)
                            // Assuming slope is per data point, and data points are not strictly hourly.
                            // For simplicity, using a fixed estimated_time_to_breach of 12 hours.
                            // A more robust solution would require knowing the time interval between data points.
                            predictions.push({
                                metric: 'token_usage',
                                prediction_type: 'resource_exhaustion',
                                severity: 'medium',
                                confidence: trend.r_squared,
                                estimated_time_to_breach: 12, // Placeholder, needs actual calculation if time intervals are known
                                current_value: currentRate,
                                predicted_value: currentRate + (trend.slope * 12), // Prediction for 12 hours from now
                                threshold: upperThreshold,
                                message: 'Token usage predicted to exceed normal range',
                                recommended_actions: [
                                    'Review recent high-token operations',
                                    'Enable semantic compression',
                                    'Consider implementing rate limiting'
                                ]
                            });
                        }
                    }
                }
            }
        } catch (error) {
            addLog(`Error analyzing resources: ${error.message}`);
        }

        // 4. DÉTECTER LES PATTERNS CYCLIQUES ANORMAUX
        addLog('Detecting cyclic patterns...');
        try {
            const anomalies = await base44.asServiceRole.entities.AnomalyDetection.list('-detected_at', 50);
            const recentAnomalies = anomalies.filter(a => {
                const hoursSince = (Date.now() - new Date(a.detected_at).getTime()) / (60 * 60 * 1000);
                return hoursSince < 168; // Last week (7 days * 24 hours)
            });

            // Grouper par heure de la journée
            const anomalyByHour = new Array(24).fill(0);
            recentAnomalies.forEach(a => {
                const hour = new Date(a.detected_at).getHours();
                anomalyByHour[hour]++;
            });

            const maxAnomaliesInHour = Math.max(...anomalyByHour);
            if (maxAnomaliesInHour >= 3) { // If there are at least 3 anomalies in a single hour slot in the past week
                const peakHour = anomalyByHour.indexOf(maxAnomaliesInHour);
                const currentHour = new Date().getHours();
                const hoursToPeak = (peakHour - currentHour + 24) % 24; // Time until the next occurrence of the peak hour
                
                if (hoursToPeak < prediction_horizon_hours) {
                    predictions.push({
                        metric: 'system_stability',
                        prediction_type: 'cyclic_pattern',
                        severity: 'medium',
                        confidence: 0.8, // Fixed confidence for this pattern detection
                        estimated_time_to_event: hoursToPeak,
                        message: `Anomaly spike likely at ${peakHour}:00 based on weekly pattern`,
                        recommended_actions: [
                            'Pre-emptively scale resources',
                            'Schedule maintenance outside peak hours',
                            'Monitor closely during predicted window'
                        ]
                    });
                }
            }
        } catch (error) {
            addLog(`Anomaly entity not available or error: ${error.message}`);
        }

        // 5. ANALYSER LES BATCH RUNS POUR PRÉDIRE LES BLOCAGES
        addLog('Analyzing batch run patterns...');
        try {
            const batches = await base44.asServiceRole.entities.BatchRunProgress.list('-start_time', 30);
            const completedBatches = batches.filter(b => b.status === 'completed' && b.end_time);
            
            if (completedBatches.length >= 5) {
                const durations = completedBatches.map(b => {
                    const start = new Date(b.start_time).getTime();
                    const end = new Date(b.end_time).getTime();
                    return (end - start) / 60000; // duration in minutes
                });
                
                const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
                
                // Check for increasing duration trend in recent batches
                // Using a simple average comparison for the last 3 batches against overall average
                if (durations.length >= 3) {
                    const recentAvg = durations.slice(0, 3).reduce((s, d) => s + d, 0) / 3;
                    if (recentAvg > avgDuration * 1.5) { // If recent average is 50% higher than overall average
                        predictions.push({
                            metric: 'batch_processing',
                            prediction_type: 'performance_degradation',
                            severity: 'medium',
                            confidence: 0.75, // Fixed confidence
                            message: 'Batch processing time increasing significantly',
                            current_value: recentAvg,
                            baseline_value: avgDuration,
                            recommended_actions: [
                                'Check for stuck processes',
                                'Review batch size configuration',
                                'Consider parallel processing'
                            ]
                        });
                    }
                }
            }
        } catch (error) {
            addLog(`Error analyzing batches: ${error.message}`);
        }

        // 6. UTILISER L'IA POUR UNE ANALYSE PRÉDICTIVE AVANCÉE
        // Only run AI analysis if there are some predictions to analyze
        if (predictions.length > 0) {
            addLog('Performing AI-powered predictive analysis...');
            
            try {
                const analysisPrompt = `You are a predictive analytics expert for a complex AI system.

CURRENT PREDICTIONS:
${JSON.stringify(predictions.slice(0, 5), null, 2)}

WARNINGS GENERATED:
${JSON.stringify(warnings, null, 2)}

Based on these predictions, provide:
1. Overall system health forecast for the next ${prediction_horizon_hours} hours
2. Most critical risk to address immediately
3. Recommended preventive actions (prioritized)
4. Estimated impact if no action is taken

Respond in JSON format.`;

                const aiAnalysis = await base44.integrations.Core.InvokeLLM({
                    prompt: analysisPrompt,
                    response_json_schema: {
                        type: 'object',
                        properties: {
                            forecast: { type: 'string' },
                            critical_risk: { type: 'string' },
                            preventive_actions: {
                                type: 'array',
                                items: { type: 'string' }
                            },
                            estimated_impact: { type: 'string' }
                        },
                        required: ['forecast', 'critical_risk', 'preventive_actions', 'estimated_impact']
                    }
                });

                addLog(`AI forecast: ${aiAnalysis.forecast}`);
                
                predictions.push({
                    metric: 'overall_system',
                    prediction_type: 'ai_forecast',
                    severity: 'info', // AI forecast is typically 'info' unless it highlights a specific high-severity issue
                    confidence: 0.8, // Fixed confidence for AI analysis
                    message: aiAnalysis.forecast,
                    critical_risk: aiAnalysis.critical_risk,
                    recommended_actions: aiAnalysis.preventive_actions,
                    estimated_impact: aiAnalysis.estimated_impact
                });
            } catch (error) {
                addLog(`AI analysis failed: ${error.message}`);
            }
        }

        addLog(`Prediction complete. ${predictions.length} predictions, ${alertsTriggered.length} proactive alerts sent`);

        return Response.json({
            success: true,
            prediction_horizon_hours,
            predictions_count: predictions.length,
            high_severity_count: predictions.filter(p => p.severity === 'high').length,
            immediate_action_required: predictions.filter(p => p.requires_immediate_action).length,
            predictions,
            warnings,
            proactive_alerts_triggered: alertsTriggered,
            summary: {
                overall_risk_level: predictions.some(p => p.severity === 'high') ? 'high' : 
                                    predictions.some(p => p.severity === 'medium') ? 'medium' : 'low',
                immediate_actions_required: predictions.filter(p => 
                    p.estimated_time_to_breach && p.estimated_time_to_breach < 6
                ).length,
                ensemble_predictions_used: predictions.filter(p => 
                    p.prediction_type === 'ensemble_forecast'
                ).length,
                auto_optimization_triggered: predictions.some(p => p.auto_optimization_triggered)
            },
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[Predictor] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

// HELPER: Linear regression pour trend analysis
function calculateTrend(values) {
    const n = values.length;
    // x represents the index of the data point, treating them as equally spaced in time
    const x = Array.from({ length: n }, (_, i) => i); 
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) {
        // Handle cases where all x values are the same (e.g., n=1 or all points are at index 0, which shouldn't happen with Array.from)
        // Or if there's no variance in x, resulting in vertical line, slope is undefined.
        // Return 0 slope and R^2, indicating no meaningful linear trend.
        return { slope: 0, intercept: values[0] || 0, r_squared: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R² (coefficient of determination)
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    
    // If ssTotal is 0, all y values are the same. R^2 should be 1 if slope also 0.
    if (ssTotal === 0) {
        return { slope, intercept, r_squared: 1 };
    }

    const ssResidual = y.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept;
        return sum + Math.pow(yi - predicted, 2);
    }, 0);
    
    const r_squared = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, r_squared };
}
