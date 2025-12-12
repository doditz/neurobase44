import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * ANOMALY DETECTOR - Détection ML d'Anomalies Sophistiquée
 * Utilise des algorithmes statistiques et ML pour détecter les anomalies
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[AnomalyDetector] ${msg}`);
    };

    try {
        addLog('=== ANOMALY DETECTION START ===');
        
        const base44 = createClientFromRequest(req);

        const { 
            metrics_to_check = ['all'],
            lookback_days = 7,
            sensitivity = 'medium',
            create_baseline = false
        } = await req.json();

        // Sensibilité = seuil Z-score
        const zScoreThreshold = {
            low: 3.5,
            medium: 3.0,
            high: 2.5,
            very_high: 2.0
        }[sensitivity] || 3.0;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookback_days);

        const anomaliesDetected = [];
        const metricsAnalyzed = [];

        // MÉTRIQUE 1: SPG des Benchmarks
        if (metrics_to_check.includes('all') || metrics_to_check.includes('spg')) {
            addLog('Analyzing SPG metric...');
            
            try {
                const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 200);
                const recentBenchmarks = benchmarks.filter(b => 
                    b.global_score_performance && new Date(b.created_date) > cutoffDate
                );

                if (recentBenchmarks.length >= 10) {
                    const values = recentBenchmarks.map(b => b.global_score_performance);
                    const stats = calculateStatistics(values);
                    
                    // Créer/Mettre à jour baseline
                    if (create_baseline) {
                        await updateOrCreateBaseline(base44, 'spg', 'quality', cutoffDate, new Date(), values, stats);
                    }

                    // Détecter anomalies sur les 5 derniers
                    const recent5 = recentBenchmarks.slice(0, 5);
                    for (const benchmark of recent5) {
                        const zScore = (benchmark.global_score_performance - stats.mean) / stats.std;
                        
                        if (Math.abs(zScore) > zScoreThreshold) {
                            const anomaly = {
                                metric_name: 'spg',
                                metric_category: 'quality',
                                detected_at: benchmark.created_date,
                                current_value: benchmark.global_score_performance,
                                expected_value: stats.mean,
                                deviation_percentage: ((benchmark.global_score_performance - stats.mean) / stats.mean * 100),
                                z_score: zScore,
                                anomaly_score: Math.min(Math.abs(zScore) / 5, 1.0),
                                anomaly_type: zScore < 0 ? 'drop' : 'spike',
                                severity: Math.abs(zScore) > 4 ? 'critical' : 'warning',
                                detection_method: 'statistical',
                                baseline_period: `${lookback_days}d`,
                                context: {
                                    benchmark_id: benchmark.id,
                                    scenario: benchmark.scenario_name
                                }
                            };
                            
                            anomaliesDetected.push(anomaly);
                            addLog(`SPG anomaly: ${anomaly.anomaly_type} (z=${zScore.toFixed(2)})`);
                        }
                    }
                    
                    metricsAnalyzed.push({
                        metric: 'spg',
                        samples: values.length,
                        mean: stats.mean,
                        std: stats.std,
                        anomalies_found: anomaliesDetected.filter(a => a.metric_name === 'spg').length
                    });
                }
            } catch (error) {
                addLog(`Error analyzing SPG: ${error.message}`);
            }
        }

        // MÉTRIQUE 2: Token Usage
        if (metrics_to_check.includes('all') || metrics_to_check.includes('tokens')) {
            addLog('Analyzing token usage...');
            
            try {
                const usage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 200);
                const recentUsage = usage.filter(u => 
                    u.tokens_used_estimated && new Date(u.created_date) > cutoffDate
                );

                if (recentUsage.length >= 10) {
                    const values = recentUsage.map(u => u.tokens_used_estimated);
                    const stats = calculateStatistics(values);
                    
                    if (create_baseline) {
                        await updateOrCreateBaseline(base44, 'token_usage', 'resource_usage', cutoffDate, new Date(), values, stats);
                    }

                    // Détecter anomalies
                    const recent10 = recentUsage.slice(0, 10);
                    for (const record of recent10) {
                        const zScore = (record.tokens_used_estimated - stats.mean) / stats.std;
                        
                        if (Math.abs(zScore) > zScoreThreshold) {
                            const anomaly = {
                                metric_name: 'token_usage',
                                metric_category: 'resource_usage',
                                detected_at: record.created_date,
                                current_value: record.tokens_used_estimated,
                                expected_value: stats.mean,
                                deviation_percentage: ((record.tokens_used_estimated - stats.mean) / stats.mean * 100),
                                z_score: zScore,
                                anomaly_score: Math.min(Math.abs(zScore) / 5, 1.0),
                                anomaly_type: zScore > 0 ? 'spike' : 'drop',
                                severity: Math.abs(zScore) > 4 ? 'critical' : 'warning',
                                detection_method: 'statistical',
                                baseline_period: `${lookback_days}d`
                            };
                            
                            anomaliesDetected.push(anomaly);
                        }
                    }
                    
                    metricsAnalyzed.push({
                        metric: 'token_usage',
                        samples: values.length,
                        mean: stats.mean,
                        std: stats.std,
                        anomalies_found: anomaliesDetected.filter(a => a.metric_name === 'token_usage').length
                    });
                }
            } catch (error) {
                addLog(`Error analyzing tokens: ${error.message}`);
            }
        }

        // MÉTRIQUE 3: Processing Time
        if (metrics_to_check.includes('all') || metrics_to_check.includes('latency')) {
            addLog('Analyzing processing time...');
            
            try {
                const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 200);
                const recentBenchmarks = benchmarks.filter(b => 
                    b.mode_b_time_ms && new Date(b.created_date) > cutoffDate
                );

                if (recentBenchmarks.length >= 10) {
                    const values = recentBenchmarks.map(b => b.mode_b_time_ms);
                    const stats = calculateStatistics(values);
                    
                    if (create_baseline) {
                        await updateOrCreateBaseline(base44, 'processing_time', 'latency', cutoffDate, new Date(), values, stats);
                    }

                    const recent10 = recentBenchmarks.slice(0, 10);
                    for (const benchmark of recent10) {
                        const zScore = (benchmark.mode_b_time_ms - stats.mean) / stats.std;
                        
                        if (Math.abs(zScore) > zScoreThreshold) {
                            const anomaly = {
                                metric_name: 'processing_time',
                                metric_category: 'latency',
                                detected_at: benchmark.created_date,
                                current_value: benchmark.mode_b_time_ms,
                                expected_value: stats.mean,
                                deviation_percentage: ((benchmark.mode_b_time_ms - stats.mean) / stats.mean * 100),
                                z_score: zScore,
                                anomaly_score: Math.min(Math.abs(zScore) / 5, 1.0),
                                anomaly_type: zScore > 0 ? 'spike' : 'drop',
                                severity: Math.abs(zScore) > 4 ? 'critical' : 'warning',
                                detection_method: 'statistical',
                                baseline_period: `${lookback_days}d`
                            };
                            
                            anomaliesDetected.push(anomaly);
                        }
                    }
                    
                    metricsAnalyzed.push({
                        metric: 'processing_time',
                        samples: values.length,
                        mean: stats.mean,
                        std: stats.std,
                        anomalies_found: anomaliesDetected.filter(a => a.metric_name === 'processing_time').length
                    });
                }
            } catch (error) {
                addLog(`Error analyzing latency: ${error.message}`);
            }
        }

        // SAUVEGARDER LES ANOMALIES DÉTECTÉES
        const savedAnomalies = [];
        for (const anomaly of anomaliesDetected) {
            try {
                const saved = await base44.asServiceRole.entities.AnomalyDetection.create(anomaly);
                savedAnomalies.push(saved.id);
            } catch (error) {
                addLog(`Failed to save anomaly: ${error.message}`);
            }
        }

        addLog(`Detection complete. Found ${anomaliesDetected.length} anomalies across ${metricsAnalyzed.length} metrics`);

        // CORRELATION ANALYSIS entre anomalies
        const correlations = detectCorrelations(anomaliesDetected);

        return Response.json({
            success: true,
            anomalies_detected: anomaliesDetected.length,
            critical_anomalies: anomaliesDetected.filter(a => a.severity === 'critical').length,
            metrics_analyzed: metricsAnalyzed,
            anomalies: anomaliesDetected,
            saved_anomaly_ids: savedAnomalies,
            correlations,
            baseline_updated: create_baseline,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[AnomalyDetector] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});

// HELPER FUNCTIONS

function calculateStatistics(values) {
    const n = values.length;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(n / 2)];
    const p95 = sorted[Math.floor(n * 0.95)];
    const p99 = sorted[Math.floor(n * 0.99)];
    
    return {
        n,
        mean,
        median,
        std,
        min: Math.min(...values),
        max: Math.max(...values),
        p95,
        p99
    };
}

async function updateOrCreateBaseline(base44, metricName, category, startDate, endDate, values, stats) {
    try {
        const existing = await base44.asServiceRole.entities.PerformanceBaseline.filter({
            metric_name: metricName,
            is_active: true
        });

        const baselineData = {
            metric_name: metricName,
            metric_category: category,
            baseline_period_start: startDate.toISOString(),
            baseline_period_end: endDate.toISOString(),
            sample_count: stats.n,
            mean_value: stats.mean,
            median_value: stats.median,
            std_deviation: stats.std,
            min_value: stats.min,
            max_value: stats.max,
            percentile_95: stats.p95,
            percentile_99: stats.p99,
            threshold_upper: stats.mean + (3 * stats.std),
            threshold_lower: Math.max(0, stats.mean - (3 * stats.std)),
            confidence_interval_95: {
                lower: stats.mean - (1.96 * stats.std),
                upper: stats.mean + (1.96 * stats.std)
            },
            is_active: true,
            model_version: 'v1.0',
            last_updated: new Date().toISOString()
        };

        if (existing.length > 0) {
            await base44.asServiceRole.entities.PerformanceBaseline.update(existing[0].id, baselineData);
        } else {
            await base44.asServiceRole.entities.PerformanceBaseline.create(baselineData);
        }
    } catch (error) {
        console.error('Failed to update baseline:', error);
    }
}

function detectCorrelations(anomalies) {
    const correlations = [];
    
    // Grouper par timestamp proche (< 5 min)
    for (let i = 0; i < anomalies.length; i++) {
        for (let j = i + 1; j < anomalies.length; j++) {
            const time1 = new Date(anomalies[i].detected_at).getTime();
            const time2 = new Date(anomalies[j].detected_at).getTime();
            const timeDiff = Math.abs(time1 - time2);
            
            if (timeDiff < 5 * 60 * 1000) { // 5 minutes
                correlations.push({
                    anomaly1: anomalies[i].metric_name,
                    anomaly2: anomalies[j].metric_name,
                    time_diff_ms: timeDiff,
                    correlation_score: 1.0 - (timeDiff / (5 * 60 * 1000))
                });
            }
        }
    }
    
    return correlations;
}