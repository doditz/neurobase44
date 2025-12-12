import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PERFORMANCE MONITOR v1.0
 * 
 * Real-time performance tracking and bottleneck detection
 * - Monitors chatOrchestrator execution times
 * - Identifies slow components
 * - Provides optimization recommendations
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        const requestData = await req.json();
        const { 
            operation = 'get_stats', 
            time_window_minutes = 60,
            // For entropy calculation
            cpu_load_percentage = 0,
            network_latency_ms = 0,
            complexity_score = 0,
            processing_active = false,
            personas_active = 0,
            debate_round_current = 0
        } = requestData;

        if (operation === 'get_stats') {
            // Fetch recent conversations with their metadata
            const recentDebates = await base44.asServiceRole.entities.Debate.filter({
                created_by: user.email
            }, '-created_date', 50);

            // Analyze performance metrics
            const stats = {
                total_conversations: recentDebates.length,
                avg_complexity: 0,
                avg_d2_activation: 0,
                avg_processing_time: 0,
                slow_operations: [],
                bottlenecks: [],
                recommendations: []
            };

            let complexitySum = 0;
            let d2Sum = 0;
            let timeSum = 0;
            let validCount = 0;

            for (const debate of recentDebates) {
                const metadata = debate.debate_metadata;
                if (!metadata) continue;

                const complexity = metadata.complexity_score || 0;
                const d2 = metadata.d2_activation || 0;
                const time = metadata.total_time_ms || 0;

                complexitySum += complexity;
                d2Sum += d2;
                timeSum += time;
                validCount++;

                // Identify slow operations (>30s)
                if (time > 30000) {
                    stats.slow_operations.push({
                        conversation_id: debate.conversation_id,
                        time_ms: time,
                        complexity: complexity,
                        personas: metadata.personas_used?.length || 0,
                        rounds: metadata.debate_rounds_executed || 0,
                        created_date: debate.created_date
                    });
                }
            }

            if (validCount > 0) {
                stats.avg_complexity = complexitySum / validCount;
                stats.avg_d2_activation = d2Sum / validCount;
                stats.avg_processing_time = timeSum / validCount;

                // Detect bottlenecks
                if (stats.avg_processing_time > 20000) {
                    stats.bottlenecks.push({
                        type: 'high_avg_processing_time',
                        severity: 'high',
                        value: stats.avg_processing_time,
                        description: 'Average processing time exceeds 20 seconds'
                    });
                }

                if (stats.slow_operations.length > validCount * 0.3) {
                    stats.bottlenecks.push({
                        type: 'frequent_slow_operations',
                        severity: 'medium',
                        count: stats.slow_operations.length,
                        description: `${stats.slow_operations.length} slow operations detected (>30% of total)`
                    });
                }

                // Generate recommendations
                if (stats.avg_complexity < 0.3 && stats.avg_processing_time > 15000) {
                    stats.recommendations.push({
                        priority: 'high',
                        title: 'Over-processing simple queries',
                        description: 'Low complexity queries taking too long. Consider reducing debate rounds for simple prompts.',
                        action: 'Adjust complexity thresholds in D2STIM modulator'
                    });
                }

                if (stats.avg_d2_activation > 0.8) {
                    stats.recommendations.push({
                        priority: 'medium',
                        title: 'High D2 activation pattern',
                        description: 'Consistently high D2 activation may indicate over-optimization for analytical tasks.',
                        action: 'Review archetype detection in SMARCE scorer'
                    });
                }

                const avgPersonas = stats.slow_operations.reduce((sum, op) => sum + op.personas, 0) / 
                    (stats.slow_operations.length || 1);
                
                if (avgPersonas > 8) {
                    stats.recommendations.push({
                        priority: 'high',
                        title: 'Excessive persona usage',
                        description: `Average ${avgPersonas.toFixed(1)} personas in slow operations. Consider limiting max_personas.`,
                        action: 'Cap max_personas at 7 for most queries'
                    });
                }

                // Check for memory system issues
                const memoryEnabledCount = recentDebates.filter(d => 
                    d.debate_metadata?.memory_system_enabled === true
                ).length;

                if (memoryEnabledCount === 0 && validCount > 5) {
                    stats.recommendations.push({
                        priority: 'critical',
                        title: 'Memory system not active',
                        description: 'Memory system appears disabled or not functioning.',
                        action: 'Check TunableParameter "memoryActive" setting'
                    });
                }
            }

            // Sort recommendations by priority
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            stats.recommendations.sort((a, b) => 
                priorityOrder[a.priority] - priorityOrder[b.priority]
            );

            // Calculate System Entropy
            const entropyResponse = await base44.functions.invoke('systemEntropyCalculator', {
                cpu_load_percentage,
                network_latency_ms,
                complexity_score,
                processing_active,
                personas_active,
                debate_round_current
            });

            const entropy = entropyResponse.data?.success ? entropyResponse.data : null;

            return Response.json({
                success: true,
                stats,
                entropy,
                analysis_window: `Last ${recentDebates.length} conversations`,
                timestamp: new Date().toISOString()
            });
        }

        return Response.json({ error: 'Unknown operation' }, { status: 400 });

    } catch (error) {
        console.error('[performanceMonitor] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});