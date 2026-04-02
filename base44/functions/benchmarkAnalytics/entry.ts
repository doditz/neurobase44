import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BENCHMARK ANALYTICS ENGINE - Analyse Groupée et Détection de Patterns
 * Groupe les benchmarks selon différents critères et génère des insights
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg, level = 'INFO') => {
        const entry = `[${Date.now()}] [${level}] ${msg}`;
        logs.push(entry);
        console.log(`[BenchAnalytics] ${entry}`);
    };

    try {
        addLog('=== BENCHMARK ANALYTICS ENGINE START ===', 'SYSTEM');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            group_by = ['scenario_category', 'winner'],
            lookback_days = 30,
            min_samples_per_group = 3,
            outlier_threshold_z_score = 2.0,
            include_trend_analysis = true
        } = await req.json();

        addLog(`Config: group_by=${group_by.join(', ')}, lookback=${lookback_days}d`);

        // 1. CHARGER LES BENCHMARKS
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - lookback_days);
        
        const allBenchmarks = await base44.asServiceRole.entities.DevTestResult.list('-created_date', 500);
        const benchmarks = allBenchmarks.filter(b => 
            new Date(b.created_date) > cutoffDate &&
            b.global_score_performance !== null &&
            b.global_score_performance !== undefined
        );

        addLog(`Loaded ${benchmarks.length} benchmarks (last ${lookback_days} days)`);

        if (benchmarks.length < min_samples_per_group) {
            return Response.json({
                success: false,
                error: `Insufficient data: only ${benchmarks.length} benchmarks available (need at least ${min_samples_per_group})`
            });
        }

        const analyticsReport = {
            timestamp: new Date().toISOString(),
            period_days: lookback_days,
            total_benchmarks: benchmarks.length,
            group_by_criteria: group_by,
            groups: {},
            outliers: [],
            trends: {},
            insights: [],
            recommendations: []
        };

        // 2. GROUPEMENT PAR CRITÈRES
        addLog('Grouping benchmarks by criteria...');
        
        for (const criterion of group_by) {
            analyticsReport.groups[criterion] = {};
            
            // Grouper les benchmarks
            const grouped = {};
            
            for (const benchmark of benchmarks) {
                let key;
                
                if (criterion === 'persona_usage') {
                    // Grouper par nombre de personas utilisées
                    const personaCount = (benchmark.mode_b_personas_used || []).length;
                    key = personaCount === 0 ? '0' : 
                          personaCount <= 3 ? '1-3' : 
                          personaCount <= 5 ? '4-5' : 
                          personaCount <= 7 ? '6-7' : '8+';
                } else if (criterion === 'debate_rounds') {
                    key = String(benchmark.mode_b_debate_rounds || 3);
                } else if (criterion === 'spg_range') {
                    const spg = benchmark.global_score_performance || 0;
                    key = spg >= 0.90 ? '0.90+' :
                          spg >= 0.85 ? '0.85-0.90' :
                          spg >= 0.80 ? '0.80-0.85' :
                          spg >= 0.75 ? '0.75-0.80' : '<0.75';
                } else {
                    key = String(benchmark[criterion] || 'unknown');
                }
                
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(benchmark);
            }

            // 3. CALCULER STATS POUR CHAQUE GROUPE
            for (const [groupKey, groupBenchmarks] of Object.entries(grouped)) {
                if (groupBenchmarks.length < min_samples_per_group) {
                    addLog(`Skipping group ${criterion}:${groupKey} (only ${groupBenchmarks.length} samples)`);
                    continue;
                }

                const stats = calculateGroupStats(groupBenchmarks);
                
                analyticsReport.groups[criterion][groupKey] = {
                    sample_count: groupBenchmarks.length,
                    percentage_of_total: (groupBenchmarks.length / benchmarks.length * 100).toFixed(1),
                    ...stats
                };

                addLog(`Group ${criterion}:${groupKey} - ${groupBenchmarks.length} samples, avg SPG=${stats.avg_spg.toFixed(3)}`);
            }
        }

        // 4. DÉTECTION D'OUTLIERS
        addLog('Detecting outliers...');
        const allSpgValues = benchmarks.map(b => b.global_score_performance || 0);
        const mean = allSpgValues.reduce((s, v) => s + v, 0) / allSpgValues.length;
        const variance = allSpgValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allSpgValues.length;
        const stdDev = Math.sqrt(variance);

        for (const benchmark of benchmarks) {
            const spg = benchmark.global_score_performance || 0;
            const zScore = stdDev > 0 ? (spg - mean) / stdDev : 0;
            
            if (Math.abs(zScore) > outlier_threshold_z_score) {
                const outlier = {
                    benchmark_id: benchmark.id,
                    scenario_name: benchmark.scenario_name,
                    spg: spg,
                    z_score: zScore,
                    type: zScore > 0 ? 'exceptional_performance' : 'poor_performance',
                    created_date: benchmark.created_date,
                    details: {
                        personas_used: (benchmark.mode_b_personas_used || []).length,
                        time_ms: benchmark.mode_b_time_ms,
                        tokens: benchmark.mode_b_token_count,
                        winner: benchmark.winner
                    },
                    investigation_notes: zScore < 0 
                        ? 'Investigate: Why did this test perform poorly?'
                        : 'Success case: What made this test exceptional?'
                };

                analyticsReport.outliers.push(outlier);
                addLog(`Outlier detected: ${benchmark.scenario_name} (z=${zScore.toFixed(2)})`, 'WARNING');
            }
        }

        // 5. ANALYSE DE TENDANCES TEMPORELLES
        if (include_trend_analysis) {
            addLog('Analyzing temporal trends...');
            
            // Grouper par semaine
            const weeklyData = {};
            for (const benchmark of benchmarks) {
                const date = new Date(benchmark.created_date);
                const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = [];
                }
                weeklyData[weekKey].push(benchmark);
            }

            // Calculer tendances
            const weeklyStats = Object.entries(weeklyData)
                .map(([week, data]) => ({
                    week,
                    avg_spg: data.reduce((s, b) => s + (b.global_score_performance || 0), 0) / data.length,
                    count: data.length,
                    pass_rate: data.filter(b => b.passed).length / data.length
                }))
                .sort((a, b) => a.week.localeCompare(b.week));

            if (weeklyStats.length >= 2) {
                const recentWeek = weeklyStats[weeklyStats.length - 1];
                const previousWeek = weeklyStats[weeklyStats.length - 2];
                
                const spgTrend = ((recentWeek.avg_spg - previousWeek.avg_spg) / previousWeek.avg_spg) * 100;
                const passRateTrend = ((recentWeek.pass_rate - previousWeek.pass_rate) / previousWeek.pass_rate) * 100;

                analyticsReport.trends.weekly = {
                    data: weeklyStats,
                    spg_trend_percentage: spgTrend,
                    pass_rate_trend_percentage: passRateTrend,
                    trend_direction: spgTrend > 5 ? 'improving' : 
                                   spgTrend < -5 ? 'declining' : 'stable'
                };

                addLog(`Weekly trend: SPG ${spgTrend.toFixed(1)}%, Pass rate ${passRateTrend.toFixed(1)}%`);
            }
        }

        // 6. GÉNÉRER INSIGHTS AUTOMATIQUES
        addLog('Generating insights...');
        
        // Insight 1: Meilleure configuration
        if (analyticsReport.groups.scenario_category) {
            const categories = Object.entries(analyticsReport.groups.scenario_category);
            const bestCategory = categories.reduce((best, [key, stats]) => 
                stats.avg_spg > (best.stats?.avg_spg || 0) ? { key, stats } : best
            , {});

            if (bestCategory.key) {
                analyticsReport.insights.push({
                    type: 'best_performance',
                    category: 'scenario_category',
                    key: bestCategory.key,
                    avg_spg: bestCategory.stats.avg_spg,
                    message: `Catégorie "${bestCategory.key}" performe le mieux avec SPG moyen de ${bestCategory.stats.avg_spg.toFixed(3)}`
                });
            }
        }

        // Insight 2: Corrélation personas <-> performance
        if (analyticsReport.groups.persona_usage) {
            const personaGroups = Object.entries(analyticsReport.groups.persona_usage)
                .sort((a, b) => b[1].avg_spg - a[1].avg_spg);
            
            if (personaGroups.length >= 2) {
                const [best, worst] = [personaGroups[0], personaGroups[personaGroups.length - 1]];
                const difference = best[1].avg_spg - worst[1].avg_spg;
                
                if (difference > 0.1) {
                    analyticsReport.insights.push({
                        type: 'persona_correlation',
                        message: `Tests avec ${best[0]} personas performent ${(difference * 100).toFixed(0)}% mieux que ${worst[0]} personas`,
                        best_range: best[0],
                        worst_range: worst[0],
                        spg_difference: difference
                    });
                }
            }
        }

        // Insight 3: Winner patterns
        if (analyticsReport.groups.winner) {
            const modeBStats = analyticsReport.groups.winner['mode_b'];
            const modeAStats = analyticsReport.groups.winner['mode_a'];
            
            if (modeBStats && modeAStats) {
                const winRate = (modeBStats.sample_count / benchmarks.length) * 100;
                
                analyticsReport.insights.push({
                    type: 'win_rate',
                    mode_b_win_rate: winRate,
                    mode_b_avg_spg: modeBStats.avg_spg,
                    mode_a_avg_spg: modeAStats.avg_spg,
                    message: `Mode B gagne ${winRate.toFixed(1)}% du temps avec SPG moyen ${modeBStats.avg_spg.toFixed(3)} vs ${modeAStats.avg_spg.toFixed(3)}`
                });
            }
        }

        // 7. RECOMMANDATIONS BASÉES SUR L'ANALYSE
        addLog('Generating recommendations...');
        
        // Recommandation sur les outliers
        if (analyticsReport.outliers.length > 0) {
            const poorOutliers = analyticsReport.outliers.filter(o => o.type === 'poor_performance');
            const exceptionalOutliers = analyticsReport.outliers.filter(o => o.type === 'exceptional_performance');
            
            if (poorOutliers.length > 0) {
                analyticsReport.recommendations.push({
                    priority: 'high',
                    category: 'outlier_investigation',
                    message: `${poorOutliers.length} test(s) sous-performent significativement`,
                    action: 'Investiguer ces cas pour identifier les problèmes récurrents',
                    affected_benchmarks: poorOutliers.map(o => o.benchmark_id).slice(0, 5)
                });
            }

            if (exceptionalOutliers.length > 0) {
                analyticsReport.recommendations.push({
                    priority: 'medium',
                    category: 'success_pattern',
                    message: `${exceptionalOutliers.length} test(s) exceptionnellement performants`,
                    action: 'Analyser ces succès pour répliquer la configuration optimale',
                    affected_benchmarks: exceptionalOutliers.map(o => o.benchmark_id).slice(0, 5)
                });
            }
        }

        // Recommandation sur les tendances
        if (analyticsReport.trends.weekly?.trend_direction === 'declining') {
            analyticsReport.recommendations.push({
                priority: 'critical',
                category: 'performance_degradation',
                message: 'Performance en déclin détectée',
                action: 'Lancer une analyse RCA et considérer un recalibrage des paramètres',
                trend_data: analyticsReport.trends.weekly
            });
        }

        // Recommandation sur la variance
        const spgVariance = variance > 0.05;
        if (spgVariance) {
            analyticsReport.recommendations.push({
                priority: 'medium',
                category: 'inconsistent_performance',
                message: `Haute variance SPG détectée (σ=${stdDev.toFixed(3)})`,
                action: 'Performance inconsistante - vérifier la stabilité des personas et paramètres',
                variance: variance,
                std_dev: stdDev
            });
        }

        // 8. STATISTIQUES GLOBALES
        analyticsReport.overall_stats = {
            mean_spg: mean,
            median_spg: calculateMedian(allSpgValues),
            std_dev_spg: stdDev,
            variance_spg: variance,
            min_spg: Math.min(...allSpgValues),
            max_spg: Math.max(...allSpgValues),
            coefficient_of_variation: stdDev / mean,
            total_outliers: analyticsReport.outliers.length,
            outliers_percentage: (analyticsReport.outliers.length / benchmarks.length * 100).toFixed(1)
        };

        addLog(`Overall stats: mean=${mean.toFixed(3)}, σ=${stdDev.toFixed(3)}, outliers=${analyticsReport.outliers.length}`);
        addLog(`Generated ${analyticsReport.insights.length} insights, ${analyticsReport.recommendations.length} recommendations`);
        addLog('=== ANALYTICS COMPLETE ===', 'SYSTEM');

        return Response.json({
            success: true,
            analytics_report: analyticsReport,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`, 'CRITICAL');
        console.error('[BenchAnalytics] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs
        }, { status: 500 });
    }
});

// HELPER FUNCTIONS

function calculateGroupStats(benchmarks) {
    const spgValues = benchmarks.map(b => b.global_score_performance || 0);
    const cpuSavings = benchmarks.map(b => b.cpu_savings_percentage || 0);
    const tokenSavings = benchmarks.map(b => b.token_savings_percentage || 0);
    const times = benchmarks.map(b => b.mode_b_time_ms || 0);
    
    const passed = benchmarks.filter(b => b.passed).length;
    
    return {
        avg_spg: spgValues.reduce((s, v) => s + v, 0) / spgValues.length,
        median_spg: calculateMedian(spgValues),
        min_spg: Math.min(...spgValues),
        max_spg: Math.max(...spgValues),
        std_dev_spg: Math.sqrt(spgValues.reduce((s, v) => {
            const mean = spgValues.reduce((a, b) => a + b, 0) / spgValues.length;
            return s + Math.pow(v - mean, 2);
        }, 0) / spgValues.length),
        avg_cpu_savings: cpuSavings.reduce((s, v) => s + v, 0) / cpuSavings.length,
        avg_token_savings: tokenSavings.reduce((s, v) => s + v, 0) / tokenSavings.length,
        avg_time_ms: times.reduce((s, v) => s + v, 0) / times.length,
        pass_rate: passed / benchmarks.length,
        total_passed: passed,
        total_failed: benchmarks.length - passed
    };
}

function calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}