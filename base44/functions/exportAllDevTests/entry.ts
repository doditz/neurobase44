import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { format = 'json', limit = 100 } = await req.json();

        console.log(`[Export All DevTests] Fetching up to ${limit} tests for format: ${format}`);

        const tests = await base44.entities.DevTestResult.list('-created_date', limit);

        if (tests.length === 0) {
            return Response.json({ error: 'No dev tests found' }, { status: 404 });
        }

        console.log(`[Export All DevTests] Found ${tests.length} tests`);

        const stats = {
            total: tests.length,
            mode_b_wins: tests.filter(b => b.winner === 'mode_b').length,
            mode_a_wins: tests.filter(b => b.winner === 'mode_a').length,
            ties: tests.filter(b => b.winner === 'tie').length,
            avg_spg: tests.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / tests.length,
            avg_improvement: tests.reduce((sum, b) => sum + (b.performance_improvement || 0), 0) / tests.length,
            avg_time_a: tests.reduce((sum, b) => sum + (b.mode_a_time_ms || 0), 0) / tests.length,
            avg_time_b: tests.reduce((sum, b) => sum + (b.mode_b_time_ms || 0), 0) / tests.length,
            total_tokens_a: tests.reduce((sum, b) => sum + (b.mode_a_token_count || 0), 0),
            total_tokens_b: tests.reduce((sum, b) => sum + (b.mode_b_token_count || 0), 0)
        };

        if (format === 'json') {
            const exportData = {
                export_date: new Date().toISOString(),
                user_email: user.email,
                total_tests: tests.length,
                statistics: stats,
                dev_tests: tests.map(t => ({
                    id: t.id,
                    created_date: t.created_date,
                    scenario_name: t.scenario_name,
                    scenario_category: t.scenario_category,
                    test_prompt: t.test_prompt,
                    winner: t.winner,
                    spg: t.global_score_performance,
                    improvement: t.performance_improvement,
                    mode_a: {
                        response: t.mode_a_response,
                        time_ms: t.mode_a_time_ms,
                        tokens: t.mode_a_token_count
                    },
                    mode_b: {
                        response: t.mode_b_response,
                        time_ms: t.mode_b_time_ms,
                        tokens: t.mode_b_token_count,
                        personas: t.mode_b_personas_used,
                        debate_rounds: t.mode_b_debate_rounds,
                        smas_dynamics: t.mode_b_smas_dynamics
                    },
                    quality_scores: t.quality_scores,
                    grader_rationale: t.grader_rationale
                }))
            };

            return new Response(JSON.stringify(exportData, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="neuronas_devtests_${Date.now()}.json"`
                }
            });
        }

        if (format === 'md') {
            let markdown = `# NEURONAS Dev Test Report\n\n`;
            markdown += `**Date:** ${new Date().toLocaleString('fr-FR')}\n`;
            markdown += `**Total Tests:** ${tests.length}\n\n`;
            markdown += `## Statistics\n\n`;
            markdown += `| Metric | Value |\n|--------|-------|\n`;
            markdown += `| Mode B Wins | ${stats.mode_b_wins} (${((stats.mode_b_wins/stats.total)*100).toFixed(1)}%) |\n`;
            markdown += `| Average SPG | ${stats.avg_spg.toFixed(4)} |\n\n`;
            
            tests.forEach((t, i) => {
                markdown += `### ${i+1}. ${t.scenario_name}\n\n`;
                markdown += `**Winner:** ${t.winner} | **SPG:** ${(t.global_score_performance || 0).toFixed(3)}\n\n`;
                markdown += `---\n\n`;
            });

            return new Response(markdown, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="neuronas_devtests_${Date.now()}.md"`
                }
            });
        }

        if (format === 'txt') {
            let txt = `NEURONAS DEV TEST REPORT\n${'='.repeat(80)}\n\n`;
            txt += `Total Tests: ${tests.length}\n`;
            txt += `Mode B Wins: ${stats.mode_b_wins}\n\n`;
            
            tests.forEach((t, i) => {
                txt += `\n${i+1}. ${t.scenario_name}\nWinner: ${t.winner}\n`;
            });

            return new Response(txt, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="neuronas_devtests_${Date.now()}.txt"`
                }
            });
        }

        return Response.json({ error: 'Invalid format' }, { status: 400 });

    } catch (error) {
        console.error('[Export DevTests] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});