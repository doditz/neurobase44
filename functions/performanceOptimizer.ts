import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PERFORMANCE OPTIMIZER - Analyse et Recommandations d'Optimisation
 * Analyse les patterns de performance et génère des recommandations automatiques
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        const entry = `[${Date.now()}] ${msg}`;
        logs.push(entry);
        console.log(`[PerfOptimizer] ${entry}`);
    };

    try {
        addLog('=== PERFORMANCE OPTIMIZER START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            analysis_window_days = 7,
            min_samples = 10 
        } = await req.json();

        const report = {
            timestamp: new Date().toISOString(),
            analysis_period_days: analysis_window_days,
            recommendations: [],
            bottlenecks: [],
            optimization_opportunities: [],
            metrics: {}
        };

        // 1. ANALYZE BENCHMARK PERFORMANCE
        addLog('Analyzing benchmark performance...');
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - analysis_window_days);
            
            const benchmarks = await base44.asServiceRole.entities.BenchmarkResult.list('-created_date', 500);
            const recentBenchmarks = benchmarks.filter(b => 
                new Date(b.created_date) > cutoffDate
            );

            if (recentBenchmarks.length < min_samples) {
                addLog(`WARNING: Only ${recentBenchmarks.length} samples, need ${min_samples}`);
                report.recommendations.push({
                    category: 'data_collection',
                    priority: 'medium',
                    message: `Insufficient data for analysis (${recentBenchmarks.length}/${min_samples} samples)`,
                    action: 'Run more benchmark tests to gather sufficient data'
                });
            } else {
                // Calculate performance metrics
                const avgSpg = recentBenchmarks.reduce((sum, b) => 
                    sum + (b.global_score_performance || 0), 0) / recentBenchmarks.length;
                
                const avgModeATime = recentBenchmarks.reduce((sum, b) => 
                    sum + (b.mode_a_time_ms || 0), 0) / recentBenchmarks.length;
                
                const avgModeBTime = recentBenchmarks.reduce((sum, b) => 
                    sum + (b.mode_b_time_ms || 0), 0) / recentBenchmarks.length;
                
                const avgTokenReduction = recentBenchmarks.reduce((sum, b) => {
                    const tokenA = b.mode_a_token_count || 0;
                    const tokenB = b.mode_b_token_count || 0;
                    return sum + (tokenA > 0 ? ((tokenA - tokenB) / tokenA * 100) : 0);
                }, 0) / recentBenchmarks.length;

                report.metrics.performance = {
                    avg_spg: avgSpg,
                    avg_mode_a_time_ms: avgModeATime,
                    avg_mode_b_time_ms: avgModeBTime,
                    avg_token_reduction_percent: avgTokenReduction,
                    total_samples: recentBenchmarks.length
                };

                addLog(`Avg SPG: ${avgSpg.toFixed(3)}, Token reduction: ${avgTokenReduction.toFixed(1)}%`);

                // Detect bottlenecks
                if (avgModeBTime > avgModeATime * 1.5) {
                    report.bottlenecks.push({
                        type: 'time_overhead',
                        severity: 'high',
                        message: `Mode B is ${((avgModeBTime / avgModeATime - 1) * 100).toFixed(0)}% slower than Mode A`,
                        current_value: avgModeBTime,
                        baseline_value: avgModeATime,
                        recommendation: 'Consider reducing debate rounds or optimizing persona selection'
                    });
                }

                if (avgTokenReduction < 30) {
                    report.bottlenecks.push({
                        type: 'token_efficiency',
                        severity: 'medium',
                        message: `Token reduction only ${avgTokenReduction.toFixed(1)}%, target >40%`,
                        current_value: avgTokenReduction,
                        target_value: 40,
                        recommendation: 'Enable semantic compression or increase compression ratio'
                    });
                }

                if (avgSpg < 0.85) {
                    report.bottlenecks.push({
                        type: 'quality_score',
                        severity: 'high',
                        message: `Average SPG ${avgSpg.toFixed(3)} below target 0.85`,
                        current_value: avgSpg,
                        target_value: 0.85,
                        recommendation: 'Increase max personas or enable quality-focused strategies'
                    });
                }
            }
        } catch (error) {
            addLog(`ERROR analyzing benchmarks: ${error.message}`);
        }

        // 2. ANALYZE RESOURCE USAGE PATTERNS
        addLog('Analyzing resource usage patterns...');
        try {
            const resourceUsage = await base44.asServiceRole.entities.ResourceUsage.list('-created_date', 200);
            
            if (resourceUsage.length > 0) {
                const avgTokens = resourceUsage.reduce((sum, r) => 
                    sum + (r.tokens_used_estimated || 0), 0) / resourceUsage.length;
                
                const avgCost = resourceUsage.reduce((sum, r) => 
                    sum + (r.cost_estimated || 0), 0) / resourceUsage.length;

                report.metrics.resource_usage = {
                    avg_tokens_per_operation: Math.round(avgTokens),
                    avg_cost_per_operation: avgCost.toFixed(4),
                    total_operations: resourceUsage.length
                };

                // Detect high-cost operations
                const highCostThreshold = avgCost * 3;
                const highCostOps = resourceUsage.filter(r => 
                    (r.cost_estimated || 0) > highCostThreshold
                );

                if (highCostOps.length > resourceUsage.length * 0.1) {
                    report.optimization_opportunities.push({
                        category: 'cost_optimization',
                        priority: 'high',
                        message: `${highCostOps.length} operations (${(highCostOps.length / resourceUsage.length * 100).toFixed(0)}%) exceed cost threshold`,
                        potential_savings_percent: 30,
                        actions: [
                            'Enable auto-optimization mode',
                            'Review complexity settings',
                            'Consider batch processing for similar queries'
                        ]
                    });
                }

                // Check for efficiency patterns
                const ecoModeUsage = resourceUsage.filter(r => r.mode_used === 'eco').length;
                const premiumModeUsage = resourceUsage.filter(r => r.mode_used === 'premium').length;

                if (premiumModeUsage > ecoModeUsage * 2) {
                    report.optimization_opportunities.push({
                        category: 'mode_selection',
                        priority: 'medium',
                        message: 'Heavy use of premium mode detected',
                        current_distribution: {
                            eco: ecoModeUsage,
                            premium: premiumModeUsage,
                            balanced: resourceUsage.filter(r => r.mode_used === 'balanced').length
                        },
                        recommendation: 'Consider using balanced mode for routine queries to reduce costs'
                    });
                }
            }
        } catch (error) {
            addLog(`ERROR analyzing resource usage: ${error.message}`);
        }

        // 3. ANALYZE TUNABLE PARAMETERS
        addLog('Analyzing tunable parameters...');
        try {
            const params = await base44.asServiceRole.entities.TunableParameter.list();
            
            const suboptimalParams = [];
            for (const param of params) {
                // Check if parameter is at extreme bounds
                const range = param.max_bound - param.min_bound;
                const position = (param.current_value - param.min_bound) / range;
                
                if (position < 0.1 || position > 0.9) {
                    suboptimalParams.push({
                        parameter_name: param.parameter_name,
                        current_value: param.current_value,
                        position_in_range: position,
                        recommendation: position < 0.1 
                            ? 'Parameter near minimum - consider if this is intentional'
                            : 'Parameter near maximum - may need range expansion'
                    });
                }
            }

            if (suboptimalParams.length > 0) {
                report.optimization_opportunities.push({
                    category: 'parameter_tuning',
                    priority: 'low',
                    message: `${suboptimalParams.length} parameters at extreme bounds`,
                    parameters: suboptimalParams,
                    action: 'Review parameter bounds and consider adjustments'
                });
            }

            report.metrics.tunable_parameters = {
                total: params.length,
                locked: params.filter(p => p.is_locked).length,
                at_extreme_bounds: suboptimalParams.length
            };
        } catch (error) {
            addLog(`ERROR analyzing parameters: ${error.message}`);
        }

        // 4. GENERATE OPTIMIZATION RECOMMENDATIONS
        addLog('Generating optimization recommendations...');
        
        // Priority recommendations based on bottlenecks
        if (report.bottlenecks.length > 0) {
            const criticalBottlenecks = report.bottlenecks.filter(b => b.severity === 'high');
            
            if (criticalBottlenecks.length > 0) {
                report.recommendations.push({
                    category: 'critical_optimization',
                    priority: 'high',
                    message: `${criticalBottlenecks.length} critical bottleneck(s) detected`,
                    action: 'Address critical bottlenecks immediately',
                    details: criticalBottlenecks.map(b => b.recommendation)
                });
            }
        }

        // Auto-tuning recommendation
        if (report.metrics.performance && report.metrics.performance.avg_spg < 0.90) {
            report.recommendations.push({
                category: 'auto_tuning',
                priority: 'high',
                message: 'SPG below optimal range - auto-tuning recommended',
                action: 'Run auto-tuning loop to optimize parameters',
                expected_improvement: '5-15% SPG increase'
            });
        }

        // Sweet spot recommendation
        const tokenReduction = report.metrics.performance?.avg_token_reduction_percent || 0;
        const avgSpg = report.metrics.performance?.avg_spg || 0;
        
        if (tokenReduction < 40 || avgSpg < 0.85) {
            report.recommendations.push({
                category: 'sweet_spot_optimization',
                priority: 'high',
                message: 'System not in sweet spot (Quality≥0.85, Efficiency≥40%)',
                current_state: {
                    avg_spg: avgSpg,
                    token_reduction: tokenReduction
                },
                target_state: {
                    min_spg: 0.85,
                    min_token_reduction: 40
                },
                action: 'Use AutoOptimizationTest page to find sweet spot'
            });
        }

        // Calculate overall health score
        let healthScore = 100;
        if (report.bottlenecks.length > 0) {
            healthScore -= report.bottlenecks.filter(b => b.severity === 'high').length * 20;
            healthScore -= report.bottlenecks.filter(b => b.severity === 'medium').length * 10;
        }
        healthScore = Math.max(0, healthScore);

        report.overall_health_score = healthScore;
        report.health_status = healthScore >= 80 ? 'excellent' : 
                              healthScore >= 60 ? 'good' : 
                              healthScore >= 40 ? 'fair' : 'poor';

        addLog(`Analysis complete. Health score: ${healthScore}, Status: ${report.health_status}`);

        return Response.json({
            success: true,
            optimization_report: report,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[PerfOptimizer] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs
        }, { status: 500 });
    }
});