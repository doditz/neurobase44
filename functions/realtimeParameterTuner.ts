import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REALTIME PARAMETER TUNER v1.0
 * Monitors live performance and applies micro-adjustments
 * without requiring full optimization runs
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg) => {
        log.push(`[${Date.now()}] ${msg}`);
        console.log(`[RealtimeTuner] ${msg}`);
    };

    try {
        addLog('=== REALTIME PARAMETER TUNER v1.0 ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            action = 'analyze',
            apply_suggestions = false,
            lookback_count = 10,
            sensitivity = 'medium'
        } = await req.json();

        addLog(`Action: ${action}, Sensitivity: ${sensitivity}`);

        // Sensitivity thresholds
        const SENSITIVITY_CONFIG = {
            low: { spg_drop: 0.15, latency_spike: 1.5, adjustment_scale: 0.5 },
            medium: { spg_drop: 0.10, latency_spike: 1.3, adjustment_scale: 1.0 },
            high: { spg_drop: 0.05, latency_spike: 1.15, adjustment_scale: 1.5 }
        };
        const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.medium;

        // Load recent benchmarks
        const recentBenchmarks = await base44.entities.BenchmarkResult.list('-created_date', lookback_count);
        
        if (recentBenchmarks.length < 3) {
            return Response.json({
                success: true,
                status: 'insufficient_data',
                message: 'Need at least 3 benchmarks for analysis',
                suggestions: [],
                log
            });
        }

        addLog(`Analyzing ${recentBenchmarks.length} recent benchmarks`);

        // Calculate rolling metrics
        const metrics = recentBenchmarks.map((b, idx) => ({
            index: idx,
            spg: b.global_score_performance || 0,
            latency: b.mode_b_time_ms || 0,
            tokens: b.mode_b_token_count || 0,
            quality: b.quality_scores?.mode_b_ars_score || 0,
            winner: b.winner,
            created: new Date(b.created_date).getTime()
        }));

        // Calculate baselines (older half)
        const midpoint = Math.floor(metrics.length / 2);
        const olderMetrics = metrics.slice(midpoint);
        const recentMetrics = metrics.slice(0, midpoint);

        const baseline = {
            spg: olderMetrics.reduce((s, m) => s + m.spg, 0) / olderMetrics.length,
            latency: olderMetrics.reduce((s, m) => s + m.latency, 0) / olderMetrics.length,
            tokens: olderMetrics.reduce((s, m) => s + m.tokens, 0) / olderMetrics.length,
            quality: olderMetrics.reduce((s, m) => s + m.quality, 0) / olderMetrics.length
        };

        const current = {
            spg: recentMetrics.reduce((s, m) => s + m.spg, 0) / recentMetrics.length,
            latency: recentMetrics.reduce((s, m) => s + m.latency, 0) / recentMetrics.length,
            tokens: recentMetrics.reduce((s, m) => s + m.tokens, 0) / recentMetrics.length,
            quality: recentMetrics.reduce((s, m) => s + m.quality, 0) / recentMetrics.length
        };

        addLog(`Baseline SPG: ${baseline.spg.toFixed(3)}, Current SPG: ${current.spg.toFixed(3)}`);
        addLog(`Baseline Latency: ${baseline.latency.toFixed(0)}ms, Current: ${current.latency.toFixed(0)}ms`);

        // Detect anomalies and generate suggestions
        const suggestions = [];
        const anomalies = [];

        // SPG Drop Detection
        const spgDelta = (baseline.spg - current.spg) / baseline.spg;
        if (spgDelta > config.spg_drop) {
            anomalies.push({
                type: 'spg_drop',
                severity: spgDelta > config.spg_drop * 2 ? 'critical' : 'warning',
                baseline: baseline.spg,
                current: current.spg,
                delta_percent: -spgDelta * 100
            });

            suggestions.push({
                parameter: 'debateRounds',
                action: 'increase',
                reason: `SPG dropped ${(spgDelta * 100).toFixed(1)}% - increase debate depth`,
                adjustment: Math.round(1 * config.adjustment_scale),
                priority: 'high'
            });

            if (current.quality < 0.7) {
                suggestions.push({
                    parameter: 'maxPersonas',
                    action: 'increase',
                    reason: 'Quality degradation detected - add more perspectives',
                    adjustment: Math.round(1 * config.adjustment_scale),
                    priority: 'medium'
                });
            }
        }

        // Latency Spike Detection
        const latencyRatio = current.latency / baseline.latency;
        if (latencyRatio > config.latency_spike) {
            anomalies.push({
                type: 'latency_spike',
                severity: latencyRatio > config.latency_spike * 1.5 ? 'critical' : 'warning',
                baseline: baseline.latency,
                current: current.latency,
                ratio: latencyRatio
            });

            suggestions.push({
                parameter: 'maxPersonas',
                action: 'decrease',
                reason: `Latency increased ${((latencyRatio - 1) * 100).toFixed(0)}% - reduce persona count`,
                adjustment: -Math.round(1 * config.adjustment_scale),
                priority: 'high'
            });

            suggestions.push({
                parameter: 'semanticCompressionRatio',
                action: 'increase',
                reason: 'Apply more compression to reduce latency',
                adjustment: 0.1 * config.adjustment_scale,
                priority: 'medium'
            });
        }

        // Token Efficiency Check
        const tokenRatio = current.tokens / baseline.tokens;
        if (tokenRatio > 1.2) {
            anomalies.push({
                type: 'token_inflation',
                severity: 'warning',
                baseline: baseline.tokens,
                current: current.tokens,
                ratio: tokenRatio
            });

            suggestions.push({
                parameter: 'debateRounds',
                action: 'decrease',
                reason: `Token usage up ${((tokenRatio - 1) * 100).toFixed(0)}% - reduce rounds`,
                adjustment: -Math.round(1 * config.adjustment_scale),
                priority: 'medium'
            });
        }

        // Temperature fine-tuning based on quality variance
        const qualityVariance = recentMetrics.reduce((v, m) => v + Math.pow(m.quality - current.quality, 2), 0) / recentMetrics.length;
        if (qualityVariance > 0.04) {
            suggestions.push({
                parameter: 'temperature',
                action: 'decrease',
                reason: 'High quality variance - reduce randomness for stability',
                adjustment: -0.05 * config.adjustment_scale,
                priority: 'low'
            });
        }

        // Positive trend - suggest exploration
        if (spgDelta < -0.03 && latencyRatio < 1.1) {
            suggestions.push({
                parameter: 'explorationRate',
                action: 'increase',
                reason: 'Performance improving - increase exploration for better optima',
                adjustment: 0.02 * config.adjustment_scale,
                priority: 'low'
            });
        }

        addLog(`Detected ${anomalies.length} anomalies, generated ${suggestions.length} suggestions`);

        // Apply suggestions if requested
        const appliedAdjustments = [];
        if (apply_suggestions && suggestions.length > 0) {
            const tunableParams = await base44.asServiceRole.entities.TunableParameter.filter({
                is_locked: false
            });

            for (const suggestion of suggestions.filter(s => s.priority === 'high' || s.priority === 'medium')) {
                const param = tunableParams.find(p => p.parameter_name === suggestion.parameter);
                if (param) {
                    const oldValue = param.current_value;
                    let newValue = oldValue + suggestion.adjustment;
                    
                    // Clamp to bounds
                    newValue = Math.max(param.min_bound, Math.min(param.max_bound, newValue));
                    
                    // Handle discrete values
                    if (!param.is_continuous && param.discrete_values?.length) {
                        newValue = param.discrete_values.reduce((prev, curr) =>
                            Math.abs(curr - newValue) < Math.abs(prev - newValue) ? curr : prev
                        );
                    }

                    if (newValue !== oldValue) {
                        await base44.asServiceRole.entities.TunableParameter.update(param.id, {
                            current_value: newValue,
                            last_adjusted: new Date().toISOString()
                        });

                        appliedAdjustments.push({
                            parameter: suggestion.parameter,
                            old_value: oldValue,
                            new_value: newValue,
                            reason: suggestion.reason,
                            timestamp: new Date().toISOString()
                        });

                        addLog(`APPLIED: ${suggestion.parameter} ${oldValue.toFixed(2)} → ${newValue.toFixed(2)}`);
                    }
                }
            }

            // Log adjustment history
            if (appliedAdjustments.length > 0) {
                try {
                    await base44.asServiceRole.entities.AlertHistory.create({
                        metric_name: 'realtime_tuning',
                        metric_value: appliedAdjustments.length,
                        threshold_value: 0,
                        severity: 'info',
                        message: `Applied ${appliedAdjustments.length} parameter adjustments: ${appliedAdjustments.map(a => a.parameter).join(', ')}`,
                        acknowledged: false
                    });
                } catch (e) {
                    addLog(`Warning: Could not log adjustment history: ${e.message}`);
                }
            }
        }

        // Build trend data for visualization
        const trendData = metrics.map((m, idx) => ({
            index: metrics.length - idx,
            spg: m.spg,
            latency: m.latency / 1000, // Convert to seconds for display
            tokens: m.tokens,
            quality: m.quality
        })).reverse();

        return Response.json({
            success: true,
            status: anomalies.length > 0 ? 'adjustments_needed' : 'optimal',
            analysis: {
                baseline,
                current,
                deltas: {
                    spg_percent: -spgDelta * 100,
                    latency_percent: (latencyRatio - 1) * 100,
                    tokens_percent: (tokenRatio - 1) * 100
                }
            },
            anomalies,
            suggestions,
            applied_adjustments: appliedAdjustments,
            trend_data: trendData,
            config_used: config,
            log
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[RealtimeTuner] Fatal:', error);

        return Response.json({
            success: false,
            error: error.message,
            log
        }, { status: 500 });
    }
});