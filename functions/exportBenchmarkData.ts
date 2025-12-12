import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { benchmark_id, format = 'json' } = await req.json();

        if (!benchmark_id) {
            return Response.json({ error: 'Missing benchmark_id' }, { status: 400 });
        }

        console.log(`[Export] Fetching benchmark ${benchmark_id}`);

        // Fetch with retry logic
        let benchmark = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                benchmark = await base44.entities.BenchmarkResult.get(benchmark_id);
                if (benchmark) break;
            } catch (e) {
                console.log(`[Export] Attempt ${attempt} failed: ${e.message}`);
                if (attempt < 3) await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!benchmark) {
            return Response.json({ error: `Benchmark ${benchmark_id} not found` }, { status: 404 });
        }

        console.log(`[Export] Benchmark found, generating ${format} export`);

        // ========================================
        // JSON FORMAT
        // ========================================
        if (format === 'json') {
            const exportData = {
                benchmark_id: benchmark.id,
                created_date: benchmark.created_date,
                scenario_name: benchmark.scenario_name,
                scenario_category: benchmark.scenario_category,
                test_prompt: benchmark.test_prompt,
                
                mode_a: {
                    response: benchmark.mode_a_response,
                    time_ms: benchmark.mode_a_time_ms,
                    token_count: benchmark.mode_a_token_count
                },
                
                mode_b: {
                    response: benchmark.mode_b_response,
                    time_ms: benchmark.mode_b_time_ms,
                    token_count: benchmark.mode_b_token_count,
                    personas_used: benchmark.mode_b_personas_used,
                    debate_rounds: benchmark.mode_b_debate_rounds,
                    debate_rounds_data: benchmark.mode_b_debate_rounds_data,
                    dynamic_settings: benchmark.mode_b_dynamic_settings,
                    complexity_score: benchmark.mode_b_complexity_score
                },
                
                quality_scores: benchmark.quality_scores,
                winner: benchmark.winner,
                performance_improvement: benchmark.performance_improvement,
                global_score_performance: benchmark.global_score_performance,
                spg_breakdown: benchmark.spg_breakdown,
                
                metadata: {
                    notes: benchmark.notes,
                    full_debug_log: benchmark.full_debug_log
                }
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            
            return new Response(jsonString, {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="benchmark_${benchmark_id}.json"`
                }
            });
        }

        // ========================================
        // CSV FORMAT
        // ========================================
        if (format === 'csv') {
            const csv = [
                'Field,Value',
                `Benchmark ID,${benchmark.id}`,
                `Date,"${new Date(benchmark.created_date).toLocaleString('fr-FR')}"`,
                `Scenario,"${benchmark.scenario_name || 'N/A'}"`,
                `Category,${benchmark.scenario_category || 'N/A'}`,
                `Winner,${benchmark.winner || 'N/A'}`,
                '',
                'Performance Metrics',
                `Mode A Time (ms),${benchmark.mode_a_time_ms || 0}`,
                `Mode B Time (ms),${benchmark.mode_b_time_ms || 0}`,
                `Mode A Tokens,${benchmark.mode_a_token_count || 0}`,
                `Mode B Tokens,${benchmark.mode_b_token_count || 0}`,
                `Improvement (%),${benchmark.performance_improvement || 0}`,
                `SPG Score,${benchmark.global_score_performance || 'N/A'}`,
                '',
                'Mode B Details',
                `Complexity Score,${benchmark.mode_b_complexity_score || 'N/A'}`,
                `Debate Rounds,${benchmark.mode_b_debate_rounds || 0}`,
                `Personas Count,${benchmark.mode_b_personas_used?.length || 0}`
            ].join('\n');

            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="benchmark_${benchmark_id}.csv"`
                }
            });
        }

        // ========================================
        // MARKDOWN FORMAT
        // ========================================
        if (format === 'md') {
            const spg = benchmark.global_score_performance || 0;
            const improvement = benchmark.performance_improvement || 0;
            
            const markdown = `# Benchmark Report: ${benchmark.scenario_name || 'N/A'}

**ID:** \`${benchmark.id}\`  
**Date:** ${new Date(benchmark.created_date).toLocaleString('fr-FR')}  
**Catégorie:** ${benchmark.scenario_category || 'N/A'}  
**Gagnant:** ${benchmark.winner === 'mode_b' ? '🏆 Mode B (Neuronas)' : benchmark.winner === 'mode_a' ? 'Mode A (Baseline)' : 'Égalité'}

---

## 📊 Performance Globale

| Métrique | Valeur |
|----------|--------|
| **SPG Score** | ${spg.toFixed(4)} |
| **Amélioration** | ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% |
| **Mode A Time** | ${benchmark.mode_a_time_ms || 0}ms |
| **Mode B Time** | ${benchmark.mode_b_time_ms || 0}ms |
| **Mode A Tokens** | ${(benchmark.mode_a_token_count || 0).toLocaleString()} |
| **Mode B Tokens** | ${(benchmark.mode_b_token_count || 0).toLocaleString()} |

${benchmark.spg_breakdown ? `
### SPG Breakdown
- **Quality:** ${benchmark.spg_breakdown.quality.toFixed(4)}
- **Efficiency:** ${benchmark.spg_breakdown.efficiency.toFixed(4)}
- **Complexity:** ${benchmark.spg_breakdown.complexity.toFixed(4)}
` : ''}

---

## 📝 Test Prompt

\`\`\`
${benchmark.test_prompt || 'N/A'}
\`\`\`

---

## 🔵 Mode A Response (Baseline LLM)

**Time:** ${benchmark.mode_a_time_ms || 0}ms | **Tokens:** ${benchmark.mode_a_token_count || 0}

${benchmark.mode_a_response || 'N/A'}

---

## 🟢 Mode B Response (Neuronas Enhanced)

**Time:** ${benchmark.mode_b_time_ms || 0}ms | **Tokens:** ${benchmark.mode_b_token_count || 0}

**Complexity Score:** ${benchmark.mode_b_complexity_score || 'N/A'}  
**Debate Rounds:** ${benchmark.mode_b_debate_rounds || 0}  
**Personas Activated:** ${benchmark.mode_b_personas_used?.length || 0}

${benchmark.mode_b_personas_used?.length > 0 ? `
### Personas Utilisées
${benchmark.mode_b_personas_used.map(p => `- ${p}`).join('\n')}
` : ''}

### Response

${benchmark.mode_b_response || 'N/A'}

---

## 📈 Quality Scores

${benchmark.quality_scores ? `
| Métrique | Mode A | Mode B |
|----------|--------|--------|
| ARS Score | ${(benchmark.quality_scores.mode_a_ars_score || 0).toFixed(3)} | ${(benchmark.quality_scores.mode_b_ars_score || 0).toFixed(3)} |
| Semantic Fidelity | ${(benchmark.quality_scores.semantic_fidelity_a || 0).toFixed(3)} | ${(benchmark.quality_scores.semantic_fidelity_b || 0).toFixed(3)} |
| Creativity | ${(benchmark.quality_scores.creativity_score_a || 0).toFixed(3)} | ${(benchmark.quality_scores.creativity_score_b || 0).toFixed(3)} |
` : 'No quality scores available'}

${benchmark.notes ? `
---

## 📌 Notes

${benchmark.notes}
` : ''}

---

*Généré par Neuronas AI - ${new Date().toLocaleString('fr-FR')}*
`;

            return new Response(markdown, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="benchmark_${benchmark_id}.md"`
                }
            });
        }

        // ========================================
        // TXT FORMAT (Simple Log)
        // ========================================
        if (format === 'txt') {
            const txt = `
================================================================================
NEURONAS BENCHMARK REPORT
================================================================================

ID: ${benchmark.id}
Date: ${new Date(benchmark.created_date).toLocaleString('fr-FR')}
Scenario: ${benchmark.scenario_name || 'N/A'}
Category: ${benchmark.scenario_category || 'N/A'}
Winner: ${benchmark.winner || 'N/A'}

================================================================================
PERFORMANCE SUMMARY
================================================================================

SPG Score: ${(benchmark.global_score_performance || 0).toFixed(4)}
Performance Improvement: ${(benchmark.performance_improvement || 0).toFixed(1)}%

Mode A (Baseline):
  - Time: ${benchmark.mode_a_time_ms || 0}ms
  - Tokens: ${benchmark.mode_a_token_count || 0}

Mode B (Neuronas):
  - Time: ${benchmark.mode_b_time_ms || 0}ms
  - Tokens: ${benchmark.mode_b_token_count || 0}
  - Complexity: ${benchmark.mode_b_complexity_score || 'N/A'}
  - Debate Rounds: ${benchmark.mode_b_debate_rounds || 0}
  - Personas: ${benchmark.mode_b_personas_used?.length || 0}

================================================================================
TEST PROMPT
================================================================================

${benchmark.test_prompt || 'N/A'}

================================================================================
MODE A RESPONSE
================================================================================

${benchmark.mode_a_response || 'N/A'}

================================================================================
MODE B RESPONSE
================================================================================

${benchmark.mode_b_response || 'N/A'}

${benchmark.full_debug_log && benchmark.full_debug_log.length > 0 ? `
================================================================================
DEBUG LOG
================================================================================

${benchmark.full_debug_log.join('\n')}
` : ''}

${benchmark.notes ? `
================================================================================
NOTES
================================================================================

${benchmark.notes}
` : ''}

================================================================================
Generated by Neuronas AI - ${new Date().toLocaleString('fr-FR')}
================================================================================
`;

            return new Response(txt, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="benchmark_${benchmark_id}.txt"`
                }
            });
        }

        // ========================================
        // PDF FORMAT (Simple HTML to PDF simulation)
        // ========================================
        if (format === 'pdf') {
            // For PDF, we'll return an HTML that the browser can print to PDF
            // Or we could use a library like jsPDF, but for simplicity, return formatted HTML
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Benchmark ${benchmark.id}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
        h2 { color: #3b82f6; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
        .metric { background: #f3f4f6; padding: 10px; margin: 10px 0; border-left: 4px solid #10b981; }
        .metric strong { color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        th { background: #f9fafb; font-weight: bold; }
        .response { background: #f9fafb; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <h1>📊 Benchmark Report: ${benchmark.scenario_name || 'N/A'}</h1>
    
    <div class="metric">
        <strong>ID:</strong> ${benchmark.id}<br>
        <strong>Date:</strong> ${new Date(benchmark.created_date).toLocaleString('fr-FR')}<br>
        <strong>Catégorie:</strong> ${benchmark.scenario_category || 'N/A'}<br>
        <strong>Gagnant:</strong> ${benchmark.winner === 'mode_b' ? '🏆 Mode B (Neuronas)' : benchmark.winner === 'mode_a' ? 'Mode A (Baseline)' : 'Égalité'}
    </div>

    <h2>Performance Globale</h2>
    <table>
        <tr><th>Métrique</th><th>Valeur</th></tr>
        <tr><td><strong>SPG Score</strong></td><td>${(benchmark.global_score_performance || 0).toFixed(4)}</td></tr>
        <tr><td><strong>Amélioration</strong></td><td>${(benchmark.performance_improvement || 0) > 0 ? '+' : ''}${(benchmark.performance_improvement || 0).toFixed(1)}%</td></tr>
        <tr><td>Mode A Time</td><td>${benchmark.mode_a_time_ms || 0}ms</td></tr>
        <tr><td>Mode B Time</td><td>${benchmark.mode_b_time_ms || 0}ms</td></tr>
        <tr><td>Mode A Tokens</td><td>${(benchmark.mode_a_token_count || 0).toLocaleString()}</td></tr>
        <tr><td>Mode B Tokens</td><td>${(benchmark.mode_b_token_count || 0).toLocaleString()}</td></tr>
    </table>

    <h2>Test Prompt</h2>
    <div class="response">${benchmark.test_prompt || 'N/A'}</div>

    <h2>Mode A Response (Baseline LLM)</h2>
    <div class="response">${benchmark.mode_a_response || 'N/A'}</div>

    <h2>Mode B Response (Neuronas Enhanced)</h2>
    <div class="metric">
        <strong>Complexity Score:</strong> ${benchmark.mode_b_complexity_score || 'N/A'}<br>
        <strong>Debate Rounds:</strong> ${benchmark.mode_b_debate_rounds || 0}<br>
        <strong>Personas Activated:</strong> ${benchmark.mode_b_personas_used?.length || 0}
    </div>
    <div class="response">${benchmark.mode_b_response || 'N/A'}</div>

    <div class="footer">
        Généré par Neuronas AI - ${new Date().toLocaleString('fr-FR')}
    </div>
</body>
</html>`;

            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="benchmark_${benchmark_id}.html"`
                }
            });
        }

        return Response.json({ error: 'Invalid format' }, { status: 400 });

    } catch (error) {
        console.error('[Export] Fatal error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});