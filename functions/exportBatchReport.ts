import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EXPORT BATCH REPORT v1.0
 * Exports a comprehensive batch test report in multiple formats
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { batch_id, format = 'json' } = await req.json();

        if (!batch_id) {
            return Response.json({ error: 'batch_id required' }, { status: 400 });
        }

        // Fetch batch progress record
        const batchProgress = await base44.asServiceRole.entities.BatchRunProgress.get(batch_id);

        if (!batchProgress) {
            return Response.json({ error: 'Batch not found' }, { status: 404 });
        }

        // Fetch all results from this batch
        const results = await base44.asServiceRole.entities.DevTestResult.filter({
            notes: { $regex: batch_id }
        });

        const summaryData = batchProgress.summary_data || {};

        // Build comprehensive report
        const report = {
            batch_id,
            generated_at: new Date().toISOString(),
            batch_info: {
                total_tests: batchProgress.total_tests,
                completed: batchProgress.completed_tests,
                failed: batchProgress.failed_tests,
                status: batchProgress.status,
                started_at: batchProgress.created_date,
                completed_at: batchProgress.updated_date
            },
            global_metrics: {
                avg_spg: summaryData.avg_spg,
                median_spg: summaryData.median_spg,
                mode_b_wins: summaryData.mode_b_wins,
                mode_a_wins: summaryData.mode_a_wins,
                ties: summaryData.ties,
                avg_improvement: summaryData.avg_improvement,
                avg_token_savings: summaryData.avg_token_savings
            },
            best_performances: summaryData.top_performers || [],
            worst_performances: summaryData.worst_performers || [],
            all_results: results.map(r => ({
                scenario_name: r.scenario_name,
                spg: r.global_score_performance,
                winner: r.winner,
                mode_b_time: r.mode_b_time_ms,
                improvement: r.performance_improvement,
                created: r.created_date
            }))
        };

        // Generate output based on format
        let output;
        let contentType;
        let filename;

        if (format === 'json') {
            output = JSON.stringify(report, null, 2);
            contentType = 'application/json';
            filename = `batch_${batch_id}.json`;
        } else if (format === 'md') {
            output = `# Rapport Batch ${batch_id}

## Informations Générales
- **Total Tests**: ${report.batch_info.total_tests}
- **Complétés**: ${report.batch_info.completed}
- **Échoués**: ${report.batch_info.failed}
- **Status**: ${report.batch_info.status}

## Métriques Globales
- **SPG Moyen**: ${(report.global_metrics.avg_spg || 0).toFixed(3)}
- **SPG Médian**: ${(report.global_metrics.median_spg || 0).toFixed(3)}
- **Victoires Mode B**: ${report.global_metrics.mode_b_wins}
- **Amélioration Moyenne**: ${(report.global_metrics.avg_improvement || 0).toFixed(1)}%
- **Économie Tokens Moyenne**: ${(report.global_metrics.avg_token_savings || 0).toFixed(1)}%

## Top 5 Performances
${report.best_performances.slice(0, 5).map((p, i) => 
    `${i + 1}. **${p.scenario_name}** - SPG: ${p.spg.toFixed(3)}`
).join('\n')}

## Pires Performances
${report.worst_performances.slice(0, 5).map((p, i) => 
    `${i + 1}. **${p.scenario_name}** - SPG: ${p.spg.toFixed(3)}`
).join('\n')}

## Tous les Résultats
${report.all_results.map((r, i) => 
    `${i + 1}. ${r.scenario_name} - SPG: ${(r.spg || 0).toFixed(3)} - Gagnant: ${r.winner}`
).join('\n')}
`;
            contentType = 'text/markdown';
            filename = `batch_${batch_id}.md`;
        } else {
            output = `RAPPORT BATCH ${batch_id}
${'='.repeat(50)}

RÉSUMÉ
${'-'.repeat(50)}
Total Tests: ${report.batch_info.total_tests}
Complétés: ${report.batch_info.completed}
SPG Moyen: ${(report.global_metrics.avg_spg || 0).toFixed(3)}
Mode B Wins: ${report.global_metrics.mode_b_wins}

TOP 5 PERFORMANCES
${'-'.repeat(50)}
${report.best_performances.slice(0, 5).map((p, i) => 
    `${i + 1}. ${p.scenario_name} - ${p.spg.toFixed(3)}`
).join('\n')}

TOUS LES RÉSULTATS
${'-'.repeat(50)}
${report.all_results.map((r, i) => 
    `${i + 1}. ${r.scenario_name} - SPG: ${(r.spg || 0).toFixed(3)}`
).join('\n')}
`;
            contentType = 'text/plain';
            filename = `batch_${batch_id}.txt`;
        }

        return new Response(output, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('[exportBatchReport] Error:', error);
        return Response.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});