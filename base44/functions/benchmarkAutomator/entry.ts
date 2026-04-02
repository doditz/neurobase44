import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BENCHMARK AUTOMATOR - v4.7 Enhancement
 * Automates benchmark runs and pushes results to GitHub.
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[BenchmarkAutomator] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        addLog('=== BENCHMARK AUTOMATOR START ===');

        const {
            schedule_id,
            github_repo = 'neuronas/benchmarks',
            github_path = 'reports/' + new Date().toISOString().substring(0, 10) + '.json'
        } = await req.json();

        addLog('Configuration', { schedule_id, github_repo, github_path });

        // Step 1: Trigger benchmarkRunner
        addLog('Triggering benchmarkRunner...');
        const { data: benchmarkResult } = await base44.functions.invoke('benchmarkRunner', {});

        if (!benchmarkResult || !benchmarkResult.success) {
            throw new Error('benchmarkRunner failed');
        }
        addLog('✓ benchmarkRunner completed', { passed: benchmarkResult.test_results?.passed, failed: benchmarkResult.test_results?.failed });

        // Step 2: Export benchmark data
        addLog('Exporting benchmark data...');
        const { data: exportData } = await base44.functions.invoke('exportBenchmarkData', {
            results: benchmarkResult.detailed_results,
            format: 'json'
        });

        if (!exportData || !exportData.success || !exportData.exported_data) {
            throw new Error('exportBenchmarkData failed');
        }
        addLog('✓ Benchmark data exported', { size: exportData.exported_data.length });

        // Step 3: Push results to GitHub
        addLog('Pushing results to GitHub...');
        const githubToken = Deno.env.get("GH_TOKEN");

        if (!githubToken) {
            throw new Error('GH_TOKEN not set in environment variables');
        }

        const repoOwner = github_repo.split('/')[0];
        const repoName = github_repo.split('/')[1];

        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${github_path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Automated benchmark report for ${new Date().toISOString().substring(0, 10)}`,
                content: btoa(exportData.exported_data)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const githubResponse = await response.json();
        addLog('✓ Results pushed to GitHub', { commit_sha: githubResponse.commit.sha, url: githubResponse.content.html_url });

        addLog('=== BENCHMARK AUTOMATOR COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Benchmark run automated and results pushed to GitHub',
            github_url: githubResponse.content.html_url,
            logs: log
        });

    } catch (error) {
        addLog('ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});