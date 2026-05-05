/**
 * fetchGitHubCommits - Safely pulls and summarizes repository commit history
 * while filtering out any proprietary code content.
 * 
 * Uses the GH_TOKEN secret for authenticated GitHub API access.
 * Returns only commit metadata (messages, authors, dates) - never file diffs or code.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { repository_name, page = 1, per_page = 30, branch = 'main' } = await req.json();

        if (!repository_name) {
            return Response.json({ error: 'repository_name is required' }, { status: 400 });
        }

        const ghToken = Deno.env.get('GH_TOKEN');
        if (!ghToken) {
            return Response.json({ error: 'GH_TOKEN secret not configured' }, { status: 500 });
        }

        // Fetch commits - metadata only, no code diffs
        const commitsUrl = `https://api.github.com/repos/${repository_name}/commits?sha=${branch}&page=${page}&per_page=${per_page}`;

        const commitsResponse = await fetch(commitsUrl, {
            headers: {
                'Authorization': `Bearer ${ghToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Neuronas-Cognitronic-OS'
            }
        });

        if (!commitsResponse.ok) {
            const errorText = await commitsResponse.text();
            return Response.json({
                error: `GitHub API error: ${commitsResponse.status}`,
                details: errorText
            }, { status: commitsResponse.status });
        }

        const rawCommits = await commitsResponse.json();

        // SECURITY: Strip all code/diff content, return only safe metadata
        const safeCommits = rawCommits.map(commit => ({
            sha: commit.sha?.substring(0, 7),
            full_sha: commit.sha,
            message: commit.commit?.message || '',
            author_name: commit.commit?.author?.name || 'Unknown',
            author_email: commit.commit?.author?.email || '',
            author_avatar: commit.author?.avatar_url || '',
            date: commit.commit?.author?.date || '',
            committer_name: commit.commit?.committer?.name || '',
            stats: {
                // Only include aggregate stats, never file-level details
                additions: commit.stats?.additions,
                deletions: commit.stats?.deletions,
                total: commit.stats?.total
            },
            parents_count: commit.parents?.length || 0,
            html_url: commit.html_url || ''
        }));

        // Generate summary statistics
        const authors = {};
        const dailyActivity = {};

        for (const commit of safeCommits) {
            // Author stats
            const authorKey = commit.author_name;
            if (!authors[authorKey]) {
                authors[authorKey] = { name: authorKey, count: 0, avatar: commit.author_avatar };
            }
            authors[authorKey].count++;

            // Daily activity
            if (commit.date) {
                const day = commit.date.substring(0, 10);
                dailyActivity[day] = (dailyActivity[day] || 0) + 1;
            }
        }

        return Response.json({
            success: true,
            repository: repository_name,
            branch,
            commits: safeCommits,
            total_fetched: safeCommits.length,
            summary: {
                total_commits: safeCommits.length,
                authors: Object.values(authors).sort((a, b) => b.count - a.count),
                daily_activity: dailyActivity,
                date_range: safeCommits.length > 0 ? {
                    earliest: safeCommits[safeCommits.length - 1]?.date,
                    latest: safeCommits[0]?.date
                } : null
            },
            page,
            per_page
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});