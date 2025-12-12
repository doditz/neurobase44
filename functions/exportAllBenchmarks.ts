import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { format = 'json', limit = 100 } = await req.json();

        console.log(`[Export All] Fetching up to ${limit} benchmarks for format: ${format}`);

        // Récupérer tous les benchmarks de l'utilisateur
        const benchmarks = await base44.entities.BenchmarkResult.list('-created_date', limit);

        if (benchmarks.length === 0) {
            return Response.json({ error: 'No benchmarks found' }, { status: 404 });
        }

        console.log(`[Export All] Found ${benchmarks.length} benchmarks, generating ${format} export`);

        // Calculer des statistiques globales
        const stats = {
            total: benchmarks.length,
            mode_b_wins: benchmarks.filter(b => b.winner === 'mode_b').length,
            mode_a_wins: benchmarks.filter(b => b.winner === 'mode_a').length,
            ties: benchmarks.filter(b => b.winner === 'tie').length,
            avg_spg: benchmarks.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / benchmarks.length,
            avg_improvement: benchmarks.reduce((sum, b) => sum + (b.performance_improvement || 0), 0) / benchmarks.length,
            avg_time_a: benchmarks.reduce((sum, b) => sum + (b.mode_a_time_ms || 0), 0) / benchmarks.length,
            avg_time_b: benchmarks.reduce((sum, b) => sum + (b.mode_b_time_ms || 0), 0) / benchmarks.length,
            total_tokens_a: benchmarks.reduce((sum, b) => sum + (b.mode_a_token_count || 0), 0),
            total_tokens_b: benchmarks.reduce((sum, b) => sum + (b.mode_b_token_count || 0), 0)
        };

        // ========================================
        // JSON FORMAT
        // ========================================
        if (format === 'json') {
            const exportData = {
                export_date: new Date().toISOString(),
                user_email: user.email,
                total_benchmarks: benchmarks.length,
                statistics: stats,
                benchmarks: benchmarks.map(b => ({
                    id: b.id,
                    created_date: b.created_date,
                    scenario_name: b.scenario_name,
                    scenario_category: b.scenario_category,
                    test_prompt: b.test_prompt,
                    winner: b.winner,
                    spg: b.global_score_performance,
                    improvement: b.performance_improvement,
                    mode_a: {
                        response: b.mode_a_response,
                        time_ms: b.mode_a_time_ms,
                        tokens: b.mode_a_token_count
                    },
                    mode_b: {
                        response: b.mode_b_response,
                        time_ms: b.mode_b_time_ms,
                        tokens: b.mode_b_token_count,
                        personas: b.mode_b_personas_used,
                        debate_rounds: b.mode_b_debate_rounds
                    },
                    quality_scores: b.quality_scores,
                    grader_rationale: b.grader_rationale
                }))
            };

            return new Response(JSON.stringify(exportData, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="neuronas_benchmarks_${Date.now()}.json"`
                }
            });
        }

        // ========================================
        // MARKDOWN FORMAT
        // ========================================
        if (format === 'md') {
            let markdown = `# NEURONAS Benchmark Report - Compilation Complète\n\n`;
            markdown += `**Date d'export:** ${new Date().toLocaleString('fr-FR')}\n`;
            markdown += `**Utilisateur:** ${user.email}\n`;
            markdown += `**Nombre total de benchmarks:** ${benchmarks.length}\n\n`;

            markdown += `---\n\n## 📊 Statistiques Globales\n\n`;
            markdown += `| Métrique | Valeur |\n`;
            markdown += `|----------|--------|\n`;
            markdown += `| **Total Benchmarks** | ${stats.total} |\n`;
            markdown += `| **Mode B Wins** | ${stats.mode_b_wins} (${((stats.mode_b_wins/stats.total)*100).toFixed(1)}%) |\n`;
            markdown += `| **Mode A Wins** | ${stats.mode_a_wins} (${((stats.mode_a_wins/stats.total)*100).toFixed(1)}%) |\n`;
            markdown += `| **Ties** | ${stats.ties} |\n`;
            markdown += `| **SPG Moyen** | ${stats.avg_spg.toFixed(4)} |\n`;
            markdown += `| **Amélioration Moyenne** | ${stats.avg_improvement.toFixed(1)}% |\n`;
            markdown += `| **Temps Moyen Mode A** | ${stats.avg_time_a.toFixed(0)}ms |\n`;
            markdown += `| **Temps Moyen Mode B** | ${stats.avg_time_b.toFixed(0)}ms |\n`;
            markdown += `| **Total Tokens Mode A** | ${stats.total_tokens_a.toLocaleString()} |\n`;
            markdown += `| **Total Tokens Mode B** | ${stats.total_tokens_b.toLocaleString()} |\n`;

            markdown += `\n---\n\n## 📋 Liste Complète des Benchmarks\n\n`;

            benchmarks.forEach((b, index) => {
                const winner_emoji = b.winner === 'mode_b' ? '🏆' : b.winner === 'mode_a' ? '⚠️' : '🤝';
                markdown += `### ${index + 1}. ${b.scenario_name || 'Sans titre'} ${winner_emoji}\n\n`;
                markdown += `**ID:** \`${b.id}\`\n`;
                markdown += `**Date:** ${new Date(b.created_date).toLocaleString('fr-FR')}\n`;
                markdown += `**Catégorie:** ${b.scenario_category || 'N/A'}\n`;
                markdown += `**Gagnant:** ${b.winner || 'N/A'}\n`;
                markdown += `**SPG:** ${(b.global_score_performance || 0).toFixed(4)}\n`;
                markdown += `**Amélioration:** ${(b.performance_improvement || 0).toFixed(1)}%\n\n`;

                markdown += `#### Prompt de Test\n\`\`\`\n${b.test_prompt || 'N/A'}\n\`\`\`\n\n`;

                markdown += `#### Mode A (Baseline) - ${b.mode_a_time_ms || 0}ms, ${b.mode_a_token_count || 0} tokens\n`;
                markdown += `${b.mode_a_response ? b.mode_a_response.substring(0, 500) + '...' : 'N/A'}\n\n`;

                markdown += `#### Mode B (Neuronas) - ${b.mode_b_time_ms || 0}ms, ${b.mode_b_token_count || 0} tokens\n`;
                if (b.mode_b_personas_used && b.mode_b_personas_used.length > 0) {
                    markdown += `**Personas:** ${b.mode_b_personas_used.join(', ')}\n`;
                }
                markdown += `${b.mode_b_response ? b.mode_b_response.substring(0, 500) + '...' : 'N/A'}\n\n`;

                if (b.grader_rationale) {
                    markdown += `#### 🧠 Grader Rationale\n${b.grader_rationale}\n\n`;
                }

                markdown += `---\n\n`;
            });

            markdown += `\n*Généré par NEURONAS AI - ${new Date().toLocaleString('fr-FR')}*\n`;

            return new Response(markdown, {
                headers: {
                    'Content-Type': 'text/markdown',
                    'Content-Disposition': `attachment; filename="neuronas_benchmarks_${Date.now()}.md"`
                }
            });
        }

        // ========================================
        // TXT FORMAT
        // ========================================
        if (format === 'txt') {
            let txt = `
================================================================================
NEURONAS BENCHMARK REPORT - COMPILATION COMPLÈTE
================================================================================

Date d'export: ${new Date().toLocaleString('fr-FR')}
Utilisateur: ${user.email}
Nombre total de benchmarks: ${benchmarks.length}

================================================================================
STATISTIQUES GLOBALES
================================================================================

Total Benchmarks: ${stats.total}
Mode B Wins: ${stats.mode_b_wins} (${((stats.mode_b_wins/stats.total)*100).toFixed(1)}%)
Mode A Wins: ${stats.mode_a_wins} (${((stats.mode_a_wins/stats.total)*100).toFixed(1)}%)
Ties: ${stats.ties}
SPG Moyen: ${stats.avg_spg.toFixed(4)}
Amélioration Moyenne: ${stats.avg_improvement.toFixed(1)}%
Temps Moyen Mode A: ${stats.avg_time_a.toFixed(0)}ms
Temps Moyen Mode B: ${stats.avg_time_b.toFixed(0)}ms
Total Tokens Mode A: ${stats.total_tokens_a.toLocaleString()}
Total Tokens Mode B: ${stats.total_tokens_b.toLocaleString()}

================================================================================
LISTE COMPLÈTE DES BENCHMARKS
================================================================================

`;

            benchmarks.forEach((b, index) => {
                txt += `
--------------------------------------------------------------------------------
BENCHMARK #${index + 1}: ${b.scenario_name || 'Sans titre'}
--------------------------------------------------------------------------------

ID: ${b.id}
Date: ${new Date(b.created_date).toLocaleString('fr-FR')}
Catégorie: ${b.scenario_category || 'N/A'}
Gagnant: ${b.winner || 'N/A'}
SPG: ${(b.global_score_performance || 0).toFixed(4)}
Amélioration: ${(b.performance_improvement || 0).toFixed(1)}%

PROMPT:
${b.test_prompt || 'N/A'}

MODE A (Baseline): ${b.mode_a_time_ms || 0}ms, ${b.mode_a_token_count || 0} tokens
${b.mode_a_response ? b.mode_a_response.substring(0, 300) + '...' : 'N/A'}

MODE B (Neuronas): ${b.mode_b_time_ms || 0}ms, ${b.mode_b_token_count || 0} tokens
Personas: ${b.mode_b_personas_used ? b.mode_b_personas_used.join(', ') : 'N/A'}
${b.mode_b_response ? b.mode_b_response.substring(0, 300) + '...' : 'N/A'}

${b.grader_rationale ? `GRADER RATIONALE:\n${b.grader_rationale}` : ''}

`;
            });

            txt += `
================================================================================
Généré par NEURONAS AI - ${new Date().toLocaleString('fr-FR')}
================================================================================
`;

            return new Response(txt, {
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': `attachment; filename="neuronas_benchmarks_${Date.now()}.txt"`
                }
            });
        }

        // ========================================
        // PDF FORMAT (HTML for print-to-PDF)
        // ========================================
        if (format === 'pdf') {
            let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NEURONAS Benchmarks Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            padding: 40px; 
            max-width: 1200px; 
            margin: 0 auto; 
            background: #f5f5f5;
        }
        .page { background: white; padding: 40px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #10b981; border-bottom: 4px solid #10b981; padding-bottom: 15px; }
        h2 { color: #3b82f6; margin-top: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h3 { color: #6366f1; margin-top: 30px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
        .stat-label { color: #6b7280; font-size: 14px; margin-bottom: 5px; }
        .stat-value { font-size: 28px; font-weight: bold; color: #1f2937; }
        .benchmark { 
            background: #fafafa; 
            padding: 25px; 
            margin: 20px 0; 
            border-radius: 8px; 
            border: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
        .winner-badge { 
            display: inline-block; 
            padding: 5px 15px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: bold; 
        }
        .winner-b { background: #d1fae5; color: #065f46; }
        .winner-a { background: #fef3c7; color: #92400e; }
        .winner-tie { background: #e5e7eb; color: #4b5563; }
        .response-box { 
            background: white; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0; 
            border: 1px solid #d1d5db;
            font-size: 14px;
            max-height: 200px;
            overflow: hidden;
        }
        .meta { color: #6b7280; font-size: 13px; margin: 5px 0; }
        .footer { 
            margin-top: 60px; 
            padding-top: 20px; 
            border-top: 2px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
        }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        @media print {
            body { background: white; }
            .page { box-shadow: none; page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="page">
        <h1>📊 NEURONAS Benchmark Report</h1>
        
        <div class="meta">
            <strong>Date d'export:</strong> ${new Date().toLocaleString('fr-FR')}<br>
            <strong>Utilisateur:</strong> ${user.email}<br>
            <strong>Nombre total de benchmarks:</strong> ${benchmarks.length}
        </div>

        <h2>Statistiques Globales</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">Total Benchmarks</div>
                <div class="stat-value">${stats.total}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Mode B Win Rate</div>
                <div class="stat-value">${((stats.mode_b_wins/stats.total)*100).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">SPG Moyen</div>
                <div class="stat-value">${stats.avg_spg.toFixed(3)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Amélioration Moyenne</div>
                <div class="stat-value">${stats.avg_improvement.toFixed(1)}%</div>
            </div>
        </div>

        <table>
            <tr>
                <th>Métrique</th>
                <th>Mode A</th>
                <th>Mode B</th>
            </tr>
            <tr>
                <td>Temps Moyen</td>
                <td>${stats.avg_time_a.toFixed(0)}ms</td>
                <td>${stats.avg_time_b.toFixed(0)}ms</td>
            </tr>
            <tr>
                <td>Total Tokens</td>
                <td>${stats.total_tokens_a.toLocaleString()}</td>
                <td>${stats.total_tokens_b.toLocaleString()}</td>
            </tr>
        </table>
    </div>

    ${benchmarks.map((b, index) => {
        const winnerClass = b.winner === 'mode_b' ? 'winner-b' : b.winner === 'mode_a' ? 'winner-a' : 'winner-tie';
        const winnerText = b.winner === 'mode_b' ? '🏆 Mode B' : b.winner === 'mode_a' ? '⚠️ Mode A' : '🤝 Tie';
        
        return `
    <div class="page">
        <h2>${index + 1}. ${b.scenario_name || 'Sans titre'} <span class="${winnerClass} winner-badge">${winnerText}</span></h2>
        
        <div class="meta">
            <strong>ID:</strong> ${b.id}<br>
            <strong>Date:</strong> ${new Date(b.created_date).toLocaleString('fr-FR')}<br>
            <strong>Catégorie:</strong> ${b.scenario_category || 'N/A'}<br>
            <strong>SPG:</strong> ${(b.global_score_performance || 0).toFixed(4)} | 
            <strong>Amélioration:</strong> ${(b.performance_improvement || 0).toFixed(1)}%
        </div>

        <h3>Prompt de Test</h3>
        <div class="response-box">${b.test_prompt || 'N/A'}</div>

        <h3>Mode A (Baseline)</h3>
        <div class="meta">
            Temps: ${b.mode_a_time_ms || 0}ms | Tokens: ${(b.mode_a_token_count || 0).toLocaleString()}
        </div>
        <div class="response-box">${b.mode_a_response ? b.mode_a_response.substring(0, 400) + '...' : 'N/A'}</div>

        <h3>Mode B (Neuronas Enhanced)</h3>
        <div class="meta">
            Temps: ${b.mode_b_time_ms || 0}ms | Tokens: ${(b.mode_b_token_count || 0).toLocaleString()}<br>
            ${b.mode_b_personas_used && b.mode_b_personas_used.length > 0 ? `Personas: ${b.mode_b_personas_used.join(', ')}` : ''}
        </div>
        <div class="response-box">${b.mode_b_response ? b.mode_b_response.substring(0, 400) + '...' : 'N/A'}</div>

        ${b.grader_rationale ? `
        <h3>🧠 Grader Rationale</h3>
        <div class="response-box">${b.grader_rationale}</div>
        ` : ''}
    </div>
        `;
    }).join('')}

    <div class="footer">
        Généré par NEURONAS AI - ${new Date().toLocaleString('fr-FR')}
    </div>
</body>
</html>`;

            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="neuronas_benchmarks_${Date.now()}.html"`
                }
            });
        }

        return Response.json({ error: 'Invalid format. Use: json, md, txt, or pdf' }, { status: 400 });

    } catch (error) {
        console.error('[Export All] Fatal error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});