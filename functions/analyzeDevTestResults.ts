import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { test_ids, question_id, analysis_type = 'single' } = await req.json();

        console.log('[AnalyzeDevTest] Starting analysis:', { 
            analysis_type, 
            test_count: test_ids?.length,
            question_id 
        });

        // Load test data - FIXED: Try BenchmarkResult first since DevTestResult is deprecated
        let tests = [];
        if (test_ids && test_ids.length > 0) {
            for (const id of test_ids) {
                try {
                    // Try BenchmarkResult first
                    const test = await base44.asServiceRole.entities.BenchmarkResult.get(id);
                    tests.push(test);
                } catch (benchError) {
                    // Fallback to DevTestResult
                    try {
                        const test = await base44.asServiceRole.entities.DevTestResult.get(id);
                        tests.push(test);
                    } catch (devError) {
                        console.warn(`[AnalyzeDevTest] Failed to load ${id} from both entities:`, devError.message);
                    }
                }
            }
        } else if (question_id) {
            // Load all tests for this question from both entities
            const [benchTests, devTests] = await Promise.all([
                base44.asServiceRole.entities.BenchmarkResult.filter({
                    scenario_name: question_id
                }).catch(() => []),
                base44.asServiceRole.entities.DevTestResult.filter({
                    scenario_name: question_id
                }).catch(() => [])
            ]);
            tests = [...benchTests, ...devTests];
        }

        if (tests.length === 0) {
            return Response.json({ 
                error: 'No test data found in BenchmarkResult or DevTestResult entities',
                success: false 
            });
        }

        console.log(`[AnalyzeDevTest] Loaded ${tests.length} tests`);

        // Prepare data summary for LLM
        const dataSummary = tests.map(t => ({
            id: t.id,
            scenario: t.scenario_name,
            winner: t.winner,
            spg: t.global_score_performance,
            mode_a_ars: t.quality_scores?.mode_a_ars_score || t.quality_scores?.A?.ars_score,
            mode_b_ars: t.quality_scores?.mode_b_ars_score || t.quality_scores?.B?.ars_score,
            mode_a_time: t.mode_a_time_ms,
            mode_b_time: t.mode_b_time_ms,
            mode_a_tokens: t.mode_a_token_count,
            mode_b_tokens: t.mode_b_token_count,
            cpu_savings: t.cpu_savings_percentage,
            token_savings: t.token_savings_percentage,
            passed: t.passed,
            created: t.created_date
        }));

        // Build analysis prompt based on type
        let analysisPrompt = '';
        
        if (analysis_type === 'single' && tests.length === 1) {
            const t = dataSummary[0];
            analysisPrompt = `Analyze this dev test result and provide insights:

**Test Details:**
- Scenario: ${t.scenario}
- Winner: ${t.winner}
- SPG: ${t.spg?.toFixed(3) || 'N/A'}
- Mode A ARS: ${t.mode_a_ars?.toFixed(3) || 'N/A'}
- Mode B ARS: ${t.mode_b_ars?.toFixed(3) || 'N/A'}
- Mode A Time: ${t.mode_a_time}ms, Tokens: ${t.mode_a_tokens}
- Mode B Time: ${t.mode_b_time}ms, Tokens: ${t.mode_b_tokens}
- CPU Savings: ${t.cpu_savings?.toFixed(1) || 'N/A'}%
- Token Savings: ${t.token_savings?.toFixed(1) || 'N/A'}%
- Passed: ${t.passed}

Provide:
1. **Comparative Summary**: Compare Mode A vs Mode B performance
2. **Key Insights**: What do these metrics tell us?
3. **Health Scores**: Rate Mode A and Mode B (0-100) based on performance and efficiency
4. **Recommendations**: Actionable improvement suggestions

Format as JSON with keys: comparative_summary, key_insights, health_scores {mode_a, mode_b}, recommendations`;

        } else {
            // Multi-test trend analysis
            const avgSpg = dataSummary.reduce((sum, t) => sum + (t.spg || 0), 0) / dataSummary.length;
            const modeBWins = dataSummary.filter(t => t.winner === 'mode_b').length;
            const passRate = dataSummary.filter(t => t.passed).length / dataSummary.length;
            
            analysisPrompt = `Analyze these ${tests.length} dev test results and identify trends:

**Aggregate Stats:**
- Total Tests: ${tests.length}
- Average SPG: ${avgSpg.toFixed(3)}
- Mode B Win Rate: ${((modeBWins / tests.length) * 100).toFixed(1)}%
- Pass Rate: ${(passRate * 100).toFixed(1)}%

**Individual Results:**
${dataSummary.slice(0, 20).map((t, i) => 
    `${i+1}. ${t.scenario} - Winner: ${t.winner}, SPG: ${t.spg?.toFixed(3)}, Pass: ${t.passed}`
).join('\n')}

Provide:
1. **Trend Analysis**: Patterns across these runs
2. **Consistency**: How consistent are the results?
3. **Health Scores**: Overall Mode A and Mode B ratings (0-100)
4. **Areas for Improvement**: What patterns suggest optimization opportunities?
5. **Anomalies**: Any outliers or unexpected results?

Format as JSON with keys: trend_analysis, consistency_assessment, health_scores {mode_a, mode_b, overall}, improvement_areas, anomalies`;
        }

        // Invoke LLM for analysis
        const analysisResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    comparative_summary: { type: 'string' },
                    key_insights: { type: 'string' },
                    trend_analysis: { type: 'string' },
                    consistency_assessment: { type: 'string' },
                    health_scores: {
                        type: 'object',
                        properties: {
                            mode_a: { type: 'number' },
                            mode_b: { type: 'number' },
                            overall: { type: 'number' }
                        }
                    },
                    recommendations: { type: 'string' },
                    improvement_areas: { type: 'string' },
                    anomalies: { type: 'string' }
                }
            }
        });

        console.log('[AnalyzeDevTest] Analysis complete');

        return Response.json({
            success: true,
            analysis: analysisResponse,
            metadata: {
                tests_analyzed: tests.length,
                analysis_type,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[AnalyzeDevTest] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});